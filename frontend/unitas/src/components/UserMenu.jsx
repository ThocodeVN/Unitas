import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Avatar from "./Avatar";
import AvatarDialog from "./AvatarDialog";
import { ProfileDialog, PasswordDialog } from "./ProfileDialogs";

const ROLE_LABEL = { TREASURER: "Thủ quỹ", MEMBER: "Thành viên" };

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const ChevronIcon = () => (
  <svg className="um-chevron" {...svgProps}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const CameraIcon = () => (
  <svg {...svgProps}>
    <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
const UserIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
  </svg>
);
const LockIcon = () => (
  <svg {...svgProps}>
    <rect x="5" y="11" width="14" height="9" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
const LogoutIcon = () => (
  <svg {...svgProps}>
    <path d="M10 5H6v14h4" />
    <path d="m14 8 4 4-4 4" />
    <path d="M18 12H9" />
  </svg>
);

export default function UserMenu({ user, role, onLogout, onUserChange }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // "avatar" | "profile" | "password"
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openDialog = (name) => {
    setOpen(false);
    setDialog(name);
  };
  const openAvatar = () => openDialog("avatar");
  const closeDialog = () => setDialog(null);

  // Gộp vào user cũ để giữ các trường API không trả lại (vd hasPassword)
  const applyUser = (updated) => onUserChange({ ...user, ...updated });

  const logout = async () => {
    setBusy(true);
    await onLogout();
  };

  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("vi-VN")
    : "";

  return (
    <>
      <div className="um" ref={ref}>
        <button
          type="button"
          className="um-trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Avatar user={user} size={34} />
          <span className="um-name">{user.fullName}</span>
          <ChevronIcon />
        </button>

        {open && (
          <div className="um-panel" role="menu">
            <div className="um-profile">
              <div className="um-avatar-wrap">
                <Avatar user={user} size={72} />
                <button
                  type="button"
                  className="um-edit"
                  aria-label="Đổi ảnh đại diện"
                  onClick={openAvatar}
                >
                  <CameraIcon />
                </button>
              </div>
              <span className="um-fullname">{user.fullName}</span>
              <span className="um-email">{user.email}</span>
              {role && (
                <span
                  className={`db-badge um-role ${role === "TREASURER" ? "db-badge--gold" : ""}`}
                >
                  {ROLE_LABEL[role]}
                </span>
              )}
            </div>

            <dl className="um-info">
              <div className="um-row">
                <dt>Tên đăng nhập</dt>
                <dd>@{user.username}</dd>
              </div>
              <div className="um-row">
                <dt>Số điện thoại</dt>
                <dd>{user.phone || "Chưa cập nhật"}</dd>
              </div>
              <div className="um-row">
                <dt>Phòng</dt>
                <dd>{role ? ROLE_LABEL[role] : "Chưa tham gia"}</dd>
              </div>
              {joined && (
                <div className="um-row">
                  <dt>Tham gia từ</dt>
                  <dd>{joined}</dd>
                </div>
              )}
            </dl>

            <div className="um-actions">
              <button
                type="button"
                className="um-item"
                role="menuitem"
                onClick={openAvatar}
              >
                <CameraIcon /> Đổi ảnh đại diện
              </button>
              <button
                type="button"
                className="um-item"
                role="menuitem"
                onClick={() => openDialog("profile")}
              >
                <UserIcon /> Chỉnh sửa hồ sơ
              </button>
              <button
                type="button"
                className="um-item"
                role="menuitem"
                onClick={() => openDialog("password")}
              >
                <LockIcon /> Đổi mật khẩu
              </button>
              <button
                type="button"
                className="um-item um-item--danger"
                role="menuitem"
                disabled={busy}
                onClick={logout}
              >
                <LogoutIcon /> {busy ? "Đang đăng xuất…" : "Đăng xuất"}
              </button>
            </div>
          </div>
        )}
      </div>

      {dialog === "avatar" &&
        createPortal(
          <AvatarDialog
            user={user}
            onClose={closeDialog}
            onSaved={(updated) => {
              applyUser(updated);
              closeDialog();
            }}
          />,
          document.body,
        )}

      {dialog === "profile" &&
        createPortal(
          <ProfileDialog
            user={user}
            onClose={closeDialog}
            onSaved={(updated) => {
              applyUser(updated);
              closeDialog();
            }}
          />,
          document.body,
        )}

      {/* Đổi mật khẩu tự hiện màn "Đã đổi" rồi người dùng bấm Xong mới đóng */}
      {dialog === "password" &&
        createPortal(
          <PasswordDialog
            user={user}
            onClose={closeDialog}
            onSaved={applyUser}
          />,
          document.body,
        )}
    </>
  );
}
