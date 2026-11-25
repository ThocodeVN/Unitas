import Room from "../room/roomModel.js";

// Quỹ phòng gồm 2 phần: tiền mặt (cashBalance) và tiền tài khoản.
// fundBalance vẫn là TỔNG quỹ (Dashboard và các chỗ cũ không phải sửa),
// tiền tài khoản = fundBalance - cashBalance.
export const SOURCES = ["CASH", "ACCOUNT"];
export const SOURCE_LABEL = { CASH: "Tiền mặt", ACCOUNT: "Tiền tài khoản" };

// Không gửi thì mặc định là tài khoản; gửi sai thì trả về null
export function parseSource(value) {
  if (value === undefined || value === null || value === "") return "ACCOUNT";
  const s = String(value).toUpperCase();
  return SOURCES.includes(s) ? s : null;
}

export const accountOf = (room) =>
  (room.fundBalance ?? 0) - (room.cashBalance ?? 0);

export const balanceOf = (room, source) =>
  source === "CASH" ? (room.cashBalance ?? 0) : accountOf(room);

// Điều kiện "phần quỹ này còn ít nhất min đồng" để dùng trong filter
function atLeast(source, min) {
  if (source === "CASH") return { cashBalance: { $gte: min } };
  return {
    $expr: {
      $gte: [
        { $subtract: ["$fundBalance", { $ifNull: ["$cashBalance", 0] }] },
        min,
      ],
    },
  };
}

// Điều kiện "phần quỹ này đang đúng bằng value"
export function equals(source, value) {
  if (source === "CASH") {
    return value === 0
      ? { $or: [{ cashBalance: 0 }, { cashBalance: { $exists: false } }] }
      : { cashBalance: value };
  }
  return {
    $expr: {
      $eq: [
        { $subtract: ["$fundBalance", { $ifNull: ["$cashBalance", 0] }] },
        value,
      ],
    },
  };
}

export function incUpdate(source, delta) {
  return source === "CASH"
    ? { fundBalance: delta, cashBalance: delta }
    : { fundBalance: delta };
}

// Cộng/trừ quỹ trong MỘT lệnh có điều kiện: trừ thì không bao giờ để âm.
// Trả về phòng sau khi cập nhật, hoặc null nếu không đủ tiền / không có phòng.
export function changeFund(roomId, source, delta, extra = {}) {
  const filter = { _id: roomId };
  if (delta < 0) Object.assign(filter, atLeast(source, -delta));
  return Room.findOneAndUpdate(
    filter,
    { ...extra, $inc: { ...incUpdate(source, delta), ...(extra.$inc || {}) } },
    { returnDocument: "after" },
  );
}
