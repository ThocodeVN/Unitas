import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { formatVND } from "../utils/format";
import { getDashboardSummary } from "../services/dashboardApi";

const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long" }).format(
  new Date(),
);

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDueDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function daysUntil(payment) {
  if (Number.isFinite(payment.daysLeft)) return payment.daysLeft;
  if (!payment.dueDate) return null;
  const dueDate = new Date(payment.dueDate);
  if (Number.isNaN(dueDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate - today) / 86_400_000);
}

function DueRow({ payment }) {
  const left = daysUntil(payment);
  const overdue = left !== null && left < 0;
  const subtitle = overdue
    ? `quá hạn ${Math.abs(left)} ngày`
    : left === 0
      ? "hạn hôm nay"
      : payment.dueDate
        ? `hạn ${formatDueDate(payment.dueDate)}`
        : left !== null
          ? `còn ${left} ngày`
          : "chưa có hạn đóng";

  return (
    <div className="db-row db-due-row">
      <div className="db-av db-sm">{payment.initials || initials(payment.name)}</div>
      <div className="db-t">
        <b>{payment.name || "Thành viên"}</b>
        <small>
          {payment.item || "Khoản đóng"} · {subtitle}
        </small>
      </div>
      <span className="db-amt">{formatVND(payment.amount)}</span>
      <span className={`db-chip ${overdue ? "b" : "w"}`}>
        {overdue
          ? "Quá hạn"
          : left === null
            ? "Chưa rõ hạn"
            : left === 0
              ? "Đến hạn"
              : `Còn ${left} ngày`}
      </span>
    </div>
  );
}

function DutyTime({ time }) {
  if (time?.type === "range" || (time?.from && time?.to)) {
    return (
      <span className="db-time">
        {time.from} – {time.to}
      </span>
    );
  }
  return <span className="db-time any">Trong ngày</span>;
}

export default function Dashboard() {
  const { me, room, isTreasurer } = useOutletContext();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getDashboardSummary()
      .then((data) => {
        if (active) {
          setSummary(data);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const fundBalance = summary?.fundBalance ?? room.fundBalance;
  const firstName = me?.fullName?.trim().split(/\s+/).pop() || "bạn";
  const collected = summary?.collected;
  const spent = summary?.spent;
  const dueSoon = Array.isArray(summary?.dueSoon) ? summary.dueSoon : null;
  const duties = Array.isArray(summary?.duties) ? summary.duties : null;
  const hasCollected = Number.isFinite(collected?.amount);
  const hasSpent = Number.isFinite(spent?.amount);
  const hasTarget = Number.isFinite(collected?.target) && collected.target > 0;
  const progress =
    hasTarget && hasCollected
      ? Math.min(100, Math.round((collected.amount / collected.target) * 100))
      : 0;

  return (
    <>
      <section className="db-welcome">
        <div>
          <p className="db-eyebrow">Tổng quan phòng</p>
          <h2 className="db-welcome-title">Xin chào, {firstName}</h2>
          <p className="db-hello">
            Tình hình hiện tại của <strong>{room.roomName}</strong>.
          </p>
        </div>
      </section>

      {error && (
        <div className="db-inline-alert" role="status">
          Chưa tải được bản tổng hợp mới nhất. Đang hiển thị dữ liệu phòng vừa
          tải. {error}{" "}
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      )}

      <section className="db-grid3" aria-label="Chỉ số phòng">
        <article className="db-card db-fund">
          <div className="db-lbl">Quỹ phòng hiện có</div>
          <div className="db-big">{formatVND(fundBalance)}</div>
          <div className="db-card-foot">Số dư được lưu trong hồ sơ phòng</div>
        </article>
        <article className="db-card">
          <div className="db-lbl">Đã thu {monthLabel}</div>
          {hasCollected ? (
            <>
              <div className="db-big">{formatVND(collected.amount)}</div>
              {hasTarget && (
                <div className="db-bar">
                  <i style={{ width: `${progress}%` }} />
                </div>
              )}
              <div className="db-meta">
                {hasTarget
                  ? `Mục tiêu ${formatVND(collected.target)}`
                  : "Chưa đặt mục tiêu thu"}
                {Number.isFinite(collected.paid) && (
                  <>
                    {" · "}
                    {collected.paid}/
                    {Number.isFinite(collected.members)
                      ? collected.members
                      : room.listMember?.length ?? 0}{" "}
                    thành viên đã đóng
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="db-unavailable">Chưa có dữ liệu thu tháng này.</div>
          )}
        </article>
        <article className="db-card">
          <div className="db-lbl">Đã chi {monthLabel}</div>
          {hasSpent ? (
            <div className="db-big">{formatVND(spent.amount)}</div>
          ) : (
            <div className="db-unavailable">Chưa có dữ liệu chi tháng này.</div>
          )}
        </article>
      </section>

      <section className="db-grid2">
        <article className="db-card">
          <h2 className="db-section-title">
            {isTreasurer ? "Sắp đến hạn đóng tiền" : "Khoản bạn sắp đến hạn"}
            <Link className="db-link" to="/khoan-dong">
              Xem tất cả
            </Link>
          </h2>
          {dueSoon === null ? (
            <div className="db-empty">Chưa có dữ liệu khoản đóng.</div>
          ) : dueSoon.length === 0 ? (
            <div className="db-empty">
              {isTreasurer
                ? "Chưa có khoản nào sắp đến hạn."
                : "Bạn không có khoản nào sắp đến hạn."}
            </div>
          ) : (
            dueSoon.map((payment) => (
              <DueRow key={payment.id || payment._id} payment={payment} />
            ))
          )}
        </article>

        <article className="db-card">
          <h2 className="db-section-title">Lịch trực phòng hôm nay</h2>
          {duties === null ? (
            <div className="db-empty">Chưa có dữ liệu lịch trực.</div>
          ) : duties.length === 0 ? (
            <div className="db-empty">Hôm nay không có lịch trực.</div>
          ) : (
            duties.map((duty) => (
              <div className="db-row" key={duty.id || duty._id}>
                <div className="db-av db-sm">
                  {duty.initials || initials(duty.assignee)}
                </div>
                <div className="db-t">
                  <b>{duty.assignee || duty.name}</b>
                  <small>{duty.title || duty.task}</small>
                </div>
                <DutyTime time={duty.time} />
              </div>
            ))
          )}
        </article>
      </section>
    </>
  );
}
