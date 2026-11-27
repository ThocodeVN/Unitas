import Room from "../room/roomModel.js";
import Transaction from "./transactionModel.js";
import { accountOf } from "./fundBalance.js";

// Lịch sử số dư tiền mặt / tài khoản để vẽ biểu đồ "Lịch sử biến động".
// Số dư tại một thời điểm = số dư hiện tại trừ ngược các giao dịch xảy ra sau thời điểm đó.

const TZ = "Asia/Ho_Chi_Minh";
const WEEKS = 8;
const MONTHS = 6;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const dayVN = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);

// Cộng n ngày cho "YYYY-MM-DD"
function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Thứ Hai của tuần chứa ngày này
function mondayOf(day) {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Chủ nhật
  return addDays(day, -((dow + 6) % 7));
}

function shiftMonth(month, n) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

const lastDayOfMonth = (month) => addDays(`${shiftMonth(month, 1)}-01`, -1);
const startOf = (day) => new Date(`${day}T00:00:00+07:00`);
const endOf = (day) => new Date(`${day}T23:59:59.999+07:00`);

// "2026-11-05" -> { d: 5, m: 11, y: 2026 }
const parts = (day) => {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d };
};

function weekLabel(monday) {
  const a = parts(monday);
  const b = parts(addDays(monday, 6));
  return a.m === b.m
    ? `${a.d}–${b.d}/${b.m}/${b.y}`
    : `${a.d}/${a.m}–${b.d}/${b.m}/${b.y}`;
}

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return `Tháng ${m}, ${y}`;
}

// Danh sách kỳ để chọn, mới nhất trước, không lùi quá ngày tạo phòng
function listPeriods(scale, today, createdDay) {
  const periods = [];
  if (scale === "week") {
    const current = mondayOf(today);
    for (let i = 0; i < WEEKS; i++) {
      const monday = addDays(current, -7 * i);
      if (i > 0 && addDays(monday, 6) < createdDay) break;
      periods.push({ id: monday, label: weekLabel(monday) });
    }
  } else {
    const current = today.slice(0, 7);
    for (let i = 0; i < MONTHS; i++) {
      const month = shiftMonth(current, -i);
      if (i > 0 && lastDayOfMonth(month) < createdDay) break;
      periods.push({ id: month, label: monthLabel(month) });
    }
  }
  return periods;
}

// Các cột của biểu đồ: tuần -> từng ngày; tháng -> từng cụm 7 ngày (1–7, 8–14, ...)
// Mỗi cột: { label, end: ngày cuối của cột }. Không vẽ những ngày chưa tới.
function buildColumns(scale, id, today) {
  const cols = [];
  if (scale === "week") {
    for (let i = 0; i < 7; i++) {
      const day = addDays(id, i);
      if (day > today) break;
      const { d, m } = parts(day);
      cols.push({ label: `${d}/${m}`, start: day, end: day });
    }
  } else {
    const last = lastDayOfMonth(id);
    for (let from = `${id}-01`; from <= last && from <= today; from = addDays(from, 7)) {
      let to = addDays(from, 6);
      if (to > last) to = last;
      if (to > today) to = today;
      const a = parts(from);
      const b = parts(to);
      cols.push({
        label: a.d === b.d ? `${a.d}/${a.m}` : `${a.d}–${b.d}/${b.m}`,
        start: from,
        end: to,
      });
    }
  }
  return cols;
}

// GET /api/finance/fund/history?scale=week|month&period=<id>
// period: tuần = ngày thứ Hai "YYYY-MM-DD", tháng = "YYYY-MM". Bỏ trống = kỳ hiện tại.
// -> { scale, periods: [{ id, label }], period: { id, label, points: [{ label, cash, account }] } }
export async function getFundHistory(req, res) {
  const user = req.user;
  if (!user.roomJoined) {
    return res.status(404).json({ message: "Bạn chưa ở trong phòng nào" });
  }

  const scale = req.query.scale === "week" ? "week" : "month";
  if (req.query.scale && !["week", "month"].includes(req.query.scale)) {
    return res.status(400).json({ message: "scale phải là week hoặc month" });
  }

  const room = await Room.findById(user.roomJoined).select(
    "fundBalance cashBalance createDate",
  );
  if (!room) return res.status(404).json({ message: "Không tìm thấy phòng" });

  const now = new Date();
  const today = dayVN(now);
  const createdDay = room.createDate ? dayVN(room.createDate) : today;
  const periods = listPeriods(scale, today, createdDay);

  let id = req.query.period ? String(req.query.period) : periods[0].id;
  const validFormat = scale === "week" ? DATE_RE.test(id) : MONTH_RE.test(id);
  if (!validFormat) {
    return res.status(400).json({
      message:
        scale === "week"
          ? "Tuần không hợp lệ (ngày thứ Hai dạng YYYY-MM-DD)"
          : "Tháng không hợp lệ (YYYY-MM)",
    });
  }
  if (scale === "week") id = mondayOf(id);

  const columns = buildColumns(scale, id, today);
  const label = scale === "week" ? weekLabel(id) : monthLabel(id);
  if (columns.length === 0) {
    return res.json({ scale, periods, period: { id, label, points: [] } });
  }

  // Lấy mọi giao dịch từ đầu kỳ tới giờ, rồi trừ ngược từ số dư hiện tại
  const txs = await Transaction.find({
    room: room._id,
    createdAt: { $gte: startOf(columns[0].start) },
  })
    .select("type amount source createdAt")
    .lean();

  const cashNow = room.cashBalance ?? 0;
  const accountNow = accountOf(room);

  const points = columns.map((col) => {
    const end = endOf(col.end);
    let cash = cashNow;
    let account = accountNow;
    if (end < now) {
      for (const t of txs) {
        if (t.createdAt <= end) continue;
        const signed = t.type === "IN" ? t.amount : -t.amount;
        if (t.source === "CASH") cash -= signed;
        else account -= signed;
      }
    }
    return { label: col.label, cash, account };
  });

  return res.json({ scale, periods, period: { id, label, points } });
}
