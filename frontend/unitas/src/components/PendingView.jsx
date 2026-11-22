import { useState } from "react";
import { cancelJoin, getMyRoom } from "../services/roomApi";

export default function PendingView({ pending, onCancelled, onApproved }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const run = async (kind, action) => {
    setBusy(kind);
    setError("");
    setInfo("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
      setBusy("");
    }
  };

  const cancel = () =>
    run("cancel", async () => {
      await cancelJoin();
      onCancelled();
    });

  const recheck = () =>
    run("check", async () => {
      const data = await getMyRoom();
      if (data.room) {
        onApproved(data.room);
        return;
      }
      setInfo("Thủ quỹ chưa duyệt yêu cầu của bạn. Hãy thử lại sau.");
      setBusy("");
    });

  return (
    <div className="db-card db-pending">
      <div className="db-icon db-icon--center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </div>
      <h1 className="db-card-title db-card-title--lg">
        Đang chờ thủ quỹ duyệt
      </h1>
      <p className="db-card-sub">
        Yêu cầu tham gia <strong>{pending.roomName}</strong> đã được gửi. Bạn sẽ
        vào được phòng ngay khi thủ quỹ đồng ý.
      </p>

      {info && (
        <div className="db-info" role="status">
          {info}
        </div>
      )}
      {error && (
        <div className="db-alert" role="alert">
          {error}
        </div>
      )}

      <div className="db-btn-row db-btn-row--center">
        <button
          className="db-btn"
          type="button"
          disabled={!!busy}
          onClick={recheck}
        >
          {busy === "check" ? "Đang kiểm tra…" : "Kiểm tra lại"}
        </button>
        <button
          className="db-btn db-btn--ghost"
          type="button"
          disabled={!!busy}
          onClick={cancel}
        >
          {busy === "cancel" ? "Đang hủy…" : "Hủy yêu cầu"}
        </button>
      </div>
    </div>
  );
}
