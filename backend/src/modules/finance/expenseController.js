import mongoose from "mongoose";
import Room from "../room/roomModel.js";
import Expense, { EXPENSE_CATEGORIES } from "./expenseModel.js";
import Transaction from "./transactionModel.js";
import { changeFund, parseSource, SOURCE_LABEL } from "./fundBalance.js";
import { notifyRoom, vnd } from "../notification/notify.js";

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

const toDto = (e) => ({
  _id: e._id,
  title: e.title,
  amount: e.amount,
  category: e.category,
  date: e.date,
  createdBy: e.createdBy?.fullName ?? "",
  createdAt: e.createdAt,
});

// GET /api/finance/expenses -> { expenses, categories }
export async function listExpenses(req, res) {
  if (!requireRoom(req, res)) return;
  const list = await Expense.find({ room: req.user.roomJoined })
    .sort({ date: -1, createdAt: -1 })
    .populate("createdBy", "fullName");
  return res.json({
    expenses: list.map(toDto),
    categories: EXPENSE_CATEGORIES,
  });
}

// POST /api/finance/expenses { title, amount, category?, date?, source? } -> { expense, fundBalance }
// source: "CASH" (chi tiền mặt) hoặc "ACCOUNT" (chuyển khoản, mặc định)
export async function createExpense(req, res) {
  if (!requireRoom(req, res, true)) return;
  const user = req.user;

  const title = String(req.body?.title ?? "").trim();
  const amount = Number(req.body?.amount);
  const category = req.body?.category ? String(req.body.category) : "Khác";
  const date = req.body?.date ? new Date(req.body.date) : new Date();
  const source = parseSource(req.body?.source);

  if (!source) {
    return res.status(400).json({ message: "Nguồn tiền không hợp lệ" });
  }

  if (!title || title.length > 100) {
    return res
      .status(400)
      .json({ message: "Tên khoản chi từ 1 đến 100 ký tự" });
  }
  if (!Number.isInteger(amount) || amount < 1000 || amount > 1_000_000_000) {
    return res
      .status(400)
      .json({ message: "Số tiền phải là số nguyên từ 1.000đ trở lên" });
  }
  if (!EXPENSE_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: "Danh mục chi không hợp lệ" });
  }
  if (Number.isNaN(date.getTime())) {
    return res.status(400).json({ message: "Ngày chi không hợp lệ" });
  }

  // Trừ quỹ trong một lệnh có điều kiện: không bao giờ âm, không trừ hai lần
  const room = await changeFund(user.roomJoined, source, -amount);
  if (!room) {
    const exists = await Room.exists({ _id: user.roomJoined });
    if (!exists) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }
    return res.status(409).json({
      message: `${SOURCE_LABEL[source]} không đủ cho khoản chi này`,
    });
  }

  let tx = null;
  let expense = null;
  try {
    tx = await Transaction.create({
      room: room._id,
      type: "OUT",
      amount,
      source,
      description: title,
      createdBy: user._id,
    });
    expense = await Expense.create({
      room: room._id,
      title,
      amount,
      category,
      date,
      transaction: tx._id,
      createdBy: user._id,
    });
    await Room.updateOne(
      { _id: room._id },
      { $push: { transactionHistory: tx._id } },
    );
  } catch (err) {
    // Ghi lỗi giữa chừng thì hoàn tiền và dọn bản ghi đã tạo
    await changeFund(room._id, source, amount);
    if (tx) await Transaction.deleteOne({ _id: tx._id });
    if (expense) await Expense.deleteOne({ _id: expense._id });
    throw err;
  }

  await notifyRoom(room._id, {
    type: "FUND",
    message: `Thủ quỹ đã chi ${vnd(amount)} cho "${title}" (${SOURCE_LABEL[source].toLowerCase()})`,
    self: `Bạn đã chi ${vnd(amount)} cho "${title}" (${SOURCE_LABEL[source].toLowerCase()})`,
    link: "/chi-tieu",
    actor: user._id,
  });

  await expense.populate("createdBy", "fullName");
  return res
    .status(201)
    .json({ expense: toDto(expense), fundBalance: room.fundBalance });
}

// DELETE /api/finance/expenses/:id -> { message, fundBalance }
export async function deleteExpense(req, res) {
  if (!requireRoom(req, res, true)) return;
  const user = req.user;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Mã không hợp lệ" });
  }

  // Xóa trước rồi mới hoàn tiền: hai người cùng bấm xóa chỉ một người hoàn được
  const expense = await Expense.findOneAndDelete({
    _id: id,
    room: user.roomJoined,
  });
  if (!expense) {
    return res.status(404).json({ message: "Không tìm thấy khoản chi" });
  }

  // Hoàn về đúng phần quỹ đã chi (tiền mặt hoặc tài khoản)
  const tx = expense.transaction
    ? await Transaction.findOneAndDelete({ _id: expense.transaction })
    : null;
  const room = await changeFund(
    user.roomJoined,
    tx?.source || "ACCOUNT",
    expense.amount,
    { $pull: { transactionHistory: expense.transaction } },
  );

  await notifyRoom(user.roomJoined, {
    type: "FUND",
    message: `Thủ quỹ đã xóa khoản chi "${expense.title}" và hoàn ${vnd(expense.amount)} vào quỹ`,
    self: `Bạn đã xóa khoản chi "${expense.title}" và hoàn ${vnd(expense.amount)} vào quỹ`,
    link: "/chi-tieu",
    actor: user._id,
  });

  return res.json({
    message: "Đã xóa khoản chi và hoàn tiền vào quỹ",
    fundBalance: room?.fundBalance ?? null,
  });
}

// Tổng chi trong tháng hiện tại, dùng cho Dashboard
export async function monthSpent(roomId) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [row] = await Expense.aggregate([
    {
      $match: {
        room: new mongoose.Types.ObjectId(String(roomId)),
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  return { amount: row?.amount ?? 0, count: row?.count ?? 0 };
}
