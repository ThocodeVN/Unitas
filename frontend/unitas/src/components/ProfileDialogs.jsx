import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import { updateProfile, changePassword } from "../services/profileApi";
import "../styles/profileDialogs.css";

// Cùng quy tắc với backend (authController)
const PHONE_RE = /^(0|\+84)\d{9}$/;
const USERNAME_RE = /^[a-z0-9_.]{4,30}$/;

/* ---------------- Khung chung ---------------- */

function Shell({ id, title, subtitle, busy, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="db-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="pf-dialog" role="dialog" aria-modal="true" aria-labelledby={id}>
        <header className="pf-head">
          <div>
            <h3 id={id} className="pf-title">
              {title}
            </h3>
            {subtitle && <p className="pf-sub">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="pf-close"
            aria-label="Đóng"
            disabled={busy}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function Field({ id, label, optional, error, prefix, type = "text", children, ...props }) {
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="pf-field">
      <label htmlFor={id}>
        {label}
        {optional && <span className="pf-optional"> · không bắt buộc</span>}
      </label>
      <div className={`pf-input ${error ? "is-invalid" : ""}`}>
        {prefix && <span className="pf-prefix">{prefix}</span>}
        <input
          id={id}
          type={isPassword && shown ? "text" : type}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-err` : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="pf-eye"
            aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onClick={() => setShown((s) => !s)}
          >
            {shown ? "Ẩn" : "Hiện"}
          </button>
        )}
      </div>
      {children}
      {error && (
        <span id={`${id}-err`} className="pf-err" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function Footer({ busy, disabled, label, busyLabel, onClose }) {
  return (
    <footer className="pf-foot">
      <button className="pf-btn pf-btn--ghost" type="button" disabled={busy} onClick={onClose}>
        Hủy
      </button>
      <button className="pf-btn" type="submit" disabled={busy || disabled}>
        {busy ? busyLabel : label}
      </button>
    </footer>
  );
}

/* ---------------- Chỉnh sửa hồ sơ ---------------- */

export function ProfileDialog({ user, onSaved, onClose }) {
  const initial = {
    fullName: user.fullName || "",
    username: user.username || "",
    phone: user.phone || "",
  };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: "" });
  };

  const normalized = {
    fullName: form.fullName.trim(),
    username: form.username.trim().toLowerCase(),
    phone: form.phone.replace(/\s/g, ""),
  };
  // Chỉ gửi những trường đã đổi
  const changes = Object.fromEntries(
    Object.entries(normalized).filter(([k, v]) => v !== initial[k]),
  );
  const changed = Object.keys(changes).length > 0;

  const validate = () => {
    const e = {};
    if (normalized.fullName.length < 2 || normalized.fullName.length > 100)
      e.fullName = "Họ và tên từ 2 đến 100 ký tự";
    if (!USERNAME_RE.test(normalized.username))
      e.username = "4–30 ký tự: chữ thường, số, dấu _ hoặc dấu chấm";
    if (normalized.phone && !PHONE_RE.test(normalized.phone))
      e.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0 hoặc +84";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean) || !changed) return;

    setBusy(true);
    setError("");
    try {
      onSaved(await updateProfile(changes));
    } catch (err) {
      setErrors(err.fields || {});
      if (!Object.keys(err.fields || {}).length) setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Shell
      id="pf-title"
      title="Chỉnh sửa hồ sơ"
      subtitle="Thông tin này hiển thị với các thành viên trong phòng."
      busy={busy}
      onClose={onClose}
    >
      <form className="pf-body" onSubmit={submit} noValidate>
        <div className="pf-identity">
          <Avatar user={{ ...user, fullName: normalized.fullName || user.fullName }} size={44} />
          <div className="pf-identity-text">
            <strong>{normalized.fullName || user.fullName}</strong>
            <span>{user.email}</span>
          </div>
        </div>

        <Field
          id="pf-fullName"
          label="Họ và tên"
          value={form.fullName}
          onChange={set("fullName")}
          error={errors.fullName}
          maxLength={100}
          autoComplete="name"
          autoFocus
        />
        <Field
          id="pf-username"
          label="Tên đăng nhập"
          prefix="@"
          value={form.username}
          onChange={set("username")}
          error={errors.username}
          maxLength={30}
          autoComplete="username"
          spellCheck={false}
        />
        <Field
          id="pf-phone"
          label="Số điện thoại"
          optional
          type="tel"
          value={form.phone}
          onChange={set("phone")}
          error={errors.phone}
          placeholder="0912 345 678"
          autoComplete="tel"
        />
        {error && (
          <div className="pf-alert" role="alert">
            {error}
          </div>
        )}
        <Footer
          busy={busy}
          disabled={!changed}
          label="Lưu thay đổi"
          busyLabel="Đang lưu…"
          onClose={onClose}
        />
      </form>
    </Shell>
  );
}

/* ---------------- Đổi / đặt mật khẩu ---------------- */

// 1-4 theo độ dài, chữ hoa + thường, số + ký tự đặc biệt
function strength(pw) {
  if (!pw) return 0;
  let s = 1;
  if (pw.length >= 12) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s += 1;
  return pw.length < 8 ? 1 : Math.min(4, s);
}
const STRENGTH_LABEL = ["", "Yếu", "Tạm được", "Khá", "Mạnh"];

export function PasswordDialog({ user, onSaved, onClose }) {
  // Chốt lúc mở: tài khoản Google chưa có mật khẩu thì không hỏi mật khẩu hiện tại
  const [needCurrent] = useState(() => user.hasPassword !== false);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: "" });
  };

  const validate = () => {
    const e = {};
    if (needCurrent && !form.current) e.current = "Vui lòng nhập mật khẩu hiện tại";
    if (form.next.length < 8) e.next = "Mật khẩu mới tối thiểu 8 ký tự";
    else if (needCurrent && form.next === form.current)
      e.next = "Mật khẩu mới phải khác mật khẩu hiện tại";
    if (form.confirm !== form.next) e.confirm = "Mật khẩu nhập lại không khớp";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setBusy(true);
    setError("");
    try {
      await changePassword({
        currentPassword: needCurrent ? form.current : "",
        newPassword: form.next,
      });
      setDone(true);
      onSaved({ hasPassword: true });
    } catch (err) {
      if (/hiện tại/i.test(err.message)) setErrors({ current: err.message });
      else if (/khác/i.test(err.message)) setErrors({ next: err.message });
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Shell id="pw-title" title={needCurrent ? "Đã đổi mật khẩu" : "Đã đặt mật khẩu"} onClose={onClose}>
        <div className="pf-body">
          <div className="pf-success">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
            <p>
              Lần đăng nhập sau, dùng email và mật khẩu mới.
              {!needCurrent && " Bạn vẫn đăng nhập bằng Google được như trước."}
            </p>
          </div>
          <footer className="pf-foot">
            <button className="pf-btn" type="button" onClick={onClose} autoFocus>
              Xong
            </button>
          </footer>
        </div>
      </Shell>
    );
  }

  const level = strength(form.next);

  return (
    <Shell
      id="pw-title"
      title={needCurrent ? "Đổi mật khẩu" : "Đặt mật khẩu"}
      subtitle={
        needCurrent
          ? "Dùng ít nhất 8 ký tự và không trùng mật khẩu cũ."
          : "Bạn đang đăng nhập bằng Google. Đặt mật khẩu để đăng nhập được bằng email."
      }
      busy={busy}
      onClose={onClose}
    >
      <form className="pf-body" onSubmit={submit} noValidate>
        {needCurrent && (
          <Field
            id="pw-current"
            label="Mật khẩu hiện tại"
            type="password"
            value={form.current}
            onChange={set("current")}
            error={errors.current}
            autoComplete="current-password"
            autoFocus
          />
        )}
        <Field
          id="pw-next"
          label="Mật khẩu mới"
          type="password"
          value={form.next}
          onChange={set("next")}
          error={errors.next}
          autoComplete="new-password"
          autoFocus={!needCurrent}
        >
          {form.next && !errors.next && (
            <div className="pf-strength" data-level={level}>
              <div className="pf-strength-bar" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <span className="pf-strength-label">{STRENGTH_LABEL[level]}</span>
            </div>
          )}
        </Field>
        <Field
          id="pw-confirm"
          label="Nhập lại mật khẩu mới"
          type="password"
          value={form.confirm}
          onChange={set("confirm")}
          error={errors.confirm}
          autoComplete="new-password"
        />
        {error && (
          <div className="pf-alert" role="alert">
            {error}
          </div>
        )}
        <Footer
          busy={busy}
          label={needCurrent ? "Đổi mật khẩu" : "Đặt mật khẩu"}
          busyLabel="Đang lưu…"
          onClose={onClose}
        />
      </form>
    </Shell>
  );
}
