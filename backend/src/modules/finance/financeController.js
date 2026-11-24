import mongoose from "mongoose";
import Room from "../room/roomModel.js";
import Contribution from "./contributionModel.js";
import Transaction from "./transactionModel.js";

const same = (a, b) => String(a) === String(b);

// Phải ở trong một phòng; treasurerOnly = true thì phải là thủ quỹ. Trả về false nếu đã gửi lỗi
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

// Thủ quỹ thấy mọi người, thành viên thường chỉ thấy dòng của mình
function toDto(c, viewer) {
  const isTreasurer = viewer.roleInRoom === "TREASURER";
  const payments = c.payments
    .filter((p) => p.user && (isTreasurer || same(p.user._id, viewer._id)))
    .map((p) => ({
      userId: p.user._id,
      fullName: p.user.fullName,
      avatar: p.user.avatar || "",
      status: p.status,
      paidAt: p.paidAt,
    }));
  return {
    _id: c._id,
    title: c.title,
    amount: c.amount,
    dueDate: c.dueDate,
    createdAt: c.createdAt,
    paidCount: c.payments.filter((p) => p.status === "PAID").length,
    totalCount: c.payments.length,
    payments,
  };
}

const populatePayments = (query) =>
  query.populate("payments.user", "fullName username avatar");

// GET /api/finance/fund -> { fundBalance, transactions }
export async function getFund(req, res) {
  if (!requireRoom(req, res)) return;
  const roomId = req.user.roomJoined;

  const room = await Room.findById(roomId).select("fundBalance");
  if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

  const transactions = await Transaction.find({ room: roomId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("member", "fullName avatar")
    .populate("createdBy", "fullName");

  return res.json({
    fundBalance: room.fundBalance,
    transactions: transactions.map((t) => ({
      _id: t._id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      member: t.member
        ? { _id: t.member._id, fullName: t.member.fullName }
        : null,
      createdBy: t.createdBy?.fullName || "",
      createdAt: t.createdAt,
    })),
  });
}

// GET /api/finance/contributions -> { contributions }
export async function listContributions(req, res) {
  if (!requireRoom(req, res)) return;
  const list = await populatePayments(
    Contribution.find({ room: req.user.roomJoined }).sort({ dueDate: -1 }),
  );
  return res.json({ contributions: list.map((c) => toDto(c, req.user)) });
}

// POST /api/finance/contributions { title, amount, dueDate } -> { contribution }
export async function createContribution(req, res) {
  if (!requireRoom(req, res, true)) return;
  const user = req.user;

  const title = String(req.body?.title ?? "").trim();
  const amount = Number(req.body?.amount);
  const dueDate = new Date(req.body?.dueDate);

  if (!title || title.length > 100) {
    return res
      .status(400)
      .json({ message: "Tên khoản đóng từ 1 đến 100 ký tự" });
  }
  if (!Number.isInteger(amount) || amount < 1000 || amount > 1_000_000_000) {
    return res
      .status(400)
      .json({ message: "Số tiền phải là số nguyên từ 1.000đ trở lên" });
  }
  if (Number.isNaN(dueDate.getTime())) {
    return res.status(400).json({ message: "Hạn đóng không hợp lệ" });
  }

  const room = await Room.findById(user.roomJoined).select("listMember");
  if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

  const created = await Contribution.create({
    room: room._id,
    title,
    amount,
    dueDate,
    createdBy: user._id,
    payments: room.listMember.map((id) => ({ user: id })),
  });

  const full = await populatePayments(Contribution.findById(created._id));
  return res.status(201).json({ contribution: toDto(full, user) });
}

// POST /api/finance/contributions/:id/payments/:userId/confirm -> { contribution }
export async function confirmPayment(req, res) {
  if (!requireRoom(req, res, true)) return;
  const user = req.user;
  const { id, userId } = req.params;

  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: "Mã không hợp lệ" });
  }

  // Chỉ đổi UNPAID -> PAID một lần, bấm hai lần không cộng quỹ hai lần
  const before = await Contribution.findOneAndUpdate(
    {
      _id: id,
      room: user.roomJoined,
      payments: { $elemMatch: { user: userId, status: "UNPAID" } },
    },
    { $set: { "payments.$.status": "PAID", "payments.$.paidAt": new Date() } },
  );
  if (!before) {
    return res.status(409).json({
      message: "Khoản đóng không tồn tại hoặc người này đã được xác nhận",
    });
  }

  try {
    const tx = await Transaction.create({
      room: user.roomJoined,
      type: "IN",
      amount: before.amount,
      description: before.title,
      contribution: before._id,
      member: userId,
      createdBy: user._id,
    });
    await Room.updateOne(
      { _id: user.roomJoined },
      {
        $inc: { fundBalance: before.amount },
        $push: { transactionHistory: tx._id },
      },
    );
  } catch (err) {
    // Ghi quỹ lỗi thì hoàn lại trạng thái
    await Contribution.updateOne(
      { _id: id, "payments.user": userId },
      { $set: { "payments.$.status": "UNPAID", "payments.$.paidAt": null } },
    );
    throw err;
  }

  const full = await populatePayments(Contribution.findById(id));
  return res.json({ contribution: toDto(full, user) });
}

// DELETE /api/finance/contributions/:id
export async function deleteContribution(req, res) {
  if (!requireRoom(req, res, true)) return;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Mã không hợp lệ" });
  }

  const c = await Contribution.findOne({ _id: id, room: req.user.roomJoined });
  if (!c) return res.status(404).json({ message: "Không tìm thấy khoản đóng" });
  if (c.payments.some((p) => p.status === "PAID")) {
    return res
      .status(409)
      .json({ message: "Đã có người đóng tiền, không thể xóa khoản này" });
  }

  await c.deleteOne();
  return res.json({ message: "Đã xóa khoản đóng" });
}
