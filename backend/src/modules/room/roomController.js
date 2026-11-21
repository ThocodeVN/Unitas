import crypto from "crypto";
import mongoose from "mongoose";
import Room from "./roomModel.js";
import User from "../../models/User.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ I, O, 0, 1 cho dễ đọc

const isMemberOf = (user, roomId) =>
  Boolean(user.roomJoined) && String(user.roomJoined) === String(roomId);

const withMembers = (query) =>
  query.populate("listMember", "fullName username avatar roleInRoom");

async function makeInviteCode() {
  for (let i = 0; i < 10; i++) {
    let code = "";
    for (let j = 0; j < 6; j++) {
      code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    }
    if (!(await Room.exists({ inviteCode: code }))) return code;
  }
  throw new Error("Không tạo được mã mời");
}

// Chưa ở phòng nào (hoặc phòng cũ đã bị xóa) thì được tạo hoặc tham gia phòng mới
async function isFree(user) {
  if (!user.roomJoined) return true;
  if (await Room.exists({ _id: user.roomJoined })) return false;
  user.roomJoined = null;
  user.roleInRoom = "NONE";
  return true;
}

// Kiểm tra roomId hợp lệ và người gọi thuộc phòng. Trả về false nếu đã gửi lỗi.
function checkAccess(req, res, { treasurerOnly = false } = {}) {
  const { roomId } = req.params;
  if (!mongoose.isValidObjectId(roomId)) {
    res.status(400).json({ message: "Mã phòng không hợp lệ" });
    return false;
  }
  if (!isMemberOf(req.user, roomId)) {
    res.status(403).json({ message: "Bạn không thuộc phòng này" });
    return false;
  }
  if (treasurerOnly && req.user.roleInRoom !== "TREASURER") {
    res
      .status(403)
      .json({ message: "Chỉ thủ quỹ mới được thực hiện thao tác này" });
    return false;
  }
  return true;
}

function parseRoomName(value) {
  const roomName = String(value ?? "").trim();
  return roomName && roomName.length <= 100 ? roomName : null;
}

export async function createRoom(req, res) {
  const user = req.user;
  if (!(await isFree(user))) {
    return res
      .status(409)
      .json({
        message:
          "Bạn đang ở trong một phòng. Hãy rời phòng trước khi tạo phòng mới",
      });
  }

  const roomName = parseRoomName(req.body?.roomName);
  if (!roomName) {
    return res
      .status(400)
      .json({ message: "Tên phòng phải từ 1 đến 100 ký tự" });
  }

  const room = await Room.create({
    roomName,
    inviteCode: await makeInviteCode(),
    listMember: [user._id],
  });

  user.roomJoined = room._id;
  user.roleInRoom = "TREASURER";
  await user.save();

  return res
    .status(201)
    .json({
      message: "Đã tạo phòng",
      room: await withMembers(Room.findById(room._id)),
    });
}

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

  room.listMember.addToSet(user._id);
  await room.save();

  user.roomJoined = room._id;
  user.roleInRoom = "MEMBER";
  await user.save();

  return res.json({
    message: "Đã tham gia phòng",
    room: await withMembers(Room.findById(room._id)),
  });
}

// Phòng của người đang đăng nhập. Chưa có phòng thì trả về room: null
export async function getMyRoom(req, res) {
  const user = req.user;
  if (!user.roomJoined) return res.json({ room: null });

  const room = await withMembers(Room.findById(user.roomJoined));
  if (!room) {
    user.roomJoined = null;
    user.roleInRoom = "NONE";
    await user.save();
    return res.json({ room: null });
  }
  return res.json({ room });
}

export async function getRoomById(req, res) {
  if (!checkAccess(req, res)) return;

  const room = await withMembers(Room.findById(req.params.roomId));
  if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });
  return res.json({ room });
}

export async function updateRoom(req, res) {
  if (!checkAccess(req, res, { treasurerOnly: true })) return;

  const roomName = parseRoomName(req.body?.roomName);
  if (!roomName) {
    return res
      .status(400)
      .json({ message: "Tên phòng phải từ 1 đến 100 ký tự" });
  }

  const room = await withMembers(
    Room.findByIdAndUpdate(
      req.params.roomId,
      { roomName },
      { new: true, runValidators: true },
    ),
  );
  if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });
  return res.json({ message: "Đã cập nhật phòng", room });
}

export async function transferTreasurer(req, res) {
  if (!checkAccess(req, res, { treasurerOnly: true })) return;

  const userId = String(req.body?.userId ?? "");
  if (!mongoose.isValidObjectId(userId) || userId === String(req.user._id)) {
    return res.status(400).json({ message: "Người nhận quyền không hợp lệ" });
  }

  const room = await Room.findById(req.params.roomId);
  if (!room || !room.listMember.some((id) => String(id) === userId)) {
    return res.status(400).json({ message: "Người này không thuộc phòng" });
  }

  await User.updateOne({ _id: userId }, { roleInRoom: "TREASURER" });
  await User.updateOne({ _id: req.user._id }, { roleInRoom: "MEMBER" });

  return res.json({
    message: "Đã chuyển quyền thủ quỹ",
    room: await withMembers(Room.findById(room._id)),
  });
}

export async function leaveRoom(req, res) {
  const user = req.user;
  if (!user.roomJoined) {
    return res.status(400).json({ message: "Bạn chưa ở trong phòng nào" });
  }

  const room = await Room.findById(user.roomJoined);
  if (room) {
    const others = room.listMember.filter(
      (id) => String(id) !== String(user._id),
    );

    if (user.roleInRoom === "TREASURER" && others.length > 0) {
      return res.status(400).json({
        message:
          "Bạn đang là thủ quỹ. Hãy chuyển quyền thủ quỹ cho người khác trước khi rời phòng",
      });
    }

    if (others.length === 0) {
      await room.deleteOne(); // người cuối cùng rời đi thì xóa phòng
    } else {
      room.listMember = others;
      await room.save();
    }
  }

  user.roomJoined = null;
  user.roleInRoom = "NONE";
  await user.save();
  return res.json({ message: "Đã rời phòng" });
}

export async function deleteRoom(req, res) {
  if (!checkAccess(req, res, { treasurerOnly: true })) return;

  const room = await Room.findById(req.params.roomId);
  if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

  await User.updateMany(
    { _id: { $in: room.listMember } },
    { roomJoined: null, roleInRoom: "NONE" },
  );
  await room.deleteOne();
  return res.json({ message: "Đã xóa phòng" });
}
