import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import Avatar from "../components/Avatar";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  approveMember,
  rejectMember,
  transferTreasurer,
} from "../services/roomApi";

const ROLE_LABEL = { TREASURER: "Thủ quỹ", MEMBER: "Thành viên" };
const same = (a, b) => String(a) === String(b);

export default function RoomMembers() {
  const { me, room, onRoomChange } = useOutletContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const members = room.listMember || [];
  const requests = room.pendingMembers || [];

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      onRoomChange(await action());
      setDialog(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="db-welcome">
        <div>
          <p className="db-eyebrow">Phòng của bạn</p>
          <h2 className="db-welcome-title">Thành viên</h2>
          <p className="db-hello">
            {members.length} thành viên trong {room.roomName}.
          </p>
        </div>
      </section>

      {error && (
        <div className="db-inline-alert" role="alert">
          {error}
        </div>
      )}

      <div className="db-grid2 db-member-panels">
        <section className="db-card">
          <div className="db-card-heading">
            <h2>Danh sách thành viên</h2>
            <span className="db-status">{members.length} người</span>
          </div>
          <ul className="db-members">
            {members.map((member) => {
              const isMe = same(member._id, me._id);
              return (
                <li className="db-member" key={member._id}>
                  <Avatar
                    user={
                      isMe
                        ? { ...member, avatar: me.avatar, fullName: me.fullName }
                        : member
                    }
                    size={40}
                  />
                  <div className="db-member-info">
                    <span className="db-member-name">
                      {member.fullName}
                      {isMe && <span className="db-you">Bạn</span>}
                    </span>
                    <span className="db-member-sub">@{member.username}</span>
                  </div>
                  <span
                    className={`db-badge ${member.roleInRoom === "TREASURER" ? "db-badge--gold" : ""}`}
                  >
                    {ROLE_LABEL[member.roleInRoom] || "Thành viên"}
                  </span>
                  {!isMe && (
                    <button
                      className="db-btn db-btn--ghost db-btn--sm"
                      type="button"
                      disabled={busy}
                      onClick={() => setDialog({ type: "transfer", member })}
                    >
                      Chuyển quyền
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="db-card">
          <div className="db-card-heading">
            <h2>Yêu cầu tham gia</h2>
            <span className="db-status">{requests.length} đang chờ</span>
          </div>
          {requests.length === 0 ? (
            <p className="db-empty">Không có yêu cầu nào đang chờ duyệt.</p>
          ) : (
            <ul className="db-members">
              {requests.map((request) => (
                <li className="db-member" key={request._id}>
                  <Avatar user={request} size={38} />
                  <div className="db-member-info">
                    <span className="db-member-name">{request.fullName}</span>
                    <span className="db-member-sub">@{request.username}</span>
                  </div>
                  <div className="db-request-actions">
                    <button
                      className="db-btn db-btn--outline-danger db-btn--sm"
                      type="button"
                      disabled={busy}
                      onClick={() => setDialog({ type: "reject", member: request })}
                    >
                      Từ chối
                    </button>
                    <button
                      className="db-btn db-btn--sm"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(() => approveMember(room._id, request._id))
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
      </div>

      {dialog?.type === "transfer" && (
        <ConfirmDialog
          title="Chuyển quyền thủ quỹ?"
          confirmLabel="Chuyển quyền"
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={() =>
            run(() => transferTreasurer(room._id, dialog.member._id))
          }
        >
          Bạn sẽ trở thành thành viên thường, còn{" "}
          <strong>{dialog.member.fullName}</strong> sẽ quản lý phòng.
        </ConfirmDialog>
      )}

      {dialog?.type === "reject" && (
        <ConfirmDialog
          title="Từ chối yêu cầu?"
          confirmLabel="Từ chối"
          danger
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={() => run(() => rejectMember(room._id, dialog.member._id))}
        >
          <strong>{dialog.member.fullName}</strong> sẽ không được tham gia phòng.
        </ConfirmDialog>
      )}
    </>
  );
}
