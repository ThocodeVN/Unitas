import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import {
  PRESET_AVATARS,
  fileToAvatar,
  saveAvatar,
} from "../services/profileApi";

export default function AvatarDialog({ user, onSaved, onClose }) {
  const [selected, setSelected] = useState(user.avatar || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const changed = selected !== (user.avatar || "");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      setSelected(await fileToAvatar(file));
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      onSaved(await saveAvatar(user, selected));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div
      className="db-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="db-dialog db-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="av-title"
      >
        <h3 id="av-title" className="db-dialog-title">
          Đổi ảnh đại diện
        </h3>

        <div className="av-preview">
          <Avatar user={{ ...user, avatar: selected }} size={96} />
          <div className="av-preview-actions">
            <button
              className="db-btn db-btn--ghost db-btn--sm"
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              Tải ảnh lên
            </button>
            <button
              className="db-btn db-btn--ghost db-btn--sm"
              type="button"
              disabled={busy || !selected}
              onClick={() => setSelected("")}
            >
              Dùng chữ cái đầu
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={pickFile}
          />
        </div>

        <p className="av-label">Hoặc chọn một ảnh có sẵn</p>
        <div className="av-grid">
          {PRESET_AVATARS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`av-option ${selected === p.url ? "is-selected" : ""}`}
              aria-label={p.label}
              aria-pressed={selected === p.url}
              disabled={busy}
              onClick={() => setSelected(p.url)}
            >
              <img src={p.url} alt="" />
            </button>
          ))}
        </div>

        {error && (
          <div className="db-alert" role="alert">
            {error}
          </div>
        )}
        <p className="av-hint">
          Ảnh tải lên được tự động cắt vuông và thu nhỏ.
        </p>

        <div className="db-dialog-actions">
          <button
            className="db-btn db-btn--ghost db-btn--sm"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            className="db-btn db-btn--sm"
            type="button"
            disabled={busy || !changed}
            onClick={save}
          >
            {busy ? "Đang lưu…" : "Lưu ảnh"}
          </button>
        </div>
      </div>
    </div>
  );
}
