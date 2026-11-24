import mongoose from "mongoose";
import Room from "../room/roomModel.js";
import Contribution from "./contributionModel.js";
import Expense from "./expenseModel.js";
import Transaction from "./transactionModel.js";

const TZ = "Asia/Ho_Chi_Minh";
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Tháng hiện tại theo giờ Việt Nam, dạng "YYYY-MM"
const currentMonthVN = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ })
    .format(new Date())
    .slice(0, 7);

// Cộng/trừ n tháng cho "YYYY-MM"
function shiftMonth(month, n) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

// Mốc đầu tháng theo giờ Việt Nam (UTC+7)
const monthStart = (month) => new Date(`${month}-01T00:00:00+07:00`);

// Tổng tiền theo tháng của một collection: { "YYYY-MM": { amount, count } }
async function sumByMonth(Model, match, dateField, from, to) {
  const rows = await Model.aggregate([
    { $match: { ...match, [dateField]: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m", date: `$${dateField}`, timezone: TZ },
        },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r]));
}

// GET /api/finance/stats?month=YYYY-MM&months=6
// -> { month, fundBalance, summary, byMonth, byCategory, collection }
// Mọi thành viên trong phòng đều xem được
export async function getStats(req, res) {
  const user = req.user;
  if (!user.roomJoined) {
    return res.status(404).json({ message: "Bạn chưa ở trong phòng nào" });
  }

  const month = req.query.month ? String(req.query.month) : currentMonthVN();
  const months = req.query.months ? Number(req.query.months) : 6;
  if (!MONTH_RE.test(month)) {
    return res.status(400).json({ message: "Tháng không hợp lệ (YYYY-MM)" });
  }
  if (!Number.isInteger(months) || months < 1 || months > 12) {
    return res.status(400).json({ message: "Số tháng phải từ 1 đến 12" });
  }

  const room = await Room.findById(user.roomJoined).select("fundBalance");
  if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });
  const roomId = new mongoose.Types.ObjectId(String(room._id));

  const firstMonth = shiftMonth(month, -(months - 1));
  const rangeFrom = monthStart(firstMonth);
  const rangeTo = monthStart(shiftMonth(month, 1));
  const thisFrom = monthStart(month);

  // Thu = giao dịch IN (xác nhận đóng tiền), theo ngày ghi nhận.
  // Chi = khoản chi, theo ngày chi thực tế.
  const [incomeMap, expenseMap, categories, contributions] = await Promise.all([
    sumByMonth(Transaction, { room: roomId, type: "IN" }, "createdAt", rangeFrom, rangeTo),
    sumByMonth(Expense, { room: roomId }, "date", rangeFrom, rangeTo),
    Expense.aggregate([
      { $match: { room: roomId, date: { $gte: thisFrom, $lt: rangeTo } } },
      { $group: { _id: "$category", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
    ]),
    Contribution.find({
      room: roomId,
      dueDate: { $gte: thisFrom, $lt: rangeTo },
    }).select("amount payments.status"),
  ]);

  const byMonth = Array.from({ length: months }, (_, i) => {
    const m = shiftMonth(firstMonth, i);
    return {
      month: m,
      income: incomeMap[m]?.amount ?? 0,
      expense: expenseMap[m]?.amount ?? 0,
    };
  });

  const income = incomeMap[month]?.amount ?? 0;
  const expense = expenseMap[month]?.amount ?? 0;

  // Tiến độ thu các khoản đóng có hạn trong tháng
  let expected = 0;
  let collected = 0;
  let paid = 0;
  let total = 0;
  for (const c of contributions) {
    for (const p of c.payments) {
      total += 1;
      expected += c.amount;
      if (p.status === "PAID") {
        paid += 1;
        collected += c.amount;
      }
    }
  }

  return res.json({
    month,
    fundBalance: room.fundBalance,
    summary: {
      income,
      expense,
      net: income - expense,
      incomeCount: incomeMap[month]?.count ?? 0,
      expenseCount: expenseMap[month]?.count ?? 0,
    },
    byMonth,
    byCategory: categories.map((c) => ({
      category: c._id,
      amount: c.amount,
      count: c.count,
    })),
    collection: { expected, collected, paid, total },
  });
}
