import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrDialog({ room, link, onCopy, onClose }) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(link, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#ffffff" },
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setError("Không tạo được mã QR, hãy thử lại.");
      });
    return () => {
      alive = false;
    };
  }, [link]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `unitas-moi-phong-${room.inviteCode}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      className="db-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="db-dialog db-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-title"
      >
        <h3 id="qr-title" className="db-dialog-title">
          Mã QR mời vào phòng
        </h3>
        <p className="db-card-sub">
          Cho bạn cùng phòng quét mã này để vào <strong>{room.roomName}</strong>
          . Họ sẽ chờ thủ quỹ duyệt.
        </p>

        <div className="qr-body">
          <div className="qr-box">
            {src ? (
              <img src={src} alt={`Mã QR mời vào phòng ${room.roomName}`} />
            ) : (
              <span className="qr-loading">{error || "Đang tạo mã QR…"}</span>
            )}
          </div>
          <span className="qr-code">{room.inviteCode}</span>
          <span className="qr-link">{link}</span>
        </div>

        <div className="db-dialog-actions qr-actions">
          <button
            className="db-btn db-btn--ghost db-btn--sm"
            type="button"
            onClick={() => onCopy(link, "Đã sao chép liên kết mời")}
          >
            Sao chép liên kết
          </button>
          <button
            className="db-btn db-btn--ghost db-btn--sm"
            type="button"
            disabled={!src}
            onClick={download}
          >
            Tải ảnh QR
          </button>
          <button className="db-btn db-btn--sm" type="button" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
