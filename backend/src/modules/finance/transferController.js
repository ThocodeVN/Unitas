import Room from "../room/roomModel.js";
import Transaction from "./transactionModel.js";
import { accountOf, parseSource, SOURCE_LABEL } from "./fundBalance.js";
import { notifyRoom, vnd } from "../notification/notify.js";

// Chuyển tiền giữa hai phần của quỹ: tổng quỹ không đổi, chỉ đổi tiền mặt.
// CASH -> ACCOUNT: nộp tiền mặt vào tài khoản
// ACCOUNT -> CASH: rút từ tài khoản ra tiền mặt

// POST /api/finance/transfers { from: "CASH" | "ACCOUNT", amount, note? }
// -> { cashBalance, accountBalance }
export async function createTransfer(req, res) {
  const user = req.user;
  if (!user.roomJoined) {
    return res.status(404).json({ message: "Bạn chưa ở trong phòng nào" });
  }
  if (user.roleInRoom !== "TREASURER") {
    return res
      .status(403)
      .json({ message: "Chỉ thủ quỹ mới được thực hiện thao tác này" });
  }

  const from = req.body?.from ? parseSource(req.body.from) : null;
  const amount = Number(req.body?.amount);
  const note = String(req.body?.note ?? "").trim();

  if (!from) {
    return res
      .status(400)
      .json({ message: "Hãy chọn chuyển từ tiền mặt hay từ tài khoản" });
  }
  if (!Number.isInteger(amount) || amount < 1000 || amount > 1_000_000_000) {
    return res
      .status(400)
      .json({ message: "Số tiền phải là số nguyên từ 1.000đ trở lên" });
  }
  if (note.length > 150) {
    return res.status(400).json({ message: "Ghi chú tối đa 150 ký tự" });
  }

  const to = from === "CASH" ? "ACCOUNT" : "CASH";

  // Một lệnh có điều kiện: phần bị rút phải đủ tiền
  const filter =
    from === "CASH"
      ? { _id: user.roomJoined, cashBalance: { $gte: amount } }
      : {
          _id: user.roomJoined,
          $expr: {
            $gte: [
              { $subtract: ["$fundBalance", { $ifNull: ["$cashBalance", 0] }] },
              amount,
            ],
          },
        };
  const room = await Room.findOneAndUpdate(
    filter,
    { $inc: { cashBalance: from === "CASH" ? -amount : amount } },
    { returnDocument: "after" },
  );
  if (!room) {
    const exists = await Room.exists({ _id: user.roomJoined });
    if (!exists) return res.status(404).json({ message: "Không tìm thấy phòng" });
    return res.status(409).json({
      message: `${SOURCE_LABEL[from]} không đủ để chuyển ${vnd(amount)}`,
    });
  }

  const label =
    from === "CASH" ? "Nộp tiền mặt vào tài khoản" : "Rút tiền mặt từ tài khoản";
  const description = (note ? `${label}: ${note}` : label).slice(0, 200);

  let txs = [];
  try {
    txs = await Transaction.insertMany([
      { room: room._id, type: "OUT", amount, source: from, kind: "TRANSFER", description, createdBy: user._id },
      { room: room._id, type: "IN", amount, source: to, kind: "TRANSFER", description, createdBy: user._id },
    ]);
    await Room.updateOne(
      { _id: room._id },
      { $push: { transactionHistory: { $each: txs.map((t) => t._id) } } },
    );
  } catch (err) {
    // Ghi giao dịch lỗi thì trả tiền về chỗ cũ
    await Room.updateOne(
      { _id: room._id },
      { $inc: { cashBalance: from === "CASH" ? amount : -amount } },
    );
    if (txs.length) {
      await Transaction.deleteMany({ _id: { $in: txs.map((t) => t._id) } });
    }
    throw err;
  }

  const what =
    from === "CASH"
      ? `nộp ${vnd(amount)} tiền mặt vào tài khoản`
      : `rút ${vnd(amount)} từ tài khoản ra tiền mặt`;
  await notifyRoom(room._id, {
    type: "FUND",
    message: `Thủ quỹ đã ${what}${note ? ` (${note})` : ""}`,
    link: "/quy-chung",
    actor: user._id,
    self: `Bạn đã ${what}${note ? ` (${note})` : ""}`,
  });

  return res.status(201).json({
    cashBalance: room.cashBalance,
    accountBalance: accountOf(room),
  });
}
