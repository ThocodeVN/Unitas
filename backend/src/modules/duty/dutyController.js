import mongoose from "mongoose";
import Room from "../room/roomModel.js";
import Duty from "./dutyModel.js";

const same = (a, b) => String(a) === String(b);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_RANGE_DAYS = 62;
const MAX_ROTATION_DAYS = 31;

// Ngày hôm nay theo giờ Việt Nam, dạng "YYYY-MM-DD"
export function todayVN() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function isValidDate(s) {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function addDays(s, n) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const daysBetween = (a, b) =>
  Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86_400_000);

// Khung giờ: cả hai trống (trong ngày) hoặc cả hai "HH:mm" với from < to
function parseTimeRange(body) {
  const from = String(body?.from ?? "").trim();
  const to = String(body?.to ?? "").trim();
  if (!from && !to) return { from: "", to: "" };
  if (!TIME_RE.test(from) || !TIME_RE.test(to) || from >= to) {
    return { error: "Khung giờ phải dạng HH:mm và giờ bắt đầu trước giờ kết thúc" };
  }
  return { from, to };
}

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

async function roomMemberIds(roomId) {
  const room = await Room.findById(roomId).select("listMember");
  return room ? room.listMember.map(String) : null;
}

const toDto = (d) => ({
  _id: d._id,
  id: d._id,
  title: d.title,
  note: d.note,
  assignee: d.assignee?.fullName ?? "(đã rời phòng)",
  assigneeId: d.assignee?._id ?? null,
  avatar: d.assignee?.avatar ?? "",
  date: d.date,
  time: d.from && d.to ? { type: "range", from: d.from, to: d.to } : { type: "any" },
  status: d.status,
  doneAt: d.doneAt,
});

const populateAssignee = (q) => q.populate("assignee", "fullName avatar");

// GET /api/duties?from=YYYY-MM-DD&to=YYYY-MM-DD&mine=true -> { duties, from, to }
// Mặc định: từ hôm nay đến 6 ngày sau
export async function listDuties(req, res) {
  if (!requireRoom(req, res)) return;
  const from = req.query.from ? String(req.query.from) : todayVN();
  const to = req.query.to ? String(req.query.to) : addDays(from, 6);

  if (!isValidDate(from) || !isValidDate(to) || from > to) {
    return res.status(400).json({ message: "Khoảng ngày không hợp lệ" });
  }
  if (daysBetween(from, to) > MAX_RANGE_DAYS) {
    return res
      .status(400)
      .json({ message: `Chỉ xem tối đa ${MAX_RANGE_DAYS} ngày một lần` });
  }

  const filter = { room: req.user.roomJoined, date: { $gte: from, $lte: to } };
  if (req.query.mine === "true") filter.assignee = req.user._id;

  const list = await populateAssignee(
    Duty.find(filter).sort({ date: 1, from: 1, createdAt: 1 }),
  );
  return res.json({ duties: list.map(toDto), from, to });
}

// POST /api/duties { title, assigneeId, date, from?, to?, note? } -> { duty }
export async function createDuty(req, res) {
  if (!requireRoom(req, res, true)) return;
  const user = req.user;

  const title = String(req.body?.title ?? "").trim();
  const note = String(req.body?.note ?? "").trim();
  const assigneeId = String(req.body?.assigneeId ?? "");
  const date = String(req.body?.date ?? "");
  const time = parseTimeRange(req.body);

  if (!title || title.length > 100) {
    return res.status(400).json({ message: "Tên công việc từ 1 đến 100 ký tự" });
  }
  if (note.length > 300) {
    return res.status(400).json({ message: "Ghi chú tối đa 300 ký tự" });
  }
  if (!isValidDate(date)) {
    return res.status(400).json({ message: "Ngày không hợp lệ (YYYY-MM-DD)" });
  }
  if (time.error) return res.status(400).json({ message: time.error });

  const members = await roomMemberIds(user.roomJoined);
  if (!members) return res.status(404).json({ message: "Không tìm thấy phòng" });
  if (!members.includes(assigneeId)) {
    return res
      .status(400)
      .json({ message: "Người được giao không phải thành viên phòng" });
  }

  const created = await Duty.create({
    room: user.roomJoined,
    title,
    note,
    assignee: assigneeId,
    date,
    from: time.from,
    to: time.to,
    createdBy: user._id,
  });
  const full = await populateAssignee(Duty.findById(created._id));
  return res.status(201).json({ duty: toDto(full) });
}

// POST /api/duties/rotation { title, startDate, days, memberIds?, from?, to?, note? } -> { duties }
// Xếp lịch trực xoay vòng: mỗi ngày một người theo thứ tự memberIds (mặc định mọi thành viên)
export async function createRotation(req, res) {
  if (!requireRoom(req, res, true)) return;
  const user = req.user;

  const title = String(req.body?.title ?? "").trim();
  const note = String(req.body?.note ?? "").trim();
  const startDate = String(req.body?.startDate ?? "");
  const days = Number(req.body?.days);
  const time = parseTimeRange(req.body);

  if (!title || title.length > 100) {
    return res.status(400).json({ message: "Tên công việc từ 1 đến 100 ký tự" });
  }
  if (note.length > 300) {
    return res.status(400).json({ message: "Ghi chú tối đa 300 ký tự" });
  }
  if (!isValidDate(startDate)) {
    return res
      .status(400)
      .json({ message: "Ngày bắt đầu không hợp lệ (YYYY-MM-DD)" });
  }
  if (!Number.isInteger(days) || days < 1 || days > MAX_ROTATION_DAYS) {
    return res
      .status(400)
      .json({ message: `Số ngày phải từ 1 đến ${MAX_ROTATION_DAYS}` });
  }
  if (time.error) return res.status(400).json({ message: time.error });

  const members = await roomMemberIds(user.roomJoined);
  if (!members) return res.status(404).json({ message: "Không tìm thấy phòng" });

  let order = members;
  if (req.body?.memberIds !== undefined) {
    if (!Array.isArray(req.body.memberIds) || req.body.memberIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Danh sách người trực không hợp lệ" });
    }
    order = req.body.memberIds.map(String);
    if (!order.every((id) => members.includes(id))) {
      return res
        .status(400)
        .json({ message: "Có người trong danh sách không phải thành viên phòng" });
    }
  }

  const docs = Array.from({ length: days }, (_, i) => ({
    room: user.roomJoined,
    title,
    note,
    assignee: order[i % order.length],
    date: addDays(startDate, i),
    from: time.from,
    to: time.to,
    createdBy: user._id,
  }));
  const created = await Duty.insertMany(docs);

  const full = await populateAssignee(
    Duty.find({ _id: { $in: created.map((d) => d._id) } }).sort({ date: 1 }),
  );
  return res.status(201).json({ duties: full.map(toDto) });
}

// PATCH /api/duties/:id { title?, assigneeId?, date?, from?, to?, note? } -> { duty }
export async function updateDuty(req, res) {
  if (!requireRoom(req, res, true)) return;
  const user = req.user;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Mã không hợp lệ" });
  }

  const duty = await Duty.findOne({ _id: id, room: user.roomJoined });
  if (!duty) return res.status(404).json({ message: "Không tìm thấy công việc" });

  const body = req.body ?? {};
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title || title.length > 100) {
      return res.status(400).json({ message: "Tên công việc từ 1 đến 100 ký tự" });
    }
    duty.title = title;
  }
  if (body.note !== undefined) {
    const note = String(body.note).trim();
    if (note.length > 300) {
      return res.status(400).json({ message: "Ghi chú tối đa 300 ký tự" });
    }
    duty.note = note;
  }
  if (body.date !== undefined) {
    if (!isValidDate(String(body.date))) {
      return res.status(400).json({ message: "Ngày không hợp lệ (YYYY-MM-DD)" });
    }
    duty.date = String(body.date);
  }
  if (body.from !== undefined || body.to !== undefined) {
    const time = parseTimeRange(body);
    if (time.error) return res.status(400).json({ message: time.error });
    duty.from = time.from;
    duty.to = time.to;
  }
  if (body.assigneeId !== undefined) {
    const members = await roomMemberIds(user.roomJoined);
    if (!members?.includes(String(body.assigneeId))) {
      return res
        .status(400)
        .json({ message: "Người được giao không phải thành viên phòng" });
    }
    duty.assignee = body.assigneeId;
  }

  await duty.save();
  const full = await populateAssignee(Duty.findById(duty._id));
  return res.json({ duty: toDto(full) });
}

// PATCH /api/duties/:id/status { status: "TODO" | "DONE" } -> { duty }
// Người được giao hoặc thủ quỹ mới được đổi
export async function updateDutyStatus(req, res) {
  if (!requireRoom(req, res)) return;
  const user = req.user;
  const { id } = req.params;
  const status = String(req.body?.status ?? "");

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Mã không hợp lệ" });
  }
  if (!["TODO", "DONE"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Trạng thái chỉ được là TODO hoặc DONE" });
  }

  const duty = await Duty.findOne({ _id: id, room: user.roomJoined });
  if (!duty) return res.status(404).json({ message: "Không tìm thấy công việc" });
  if (user.roleInRoom !== "TREASURER" && !same(duty.assignee, user._id)) {
    return res
      .status(403)
      .json({ message: "Chỉ người được giao hoặc thủ quỹ mới đổi được trạng thái" });
  }

  duty.status = status;
  duty.doneAt = status === "DONE" ? new Date() : null;
  await duty.save();

  const full = await populateAssignee(Duty.findById(duty._id));
  return res.json({ duty: toDto(full) });
}

// DELETE /api/duties/:id
export async function deleteDuty(req, res) {
  if (!requireRoom(req, res, true)) return;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Mã không hợp lệ" });
  }
  const result = await Duty.deleteOne({ _id: id, room: req.user.roomJoined });
  if (!result.deletedCount) {
    return res.status(404).json({ message: "Không tìm thấy công việc" });
  }
  return res.json({ message: "Đã xóa công việc" });
}

// Việc trực hôm nay cho Dashboard: [{ id, assignee, title, time, status }]
export async function todayDuties(roomId) {
  const list = await populateAssignee(
    Duty.find({ room: roomId, date: todayVN() }).sort({ from: 1, createdAt: 1 }),
  );
  return list.map((d) => {
    const dto = toDto(d);
    return {
      id: dto.id,
      assignee: dto.assignee,
      title: dto.title,
      time: dto.time,
      status: dto.status,
    };
  });
}
