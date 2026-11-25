import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Avatar from "../components/Avatar";
import {
  listDuties,
  createDuty,
  createRotation,
  setDutyStatus,
  deleteDuty,
} from "../services/dutyApi";
import "../styles/viecPhong.css";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const same = (a, b) => String(a) === String(b);

// Ngày theo giờ Việt Nam, dạng "YYYY-MM-DD" (khớp cách backend lưu)
const todayVN = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );
const toDate = (s) => new Date(`${s}T00:00:00Z`);
const addDays = (s, n) => {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const mondayOf = (s) => addDays(s, -((toDate(s).getUTCDay() + 6) % 7));
const dayLabel = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const weekday = (s) => WEEKDAYS[toDate(s).getUTCDay()];

export default function ViecPhong() {
  const { me, room, isTreasurer } = useOutletContext();
  const today = todayVN();

  const [weekFrom, setWeekFrom] = useState(() => mondayOf(today));
  const [mine, setMine] = useState(false);
  // Ghi kèm khóa tuần/tab: khóa khác hiện tại nghĩa là đang tải
  const [data, setData] = useState({ key: "", list: [] });
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [dialog, setDialog] = useState(null); // "assign" | "rotate" | { type: "delete", duty }
  const [reload, setReload] = useState(0);

  const weekTo = addDays(weekFrom, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekFrom, i));
  const key = `${weekFrom}|${mine}|${reload}`;
  const duties = data.key === key ? data.list : null;
  const setDuties = (update) =>
    setData((current) => ({ ...current, list: update(current.list) }));
  const load = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    listDuties({ from: weekFrom, to: weekTo, mine })
      .then((list) => {
        if (!active) return;
        setData({ key, list });
        setError("");
      })
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [key, weekFrom, weekTo, mine]);

  const toggle = async (duty) => {
    setBusyId(duty._id);
    setError("");
    try {
      const updated = await setDutyStatus(
        duty._id,
        duty.status === "DONE" ? "TODO" : "DONE",
      );
      setDuties((list) => list.map((d) => (same(d._id, updated._id) ? updated : d)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  };

  const remove = async (duty) => {
    setBusyId(duty._id);
    try {
      await deleteDuty(duty._id);
      setDuties((list) => list.filter((d) => !same(d._id, duty._id)));
      setDialog(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  };

  const todayList = (duties || []).filter((d) => d.date === today);
  const todayDone = todayList.filter((d) => d.status === "DONE").length;

  return (
    <>
      <section className="db-welcome">
        <div>
          <p className="db-eyebrow">Phòng của bạn</p>
          <h2 className="db-welcome-title">Việc phòng</h2>
          <p className="db-hello">
            Hôm nay {weekday(today)} {dayLabel(today)} ·{" "}
            {todayList.length
              ? `${todayList.length} việc, ${todayDone} đã xong`
              : "không có việc nào"}
          </p>
        </div>
        {isTreasurer && (
          <div className="vp-actions">
            <button
              className="db-btn db-btn--ghost"
              type="button"
              onClick={() => setDialog("rotate")}
            >
              Xếp lịch xoay vòng
            </button>
            <button className="db-btn" type="button" onClick={() => setDialog("assign")}>
              + Giao việc
            </button>
          </div>
        )}
      </section>

      {error && (
        <div className="db-inline-alert" role="alert">
          {error}
        </div>
      )}

      <section className="db-card">
        <div className="vp-toolbar">
          <div className="vp-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={!mine}
              className={`vp-tab ${!mine ? "is-active" : ""}`}
              onClick={() => setMine(false)}
            >
              Cả phòng
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mine}
              className={`vp-tab ${mine ? "is-active" : ""}`}
              onClick={() => setMine(true)}
            >
              Việc của tôi
            </button>
          </div>

          <div className="vp-week-nav">
            <button
              type="button"
              className="vp-icon-btn"
              aria-label="Tuần trước"
              onClick={() => setWeekFrom(addDays(weekFrom, -7))}
            >
              ‹
            </button>
            <span className="vp-week-label">
              {dayLabel(weekFrom)} – {dayLabel(weekTo)}
            </span>
            <button
              type="button"
              className="vp-icon-btn"
              aria-label="Tuần sau"
              onClick={() => setWeekFrom(addDays(weekFrom, 7))}
            >
              ›
            </button>
            {weekFrom !== mondayOf(today) && (
              <button
                type="button"
                className="db-btn db-btn--ghost db-btn--sm"
                onClick={() => setWeekFrom(mondayOf(today))}
              >
                Tuần này
              </button>
            )}
          </div>
        </div>

        {duties === null && !error ? (
          <p className="db-empty">Đang tải lịch trực…</p>
        ) : (
          <div className="vp-board">
            {days.map((date) => {
              const list = (duties || []).filter((d) => d.date === date);
              return (
                <div
                  key={date}
                  className={`vp-day ${date === today ? "vp-day--today" : ""} ${date < today ? "vp-day--past" : ""}`}
                >
                  <div className="vp-day-head">
                    <span className="vp-day-name">{weekday(date)}</span>
                    <span className="vp-day-date">{dayLabel(date)}</span>
                  </div>
                  {list.length === 0 ? (
                    <p className="vp-day-empty">Trống</p>
                  ) : (
                    list.map((duty) => (
                      <DutyCard
                        key={duty._id}
                        duty={duty}
                        canToggle={isTreasurer || same(duty.assigneeId, me._id)}
                        canDelete={isTreasurer}
                        busy={busyId === duty._id}
                        isMine={same(duty.assigneeId, me._id)}
                        onToggle={() => toggle(duty)}
                        onDelete={() => setDialog({ type: "delete", duty })}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {dialog === "assign" && (
        <AssignDialog
          members={room.listMember || []}
          defaultDate={today}
          onCancel={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            load();
          }}
        />
      )}

      {dialog === "rotate" && (
        <RotationDialog
          members={room.listMember || []}
          defaultDate={today}
          onCancel={() => setDialog(null)}
          onDone={(created) => {
            setDialog(null);
            if (created[0]) setWeekFrom(mondayOf(created[0].date));
            load();
          }}
        />
      )}

      {dialog?.type === "delete" && (
        <Dialog title="Xóa công việc?" onCancel={() => setDialog(null)}>
          <p className="db-dialog-body">
            <strong>{dialog.duty.title}</strong> của {dialog.duty.assignee} ngày{" "}
            {dayLabel(dialog.duty.date)} sẽ bị xóa.
          </p>
          <div className="db-dialog-actions">
            <button
              className="db-btn db-btn--ghost db-btn--sm"
              type="button"
              onClick={() => setDialog(null)}
            >
              Hủy
            </button>
            <button
              className="db-btn db-btn--danger db-btn--sm"
              type="button"
              disabled={busyId === dialog.duty._id}
              onClick={() => remove(dialog.duty)}
            >
              Xóa
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}

function DutyCard({ duty, canToggle, canDelete, busy, isMine, onToggle, onDelete }) {
  const done = duty.status === "DONE";
  return (
    <article className={`vp-duty ${done ? "vp-duty--done" : ""} ${isMine ? "vp-duty--mine" : ""}`}>
      <div className="vp-duty-top">
        <label className="vp-check">
          <input
            type="checkbox"
            checked={done}
            disabled={!canToggle || busy}
            onChange={onToggle}
            aria-label={done ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}
          />
          <span className="vp-duty-title">{duty.title}</span>
        </label>
        {canDelete && (
          <button
            type="button"
            className="vp-icon-btn vp-icon-btn--sm"
            aria-label="Xóa công việc"
            onClick={onDelete}
          >
            ×
          </button>
        )}
      </div>
      <div className="vp-duty-meta">
        <Avatar user={{ fullName: duty.assignee, avatar: duty.avatar }} size={22} />
        <span className="vp-duty-who">{isMine ? "Bạn" : duty.assignee}</span>
        <span className="vp-duty-time">
          {duty.time?.type === "range" ? `${duty.time.from}–${duty.time.to}` : "Trong ngày"}
        </span>
      </div>
      {duty.note && <p className="vp-duty-note">{duty.note}</p>}
    </article>
  );
}

function Dialog({ title, children, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="db-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="db-dialog vp-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h3 className="db-dialog-title">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// Khung giờ: để trống cả hai = trong ngày
function TimeFields({ value, onChange }) {
  return (
    <div className="vp-field-row">
      <label className="vp-field">
        <span>Từ giờ</span>
        <input type="time" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      </label>
      <label className="vp-field">
        <span>Đến giờ</span>
        <input type="time" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} />
      </label>
    </div>
  );
}

function useSubmit(action, onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onDone(await action());
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

function AssignDialog({ members, defaultDate, onCancel, onDone }) {
  const [form, setForm] = useState({
    title: "",
    assigneeId: members[0]?._id ?? "",
    date: defaultDate,
    note: "",
  });
  const [time, setTime] = useState({ from: "", to: "" });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const { busy, error, submit } = useSubmit(
    () => createDuty({ ...form, ...time }),
    onDone,
  );

  return (
    <Dialog title="Giao việc" onCancel={onCancel}>
      <form className="vp-form" onSubmit={submit}>
        <label className="vp-field">
          <span>Tên công việc</span>
          <input value={form.title} onChange={set("title")} placeholder="VD: Đổ rác" maxLength={100} required autoFocus />
        </label>
        <div className="vp-field-row">
          <label className="vp-field">
            <span>Người làm</span>
            <select value={form.assigneeId} onChange={set("assigneeId")}>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="vp-field">
            <span>Ngày</span>
            <input type="date" value={form.date} onChange={set("date")} required />
          </label>
        </div>
        <TimeFields value={time} onChange={setTime} />
        <label className="vp-field">
          <span>Ghi chú (không bắt buộc)</span>
          <input value={form.note} onChange={set("note")} maxLength={300} />
        </label>
        {error && <p className="vp-form-error">{error}</p>}
        <div className="db-dialog-actions">
          <button className="db-btn db-btn--ghost db-btn--sm" type="button" onClick={onCancel}>
            Hủy
          </button>
          <button className="db-btn db-btn--sm" type="submit" disabled={busy}>
            {busy ? "Đang lưu…" : "Giao việc"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function RotationDialog({ members, defaultDate, onCancel, onDone }) {
  const [form, setForm] = useState({ title: "", startDate: defaultDate, days: 7 });
  const [time, setTime] = useState({ from: "", to: "" });
  const [picked, setPicked] = useState(() => members.map((m) => m._id));
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Giữ thứ tự theo danh sách thành viên
  const order = members.filter((m) => picked.includes(m._id));
  const togglePick = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const { busy, error, submit } = useSubmit(
    () =>
      createRotation({
        ...form,
        ...time,
        days: Number(form.days),
        memberIds: order.map((m) => m._id),
      }),
    onDone,
  );

  return (
    <Dialog title="Xếp lịch xoay vòng" onCancel={onCancel}>
      <form className="vp-form" onSubmit={submit}>
        <label className="vp-field">
          <span>Tên công việc</span>
          <input value={form.title} onChange={set("title")} placeholder="VD: Rửa chén" maxLength={100} required autoFocus />
        </label>
        <div className="vp-field-row">
          <label className="vp-field">
            <span>Bắt đầu từ</span>
            <input type="date" value={form.startDate} onChange={set("startDate")} required />
          </label>
          <label className="vp-field">
            <span>Số ngày</span>
            <input type="number" min={1} max={31} value={form.days} onChange={set("days")} required />
          </label>
        </div>
        <TimeFields value={time} onChange={setTime} />
        <fieldset className="vp-field vp-pick">
          <span>Người trực (lần lượt theo thứ tự)</span>
          {members.map((m) => (
            <label key={m._id} className="vp-pick-item">
              <input type="checkbox" checked={picked.includes(m._id)} onChange={() => togglePick(m._id)} />
              <Avatar user={m} size={24} />
              {m.fullName}
              {picked.includes(m._id) && (
                <span className="vp-pick-order">{order.findIndex((o) => o._id === m._id) + 1}</span>
              )}
            </label>
          ))}
        </fieldset>
        {error && <p className="vp-form-error">{error}</p>}
        <div className="db-dialog-actions">
          <button className="db-btn db-btn--ghost db-btn--sm" type="button" onClick={onCancel}>
            Hủy
          </button>
          <button className="db-btn db-btn--sm" type="submit" disabled={busy || order.length === 0}>
            {busy ? "Đang tạo…" : `Tạo ${form.days || 0} ngày`}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
