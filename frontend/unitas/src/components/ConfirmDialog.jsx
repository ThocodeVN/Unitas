import { useEffect } from "react";

export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div
      className="db-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="db-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
      >
        <h3 id="dlg-title" className="db-dialog-title">
          {title}
        </h3>
        <div className="db-dialog-body">{children}</div>
        <div className="db-dialog-actions">
          <button
            className="db-btn db-btn--ghost db-btn--sm"
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            className={`db-btn db-btn--sm ${danger ? "db-btn--danger" : ""}`}
            type="button"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
