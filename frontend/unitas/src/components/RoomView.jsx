import { useState } from "react";
import Avatar from "./Avatar";
import ConfirmDialog from "./ConfirmDialog";
import QrDialog from "./QrDialog";
import {
  approveMember,
  rejectMember,
  transferTreasurer,
  leaveRoom,
} from "../services/roomApi";

const ROLE_LABEL = {
  TREASURER: "Thủ quỹ",
  MEMBER: "Thành viên",
  NONE: "Chưa có phòng",
};

const money = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    n || 0,
  );

const same = (a, b) => String(a) === String(b);

const COMING = [
  {
    title: "Quỹ chung",
    text: "Theo dõi thu chi và khai báo khoản chi của cả phòng.",
  },
  {
    title: "Khoản đóng",
    text: "Các khoản đóng định kỳ, hạn thanh toán và ai đã đóng.",
  },
  { title: "Lịch trực phòng", text: "Phân công trực nhật, đổ rác, dọn dẹp." },
];

const QrIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <path d="M14 14h2v2h-2zM18 14h2M14 18h2v2M18 18v2h2" />
  </svg>
);

export default function RoomView({ room, user, onChange, onLeft }) {
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const members = room.listMember || [];
  const requests = room.pendingMembers || [];
  const me = members.find((m) => same(m._id, user._id));
  const myRole = me?.roleInRoom || "MEMBER";
  const isTreasurer = myRole === "TREASURER";
  const others = members.filter((m) => !same(m._id, user._id));
  const sorted = [...members].sort(
    (a, b) => (b.roleInRoom === "TREASURER") - (a.roleInRoom === "TREASURER"),
  );
  const created = room.createDate
    ? new Date(room.createDate).toLocaleDateString("vi-VN")
    : "";
  const blockedLeave = isTreasurer && others.length > 0;
  // Liên kết mời: mở ra sẽ tự điền mã mời sau khi đăng nhập
  const inviteLink = `${window.location.origin}/?join=${room.inviteCode}`;

  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };

  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      setError("");
      notify(message);
    } catch {
      setError("Không sao chép được, hãy bôi đen và copy thủ công.");
    }
  };

  // Chạy một thao tác trả về phòng mới
  const run = async (action, message) => {
    setBusy(true);
    setError("");
    try {
      onChange(await action());
      if (message) notify(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setDialog(null);
    }
  };

  const leave = async () => {
    setBusy(true);
    setError("");
    try {
      await leaveRoom();
      onLeft();
      return;
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
    setDialog(null);
  };

  return (
    <>
      <section className="db-hero">
        <p className="db-eyebrow">Phòng của bạn</p>
        <h1 className="db-title">{room.roomName}</h1>
        <p className="db-meta">
          {created && <>Tạo ngày {created} · </>}
          {members.length} thành viên
        </p>
      </section>

      {error && (
        <div className="db-alert" role="alert">
          {error}
        </div>
      )}

      <section className="db-stats">
        <div className="db-stat">
          <span className="db-stat-label">Quỹ phòng</span>
          <span className="db-stat-value db-stat-value--accent">
            {money(room.fundBalance)}
          </span>
        </div>
        <div className="db-stat">
          <span className="db-stat-label">Thành viên</span>
          <span className="db-stat-value">{members.length}</span>
        </div>
        <div className="db-stat">
          <span className="db-stat-label">Vai trò của bạn</span>
          <span className="db-stat-value">{ROLE_LABEL[myRole]}</span>
        </div>
        {isTreasurer && (
          <div className="db-stat">
            <span className="db-stat-label">Yêu cầu chờ duyệt</span>
            <span className="db-stat-value">{requests.length}</span>
          </div>
        )}
      </section>

      <div className="db-cols">
        <section className="db-card">
          <div className="db-card-head">
            <h2 className="db-card-title">Thành viên</h2>
            <span className="db-count">{members.length}</span>
          </div>
          <ul className="db-members">
            {sorted.map((m) => {
              const isMe = same(m._id, user._id);
              return (
                <li className="db-member" key={m._id}>
                  <Avatar
                    user={
                      isMe
                        ? { ...m, avatar: user.avatar, fullName: user.fullName }
                        : m
                    }
                    size={42}
                  />
                  <div className="db-member-info">
                    <span className="db-member-name">
                      {m.fullName}
                      {isMe && <span className="db-you">Bạn</span>}
                    </span>
                    <span className="db-member-sub">@{m.username}</span>
                  </div>
                  <span
                    className={`db-badge ${m.roleInRoom === "TREASURER" ? "db-badge--gold" : ""}`}
                  >
                    {ROLE_LABEL[m.roleInRoom] || ROLE_LABEL.MEMBER}
                  </span>
                  {isTreasurer && !isMe && (
                    <button
                      className="db-btn db-btn--ghost db-btn--sm"
                      type="button"
                      disabled={busy}
                      onClick={() => setDialog({ type: "transfer", member: m })}
                    >
                      Chuyển quyền
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="db-stack">
          <section className="db-card">
            <h2 className="db-card-title">Mời thành viên</h2>
            <p className="db-card-sub">
              Gửi mã này hoặc cho bạn cùng phòng quét mã QR. Người vào phòng sẽ
              chờ thủ quỹ duyệt.
            </p>
            <div className="db-code-box">{room.inviteCode}</div>
            <div className="db-btn-row">
              <button
                className="db-btn db-btn--sm"
                type="button"
                onClick={() => copy(room.inviteCode, "Đã sao chép mã mời")}
              >
                Sao chép
              </button>
              <button
                className="db-btn db-btn--ghost db-btn--sm db-btn-icon"
                type="button"
                onClick={() => setDialog({ type: "qr" })}
              >
                <QrIcon /> Hiện mã QR
              </button>
            </div>
          </section>

          {isTreasurer && (
            <section className="db-card">
              <div className="db-card-head">
                <h2 className="db-card-title">Yêu cầu tham gia</h2>
                <span className="db-count">{requests.length}</span>
              </div>
              {requests.length === 0 ? (
                <p className="db-empty">Không có yêu cầu nào đang chờ.</p>
              ) : (
                <ul className="db-members">
                  {requests.map((p) => (
                    <li className="db-member" key={p._id}>
                      <Avatar user={p} size={38} />
                      <div className="db-member-info">
                        <span className="db-member-name">{p.fullName}</span>
                        <span className="db-member-sub">@{p.username}</span>
                      </div>
                      <div className="db-request-actions">
                        <button
                          className="db-btn db-btn--outline-danger db-btn--sm"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setDialog({ type: "reject", member: p })
                          }
                        >
                          Từ chối
                        </button>
                        <button
                          className="db-btn db-btn--sm"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(
                              () => approveMember(room._id, p._id),
                              `Đã duyệt ${p.fullName}`,
                            )
                          }
                        >
                          Duyệt
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <section className="db-soon">
        {COMING.map((item) => (
          <div className="db-soon-item" key={item.title}>
            <span className="db-badge">Sắp ra mắt</span>
            <h3 className="db-soon-title">{item.title}</h3>
            <p className="db-soon-text">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="db-danger">
        {blockedLeave && (
          <p className="db-note">
            Bạn đang là thủ quỹ. Hãy chuyển quyền thủ quỹ cho người khác trước
            khi rời phòng.
          </p>
        )}
        <button
          className="db-btn db-btn--outline-danger"
          type="button"
          disabled={blockedLeave || busy}
          onClick={() => setDialog({ type: "leave" })}
        >
          Rời phòng
        </button>
      </section>

      {dialog?.type === "qr" && (
        <QrDialog
          room={room}
          link={inviteLink}
          onCopy={copy}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === "transfer" && (
        <ConfirmDialog
          title="Chuyển quyền thủ quỹ?"
          confirmLabel="Chuyển quyền"
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={() =>
            run(
              () => transferTreasurer(room._id, dialog.member._id),
              `${dialog.member.fullName} là thủ quỹ mới`,
            )
          }
        >
          Bạn sẽ trở thành thành viên thường, còn{" "}
          <strong>{dialog.member.fullName}</strong> sẽ là thủ quỹ mới của phòng.
        </ConfirmDialog>
      )}

      {dialog?.type === "reject" && (
        <ConfirmDialog
          title="Từ chối yêu cầu?"
          confirmLabel="Từ chối"
          danger
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={() =>
            run(
              () => rejectMember(room._id, dialog.member._id),
              "Đã từ chối yêu cầu",
            )
          }
        >
          <strong>{dialog.member.fullName}</strong> sẽ không vào được phòng. Họ
          có thể gửi yêu cầu lại bằng mã mời.
        </ConfirmDialog>
      )}

      {dialog?.type === "leave" && (
        <ConfirmDialog
          title="Rời phòng?"
          confirmLabel="Rời phòng"
          danger
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={leave}
        >
          {isTreasurer && others.length === 0
            ? "Bạn là người cuối cùng trong phòng. Rời đi sẽ xóa phòng này."
            : "Bạn sẽ không còn xem được quỹ và lịch của phòng này nữa."}
        </ConfirmDialog>
      )}

      {toast && (
        <div className="db-toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
