import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import QrDialog from "../components/QrDialog";
import { leaveRoom } from "../services/roomApi";
import { formatVND } from "../utils/format";

export default function RoomSettings() {
  const { me, room, onLeft } = useOutletContext();
  const [dialog, setDialog] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const inviteLink = `${window.location.origin}/?join=${room.inviteCode}`;
  const members = room.listMember || [];
  const hasOtherMembers = members.some(
    (member) => String(member._id) !== String(me._id),
  );

  const copy = async (value, message) => {
    try {
      await navigator.clipboard.writeText(value);
      setError("");
      setToast(message);
      window.setTimeout(() => setToast(""), 2200);
    } catch {
      setError("Không sao chép được. Hãy chọn và sao chép mã mời thủ công.");
    }
  };

  const leave = async () => {
    setBusy(true);
    setError("");
    try {
      await leaveRoom();
      onLeft();
    } catch (err) {
      setError(err.message);
      setBusy(false);
      setDialog(false);
    }
  };

  return (
    <>
      <section className="db-welcome">
        <div>
          <p className="db-eyebrow">Quản lý</p>
          <h2 className="db-welcome-title">Cài đặt phòng</h2>
          <p className="db-hello">Thông tin và mã mời của {room.roomName}.</p>
        </div>
      </section>

      {error && (
        <div className="db-inline-alert" role="alert">
          {error}
        </div>
      )}

      <div className="db-grid2">
        <section className="db-card">
          <h2>Thông tin phòng</h2>
          <dl className="db-settings-list">
            <div>
              <dt>Tên phòng</dt>
              <dd>{room.roomName}</dd>
            </div>
            <div>
              <dt>Ngày tạo</dt>
              <dd>
                {room.createDate
                  ? new Date(room.createDate).toLocaleDateString("vi-VN")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Số dư quỹ</dt>
              <dd>{formatVND(room.fundBalance)}</dd>
            </div>
            <div>
              <dt>Thành viên</dt>
              <dd>{members.length}</dd>
            </div>
          </dl>
        </section>

        <section className="db-card">
          <h2>Mời thành viên</h2>
          <p className="db-card-copy">
            Người dùng gửi yêu cầu bằng mã này sẽ được đưa vào danh sách chờ
            duyệt.
          </p>
          <div className="db-code-box">{room.inviteCode}</div>
          <div className="db-btn-row">
            <button
              className="db-btn db-btn--sm"
              type="button"
              onClick={() => copy(room.inviteCode, "Đã sao chép mã mời")}
            >
              Sao chép mã
            </button>
            <button
              className="db-btn db-btn--ghost db-btn--sm"
              type="button"
              onClick={() => setShowQr(true)}
            >
              Hiện mã QR
            </button>
            <button
              className="db-btn db-btn--ghost db-btn--sm"
              type="button"
              onClick={() => copy(inviteLink, "Đã sao chép liên kết mời")}
            >
              Sao chép liên kết
            </button>
          </div>
        </section>
      </div>

      <section className="db-card db-danger">
        <div>
          <h2>Rời phòng</h2>
          <p className="db-card-copy">
            {hasOtherMembers
              ? "Hãy chuyển quyền thủ quỹ cho thành viên khác trước khi rời phòng."
              : "Bạn là người cuối cùng trong phòng. Rời đi sẽ xóa phòng này."}
          </p>
        </div>
        <button
          className="db-btn db-btn--outline-danger"
          type="button"
          disabled={hasOtherMembers || busy}
          onClick={() => setDialog(true)}
        >
          Rời phòng
        </button>
      </section>

      {dialog && (
        <ConfirmDialog
          title="Rời phòng?"
          confirmLabel="Rời phòng"
          danger
          busy={busy}
          onCancel={() => setDialog(false)}
          onConfirm={leave}
        >
          Phòng sẽ bị xóa vì bạn là thành viên cuối cùng.
        </ConfirmDialog>
      )}

      {showQr && (
        <QrDialog
          room={room}
          link={inviteLink}
          onCopy={copy}
          onClose={() => setShowQr(false)}
        />
      )}
      {toast && (
        <div className="db-toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
