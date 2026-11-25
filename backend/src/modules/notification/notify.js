import Room from "../room/roomModel.js";
import Notification from "./notificationModel.js";

const same = (a, b) => String(a) === String(b);

// Ghi thông báo cho các người nhận.
// - actor: người gây ra sự kiện, KHÔNG nhận `message` (vì message viết cho người khác)
// - self: câu viết cho chính actor ("Bạn đã ..."), lưu ở trạng thái đã đọc
//   để chuông giống nhật ký hoạt động mà không làm tăng số chưa đọc
// - skip: những người không nhận message (vd đã có tin riêng)
// Không bao giờ ném lỗi: ghi thông báo hỏng thì thao tác chính vẫn thành công.
export async function notify({
  users = [],
  room = null,
  type,
  message,
  link = "",
  actor = null,
  self = "",
  skip = [],
}) {
  try {
    const seen = new Set(skip.map(String));
    const docs = [];
    for (const u of users) {
      const id = String(u?._id ?? u);
      if (!u || seen.has(id) || (actor && same(id, actor))) continue;
      seen.add(id);
      docs.push({ user: id, room, type, message: message.slice(0, 300), link, actor });
    }
    if (actor && self) {
      docs.push({
        user: actor,
        room,
        type,
        message: self.slice(0, 300),
        link,
        actor,
        read: true,
      });
    }
    if (docs.length) await Notification.insertMany(docs);
  } catch (err) {
    console.error("Không ghi được thông báo:", err.message);
  }
}

// Gửi cho mọi thành viên trong phòng (trừ actor và skip)
export async function notifyRoom(roomId, payload) {
  try {
    const room = await Room.findById(roomId).select("listMember");
    await notify({ ...payload, room: roomId, users: room?.listMember ?? [] });
  } catch (err) {
    console.error("Không ghi được thông báo:", err.message);
  }
}

// Gửi cho thủ quỹ của phòng
export async function notifyTreasurer(roomId, payload) {
  try {
    const room = await Room.findById(roomId)
      .select("listMember")
      .populate("listMember", "roleInRoom");
    const treasurers = (room?.listMember || []).filter(
      (m) => m?.roleInRoom === "TREASURER",
    );
    await notify({ ...payload, room: roomId, users: treasurers });
  } catch (err) {
    console.error("Không ghi được thông báo:", err.message);
  }
}

// 150000 -> "150.000đ"
export const vnd = (n) => `${Number(n || 0).toLocaleString("vi-VN")}đ`;
