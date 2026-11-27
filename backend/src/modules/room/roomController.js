import crypto from "crypto";
import mongoose from "mongoose";
import Room from "./roomModel.js";
import User from "../../models/User.js";
import Contribution from "../finance/contributionModel.js";
import { monthSpent } from "../finance/expenseController.js";
import { todayDuties, todayVN } from "../duty/dutyController.js";
import Duty from "../duty/dutyModel.js";
import { settlePendingAdjustments } from "../finance/adjustmentController.js";
import Adjustment from "../finance/adjustmentModel.js";
import { notify, notifyRoom, notifyTreasurer } from "../notification/notify.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ I, O, 0, 1 cho dễ đọc
const same = (a, b) => String(a) === String(b);

async function makeInviteCode() {
  for (let i = 0; i < 10; i++) {
    let code = "";
    for (let j = 0; j < 6; j++)
      code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    if (!(await Room.exists({ inviteCode: code }))) return code;
  }
  throw new Error("Không tạo được mã mời");
}

const publicUser = (u) => ({
  _id: u._id,
  fullName: u.fullName,
  username: u.username,
  avatar: u.avatar || "",
  roleInRoom: u.roleInRoom,
});

// Dữ liệu phòng trả về cho giao diện. Chỉ thủ quỹ mới thấy pendingMembers
async function loadRoom(roomId, viewerId) {
  const room = await Room.findById(roomId)
    .populate("listMember", "fullName username avatar roleInRoom")
    .populate("pendingMembers.user", "fullName username avatar");
  if (!room) return null;

  const members = room.listMember.filter(Boolean).map(publicUser);
  const viewer = members.find((m) => same(m._id, viewerId));

  const dto = {
    _id: room._id,
    roomName: room.roomName,
    inviteCode: room.inviteCode,
    createDate: room.createDate,
    fundBalance: room.fundBalance,
    listMember: members,
  };

  if (viewer?.roleInRoom === "TREASURER") {
    dto.pendingMembers = room.pendingMembers
      .filter((p) => p.user)
      .map((p) => ({
        _id: p.user._id,
        fullName: p.user.fullName,
        username: p.user.username,
        avatar: p.user.avatar || "",
        requestedAt: p.requestedAt,
      }));
  }
  return dto;
}

// Chưa ở phòng nào (hoặc phòng cũ đã bị xóa) thì được tạo hoặc tham gia phòng mới
async function isFree(user) {
  if (!user.roomJoined) return true;
  if (await Room.exists({ _id: user.roomJoined })) return false;
  user.roomJoined = null;
  user.roleInRoom = "NONE";
  await user.save();
  return true;
}

const clearPending = (userId) =>
  Room.updateMany(
    { "pendingMembers.user": userId },
    { $pull: { pendingMembers: { user: userId } } },
  );

// Kiểm tra roomId hợp lệ và người gọi là thủ quỹ của phòng. Trả về false nếu đã gửi lỗi
function requireTreasurer(req, res) {
  const { roomId } = req.params;
  if (!mongoose.isValidObjectId(roomId)) {
    res.status(400).json({ message: "Mã phòng không hợp lệ" });
    return false;
  }
  const user = req.user;
  if (!user.roomJoined || !same(user.roomJoined, roomId)) {
    res.status(403).json({ message: "Bạn không thuộc phòng này" });
    return false;
  }
  if (user.roleInRoom !== "TREASURER") {
    res
      .status(403)
      .json({ message: "Chỉ thủ quỹ mới được thực hiện thao tác này" });
    return false;
  }
  return true;
}

// GET /api/rooms/me -> { room, pending }
export async function getMyRoom(req, res) {
  const user = req.user;

  if (user.roomJoined) {
    const room = await loadRoom(user.roomJoined, user._id);
    if (room && room.listMember.some((m) => same(m._id, user._id))) {
      return res.json({ room, pending: null });
    }
    // Phòng đã bị xóa hoặc dữ liệu lệch: dọn lại
    user.roomJoined = null;
    user.roleInRoom = "NONE";
    await user.save();
  }

  const waiting = await Room.findOne({ "pendingMembers.user": user._id });
  const request = waiting?.pendingMembers.find((p) => same(p.user, user._id));
  return res.json({
    room: null,
    pending: waiting
      ? { roomName: waiting.roomName, requestedAt: request.requestedAt }
      : null,
  });
}

// GET /api/rooms/dashboard -> real dashboard totals available from the room model
// Mọi người trong phòng đều xem được; thành viên thường chỉ thấy khoản sắp hạn của mình
export async function getDashboardSummary(req, res) {
  const user = req.user;
  const isTreasurer = user.roleInRoom === "TREASURER";
  if (!user.roomJoined) {
    return res.status(404).json({ message: "Bạn chưa ở trong phòng nào" });
  }

  const room = await loadRoom(user.roomJoined, user._id);
  if (!room) {
    return res.status(404).json({ message: "Không tìm thấy phòng" });
  }

  // Khoản đóng có hạn trong tháng này -> thanh tiến độ "đã thu"
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const contributions = await Contribution.find({ room: room._id }).populate(
    "payments.user",
    "fullName",
  );

  let amount = 0;
  let target = 0;
  let paid = 0;
  let total = 0;
  for (const c of contributions) {
    if (c.dueDate < monthStart || c.dueDate >= monthEnd) continue;
    for (const p of c.payments) {
      total += 1;
      target += c.amount;
      if (p.status === "PAID") {
        paid += 1;
        amount += c.amount;
      }
    }
  }

  // Chưa đóng và hạn trong 7 ngày tới (hoặc đã quá hạn)
  const soon = new Date(Date.now() + 7 * 86_400_000);
  const dueSoon = [];
  for (const c of contributions) {
    if (c.dueDate > soon) continue;
    for (const p of c.payments) {
      if (p.status !== "UNPAID" || !p.user) continue;
      if (!isTreasurer && !same(p.user._id, user._id)) continue;
      dueSoon.push({
        id: `${c._id}-${p.user._id}`,
        name: p.user.fullName,
        item: c.title,
        amount: c.amount,
        dueDate: c.dueDate,
      });
    }
  }
  dueSoon.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return res.json({
    roomName: room.roomName,
    fundBalance: room.fundBalance,
    memberCount: room.listMember.length,
    pendingMemberCount: room.pendingMembers?.length ?? 0,
    collected: total ? { amount, target, paid, members: total } : null,
    spent: await monthSpent(room._id),
    dueSoon,
    duties: await todayDuties(room._id),
  });
}

// POST /api/rooms { roomName } -> { room }
export async function createRoom(req, res) {
  const user = req.user;
  if (!(await isFree(user))) {
    return res.status(409).json({
      message:
        "Bạn đang ở trong một phòng. Hãy rời phòng trước khi tạo phòng mới",
    });
  }

  const roomName = String(req.body?.roomName ?? "").trim();
  if (!roomName || roomName.length > 100) {
    return res
      .status(400)
      .json({ message: "Tên phòng phải từ 1 đến 100 ký tự" });
  }

  await clearPending(user._id);

  const room = await Room.create({
    roomName,
    inviteCode: await makeInviteCode(),
    listMember: [user._id],
  });

  user.roomJoined = room._id;
  user.roleInRoom = "TREASURER";
  await user.save();
  await notify({
    room: room._id,
    type: "ROOM",
    message: "",
    link: "/cai-dat",
    actor: user._id,
    self: `Bạn đã tạo phòng ${roomName}. Gửi mã mời ${room.inviteCode} cho bạn cùng phòng nhé`,
  });

  return res.status(201).json({
    message: "Đã tạo phòng",
    room: await loadRoom(room._id, user._id),
  });
}

// POST /api/rooms/join { inviteCode } -> { pending }
export async function joinRoom(req, res) {
  const user = req.user;
  if (!(await isFree(user))) {
    return res.status(409).json({ message: "Bạn đang ở trong một phòng rồi" });
  }

  const code = String(req.body?.inviteCode ?? "")
    .trim()
    .toUpperCase();
  if (!code) {
    return res.status(400).json({ message: "Vui lòng nhập mã mời" });
  }

  const room = await Room.findOne({ inviteCode: code });
  if (!room) {
    return res.status(404).json({ message: "Mã mời không đúng" });
  }

  // Mỗi người chỉ chờ duyệt ở một phòng: gửi yêu cầu mới thì bỏ yêu cầu cũ
  await clearPending(user._id);
  const requestedAt = new Date();
  await Room.updateOne(
    { _id: room._id },
    { $push: { pendingMembers: { user: user._id, requestedAt } } },
  );
  await notifyTreasurer(room._id, {
    type: "ROOM",
    message: `${user.fullName} xin tham gia phòng`,
    self: `Bạn đã gửi yêu cầu tham gia phòng ${room.roomName}`,
    link: "/thanh-vien",
    actor: user._id,
  });

  return res.json({
    message: "Đã gửi yêu cầu, vui lòng chờ thủ quỹ duyệt",
    pending: { roomName: room.roomName, requestedAt },
  });
}

// DELETE /api/rooms/join -> hủy yêu cầu tham gia
export async function cancelJoin(req, res) {
  await clearPending(req.user._id);
  return res.json({ message: "Đã hủy yêu cầu" });
}

// POST /api/rooms/leave
export async function leaveRoom(req, res) {
  const user = req.user;
  if (!user.roomJoined) {
    return res.status(400).json({ message: "Bạn chưa ở trong phòng nào" });
  }

  const room = await Room.findById(user.roomJoined);
  if (room) {
    const others = room.listMember.filter((id) => !same(id, user._id));

    if (user.roleInRoom === "TREASURER" && others.length > 0) {
      return res.status(400).json({
        message:
          "Bạn đang là thủ quỹ. Hãy chuyển quyền thủ quỹ cho người khác trước khi rời phòng",
      });
    }

    if (others.length === 0) {
      await room.deleteOne(); // người cuối cùng rời đi thì xóa phòng
      await Duty.deleteMany({ room: room._id });
      await Adjustment.deleteMany({ room: room._id });
    } else {
      room.listMember = others;
      await room.save();
      // Bỏ các việc chưa làm từ hôm nay trở đi của người rời phòng
      await Duty.deleteMany({
        room: room._id,
        assignee: user._id,
        status: "TODO",
        date: { $gte: todayVN() },
      });
      // Người rời đi có thể là người duy nhất chưa duyệt điều chỉnh số dư
      await settlePendingAdjustments(room._id);
      await notifyRoom(room._id, {
        type: "ROOM",
        message: `${user.fullName} đã rời phòng`,
        self: `Bạn đã rời phòng ${room.roomName}`,
        link: "/thanh-vien",
        actor: user._id,
      });
    }
  }

  user.roomJoined = null;
  user.roleInRoom = "NONE";
  await user.save();
  return res.json({ message: "Đã rời phòng" });
}

// POST /api/rooms/:roomId/requests/:userId/approve -> { room }
export async function approveMember(req, res) {
  if (!requireTreasurer(req, res)) return;
  const { roomId, userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: "Mã người dùng không hợp lệ" });
  }

  const room = await Room.findById(roomId);
  if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });
  if (!room.pendingMembers.some((p) => same(p.user, userId))) {
    return res.status(404).json({ message: "Không tìm thấy yêu cầu này" });
  }

  const dropRequest = () =>
    Room.updateOne(
      { _id: roomId },
      { $pull: { pendingMembers: { user: userId } } },
    );

  const target = await User.findById(userId);
  if (!target) {
    await dropRequest();
    return res.status(404).json({ message: "Tài khoản này không còn tồn tại" });
  }
  if (!(await isFree(target))) {
    await dropRequest();
    return res
      .status(409)
      .json({ message: "Người này đã ở trong một phòng khác" });
  }

  await Room.updateOne(
    { _id: roomId },
    {
      $pull: { pendingMembers: { user: userId } },
      $addToSet: { listMember: userId },
    },
  );
  await User.updateOne(
    { _id: userId },
    { roomJoined: roomId, roleInRoom: "MEMBER" },
  );
  await notify({
    users: [userId],
    room: roomId,
    type: "ROOM",
    message: `Bạn đã được duyệt vào phòng ${room.roomName}`,
    link: "/",
    actor: req.user._id,
  });
  await notifyRoom(roomId, {
    type: "ROOM",
    message: `${target.fullName} đã vào phòng`,
    self: `Bạn đã duyệt ${target.fullName} vào phòng`,
    link: "/thanh-vien",
    actor: req.user._id,
    skip: [userId], // người mới vào đã có tin riêng
  });

  return res.json({
    message: "Đã duyệt thành viên",
    room: await loadRoom(roomId, req.user._id),
  });
}

// POST /api/rooms/:roomId/requests/:userId/reject -> { room }
export async function rejectMember(req, res) {
  if (!requireTreasurer(req, res)) return;
  const { roomId, userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: "Mã người dùng không hợp lệ" });
  }

  const before = await Room.findOneAndUpdate(
    { _id: roomId, "pendingMembers.user": userId },
    { $pull: { pendingMembers: { user: userId } } },
  );
  if (before) {
    const who = await User.findById(userId).select("fullName");
    await notify({
      users: [userId],
      room: roomId,
      type: "ROOM",
      message: `Yêu cầu tham gia phòng ${before.roomName} đã bị từ chối`,
      link: "/thanh-vien",
      actor: req.user._id,
      self: `Bạn đã từ chối yêu cầu tham gia của ${who?.fullName || "một người"}`,
    });
  }
  return res.json({
    message: "Đã từ chối yêu cầu",
    room: await loadRoom(roomId, req.user._id),
  });
}

// PATCH /api/rooms/:roomId/treasurer { userId } -> { room }
export async function transferTreasurer(req, res) {
  if (!requireTreasurer(req, res)) return;
  const { roomId } = req.params;
  const userId = String(req.body?.userId ?? "");

  if (!mongoose.isValidObjectId(userId) || same(userId, req.user._id)) {
    return res.status(400).json({ message: "Người nhận quyền không hợp lệ" });
  }

  const room = await Room.findById(roomId);
  if (!room || !room.listMember.some((id) => same(id, userId))) {
    return res.status(400).json({ message: "Người này không thuộc phòng" });
  }

  await User.updateOne({ _id: userId }, { roleInRoom: "TREASURER" });
  await User.updateOne({ _id: req.user._id }, { roleInRoom: "MEMBER" });
  const next = await User.findById(userId).select("fullName");
  await notify({
    users: [userId],
    room: roomId,
    type: "ROOM",
    message: `${req.user.fullName} đã chuyển quyền thủ quỹ cho bạn`,
    link: "/quy-chung",
    actor: req.user._id,
  });
  await notifyRoom(roomId, {
    type: "ROOM",
    message: `${next?.fullName || "Một thành viên"} là thủ quỹ mới của phòng`,
    self: `Bạn đã chuyển quyền thủ quỹ cho ${next?.fullName || "thành viên khác"}`,
    link: "/thanh-vien",
    actor: req.user._id,
    skip: [userId],
  });

  return res.json({
    message: "Đã chuyển quyền thủ quỹ",
    room: await loadRoom(roomId, req.user._id),
  });
}
