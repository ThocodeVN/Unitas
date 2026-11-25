import mongoose from "mongoose";
import Room from "../room/roomModel.js";
import Adjustment from "./adjustmentModel.js";
import Transaction from "./transactionModel.js";
import {
  balanceOf,
  equals,
  incUpdate,
  parseSource,
  SOURCE_LABEL,
} from "./fundBalance.js";
import { notify, notifyRoom, vnd } from "../notification/notify.js";

// "tiền mặt 0đ → 500.000đ"
const change = (a) =>
  `${SOURCE_LABEL[a.source].toLowerCase()} ${vnd(a.oldBalance)} → ${vnd(a.newBalance)}`;

const same = (a, b) => String(a) === String(b);
const MAX_BALANCE = 10_000_000_000;

function requireRoom(req, res, treasurerOnly = false) {
  const user = req.user;
  if (!user.roomJoined) {
    res.status(404).json({ message: "Bạn chưa ở trong phòng nào" });
    return false;
  }
  if (treasurerOnly && user.roleInRoom !== "TREASURER") {
    res
      .status(403)
      .json({ message: "Chỉ thủ quỹ mới được thực hiện thao tác này" });
    return false;
  }
  return true;
}

const person = (u) => (u ? { _id: u._id, fullName: u.fullName } : null);

// Đếm duyệt theo thành viên HIỆN TẠI của phòng (ai rời phòng thì không cần duyệt nữa)
function toDto(a, members, viewer) {
  const approved = members.filter((m) =>
    a.approvals.some((u) => same(u?._id ?? u, m)),
  );
  return {
    _id: a._id,
    source: a.source,
    oldBalance: a.oldBalance,
    newBalance: a.newBalance,
    reason: a.reason,
    status: a.status,
    requestedBy: person(a.requestedBy),
    rejectedBy: person(a.rejectedBy),
    approvals: a.approvals.filter(Boolean).map(person),
    approvedCount: approved.length,
    memberCount: members.length,
    myApproved: a.approvals.some((u) => same(u?._id ?? u, viewer._id)),
    createdAt: a.createdAt,
    resolvedAt: a.resolvedAt,
  };
}

const populated = (query) =>
  query
    .populate("requestedBy", "fullName")
    .populate("rejectedBy", "fullName")
    .populate("approvals", "fullName");

async function sendOne(res, id, viewer, status = 200) {
  const [a, room] = await Promise.all([
    populated(Adjustment.findById(id)),
    Room.findById(viewer.roomJoined).select("listMember fundBalance cashBalance"),
  ]);
  return res.status(status).json({
    adjustment: toDto(a, room?.listMember ?? [], viewer),
    cashBalance: room?.cashBalance ?? 0,
    accountBalance: room ? balanceOf(room, "ACCOUNT") : 0,
  });
}

// Nếu mọi thành viên hiện tại đã duyệt thì áp dụng vào quỹ.
// Áp dụng chỉ khi số dư vẫn đúng như lúc gửi yêu cầu, nếu không thì chuyển OUTDATED.
export async function tryApply(adjustmentId) {
  const adj = await Adjustment.findById(adjustmentId);
  if (!adj || adj.status !== "PENDING") return;

  const room = await Room.findById(adj.room).select("listMember");
  if (!room) return;
  const allApproved = room.listMember.every((m) =>
    adj.approvals.some((u) => same(u, m)),
  );
  if (!allApproved) return;

  // Giành quyền áp dụng: hai người duyệt cùng lúc thì chỉ một người áp dụng
  const claimed = await Adjustment.findOneAndUpdate(
    { _id: adj._id, status: "PENDING" },
    { $set: { status: "APPROVED", resolvedAt: new Date() } },
  );
  if (!claimed) return;

  const delta = adj.newBalance - adj.oldBalance;
  const updated = await Room.findOneAndUpdate(
    { _id: adj.room, ...equals(adj.source, adj.oldBalance) },
    { $inc: incUpdate(adj.source, delta) },
    { returnDocument: "after" },
  );
  if (!updated) {
    await Adjustment.updateOne(
      { _id: adj._id },
      { $set: { status: "OUTDATED" } },
    );
    await notify({
      users: [adj.requestedBy],
      room: adj.room,
      type: "FUND",
      message: `Yêu cầu điều chỉnh ${change(adj)} không được áp dụng vì số dư đã thay đổi trong lúc chờ duyệt`,
      link: "/quy-chung",
    });
    return;
  }

  try {
    const tx = await Transaction.create({
      room: adj.room,
      type: delta > 0 ? "IN" : "OUT",
      amount: Math.abs(delta),
      source: adj.source,
      kind: "ADJUSTMENT",
      description: `Điều chỉnh ${SOURCE_LABEL[adj.source].toLowerCase()}: ${adj.reason}`.slice(0, 200),
      createdBy: adj.requestedBy,
    });
    await Room.updateOne(
      { _id: adj.room },
      { $push: { transactionHistory: tx._id } },
    );
    await Adjustment.updateOne(
      { _id: adj._id },
      { $set: { transaction: tx._id } },
    );
    await notifyRoom(adj.room, {
      type: "FUND",
      message: `Cả phòng đã duyệt: ${change(adj)}`,
      link: "/quy-chung",
    });
  } catch (err) {
    // Ghi giao dịch lỗi thì trả số dư và yêu cầu về như cũ
    await Room.updateOne(
      { _id: adj.room },
      { $inc: incUpdate(adj.source, -delta) },
    );
    await Adjustment.updateOne(
      { _id: adj._id },
      { $set: { status: "PENDING", resolvedAt: null } },
    );
    throw err;
  }
}

// Gọi sau khi có người rời phòng: người còn thiếu duyệt có thể vừa rời đi
export async function settlePendingAdjustments(roomId) {
  const pending = await Adjustment.find({ room: roomId, status: "PENDING" })
    .select("_id");
  for (const a of pending) await tryApply(a._id);
}

// GET /api/finance/adjustments -> { adjustments } (20 yêu cầu gần nhất)
export async function listAdjustments(req, res) {
  if (!requireRoom(req, res)) return;
  const roomId = req.user.roomJoined;
  const [list, room] = await Promise.all([
    populated(
      Adjustment.find({ room: roomId }).sort({ createdAt: -1 }).limit(20),
    ),
    Room.findById(roomId).select("listMember"),
  ]);
  const members = room?.listMember ?? [];
  return res.json({
    adjustments: list.map((a) => toDto(a, members, req.user)),
  });
}

// POST /api/finance/adjustments { source, newBalance, reason } -> { adjustment }
export async function createAdjustment(req, res) {
  if (!requireRoom(req, res, true)) return;
  const user = req.user;

  const source = parseSource(req.body?.source);
  const newBalance = Number(req.body?.newBalance);
  const reason = String(req.body?.reason ?? "").trim();

  if (!source) {
    return res.status(400).json({ message: "Nguồn tiền không hợp lệ" });
  }
  if (
    req.body?.newBalance === "" ||
    !Number.isInteger(newBalance) ||
    newBalance < 0 ||
    newBalance > MAX_BALANCE
  ) {
    return res
      .status(400)
      .json({ message: "Số dư mới phải là số nguyên không âm" });
  }
  if (!reason || reason.length > 240) {
    return res
      .status(400)
      .json({ message: "Lý do điều chỉnh từ 1 đến 240 ký tự" });
  }

  const room = await Room.findById(user.roomJoined).select(
    "fundBalance cashBalance",
  );
  if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

  const oldBalance = balanceOf(room, source);
  if (newBalance === oldBalance) {
    return res
      .status(400)
      .json({ message: "Số dư mới phải khác số dư hiện tại" });
  }

  let created;
  try {
    created = await Adjustment.create({
      room: room._id,
      source,
      oldBalance,
      newBalance,
      reason,
      requestedBy: user._id,
      approvals: [user._id], // người gửi coi như đã duyệt
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: `Đang có yêu cầu điều chỉnh ${SOURCE_LABEL[source].toLowerCase()} chờ duyệt`,
      });
    }
    throw err;
  }

  await notifyRoom(room._id, {
    type: "FUND",
    message: `${user.fullName} đề nghị điều chỉnh ${change(created)}. Vào Quỹ chung để duyệt`,
    self: `Bạn đã gửi yêu cầu điều chỉnh ${change(created)}`,
    link: "/quy-chung",
    actor: user._id,
  });
  await tryApply(created._id); // phòng chỉ có một người thì áp dụng luôn
  return sendOne(res, created._id, user, 201);
}

async function findPending(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: "Mã không hợp lệ" });
    return null;
  }
  const adj = await Adjustment.findOne({ _id: id, room: req.user.roomJoined });
  if (!adj) {
    res.status(404).json({ message: "Không tìm thấy yêu cầu điều chỉnh" });
    return null;
  }
  if (adj.status !== "PENDING") {
    res.status(409).json({ message: "Yêu cầu này đã được xử lý" });
    return null;
  }
  return adj;
}

// POST /api/finance/adjustments/:id/approve -> { adjustment }
export async function approveAdjustment(req, res) {
  if (!requireRoom(req, res)) return;
  const adj = await findPending(req, res);
  if (!adj) return;

  await Adjustment.updateOne(
    { _id: adj._id, status: "PENDING" },
    { $addToSet: { approvals: req.user._id } },
  );
  await tryApply(adj._id);
  // Chưa đủ người thì báo người gửi biết có thêm một người duyệt
  const after = await Adjustment.findById(adj._id).select("status");
  await notify({
    users: after?.status === "PENDING" ? [adj.requestedBy] : [],
    room: adj.room,
    type: "FUND",
    message: `${req.user.fullName} đã duyệt điều chỉnh ${change(adj)}`,
    link: "/quy-chung",
    actor: req.user._id,
    self: `Bạn đã duyệt điều chỉnh ${change(adj)}`,
  });
  return sendOne(res, adj._id, req.user);
}

// POST /api/finance/adjustments/:id/reject -> { adjustment }
export async function rejectAdjustment(req, res) {
  if (!requireRoom(req, res)) return;
  const adj = await findPending(req, res);
  if (!adj) return;

  const done = await Adjustment.findOneAndUpdate(
    { _id: adj._id, status: "PENDING" },
    {
      $set: {
        status: "REJECTED",
        rejectedBy: req.user._id,
        resolvedAt: new Date(),
      },
    },
  );
  if (!done) return res.status(409).json({ message: "Yêu cầu này đã được xử lý" });
  await notifyRoom(adj.room, {
    type: "FUND",
    message: `${req.user.fullName} đã từ chối điều chỉnh ${change(adj)}`,
    self: `Bạn đã từ chối điều chỉnh ${change(adj)}`,
    link: "/quy-chung",
    actor: req.user._id,
  });
  return sendOne(res, adj._id, req.user);
}

// DELETE /api/finance/adjustments/:id -> thủ quỹ hủy yêu cầu đang chờ
export async function cancelAdjustment(req, res) {
  if (!requireRoom(req, res, true)) return;
  const adj = await findPending(req, res);
  if (!adj) return;

  const done = await Adjustment.findOneAndUpdate(
    { _id: adj._id, status: "PENDING" },
    { $set: { status: "CANCELLED", resolvedAt: new Date() } },
  );
  if (!done) return res.status(409).json({ message: "Yêu cầu này đã được xử lý" });
  await notifyRoom(adj.room, {
    type: "FUND",
    message: `Thủ quỹ đã hủy yêu cầu điều chỉnh ${change(adj)}`,
    self: `Bạn đã hủy yêu cầu điều chỉnh ${change(adj)}`,
    link: "/quy-chung",
    actor: req.user._id,
  });
  return sendOne(res, adj._id, req.user);
}
