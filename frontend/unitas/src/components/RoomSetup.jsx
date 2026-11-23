import { useState } from "react";
import { createRoom, joinRoom } from "../services/roomApi";

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const HomeIcon = () => (
  <svg {...svgProps}>
    <path d="M4 11.5 12 5l8 6.5" />
    <path d="M6 10.5V19h12v-8.5" />
    <path d="M10 19v-4.5h4V19" />
  </svg>
);

const KeyIcon = () => (
  <svg {...svgProps}>
    <circle cx="8.5" cy="14.5" r="3.5" />
    <path d="m11 12 8-8" />
    <path d="m16 7 2.5 2.5" />
  </svg>
);

export default function RoomSetup({ user, onResult }) {
  const [roomName, setRoomName] = useState("");
  // Nếu người dùng đến từ liên kết mời (/?join=ABC123) thì điền sẵn mã
  const [code, setCode] = useState(
    () => sessionStorage.getItem("unitas_join_code") || "",
  );
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState({ create: "", join: "" });

  const firstName = (user.fullName || "").trim().split(/\s+/).pop() || "bạn";

  // action trả về { room, pending }
  const run = async (kind, action) => {
    setBusy(kind);
    setErrors({ create: "", join: "" });
    try {
      onResult(await action());
    } catch (err) {
      setErrors({ create: "", join: "", [kind]: err.message });
      setBusy("");
    }
  };

  const submitCreate = (e) => {
    e.preventDefault();
    const name = roomName.trim();
    if (!name) {
      setErrors({ create: "Vui lòng nhập tên phòng", join: "" });
      return;
    }
    run("create", async () => ({
      room: await createRoom(name),
      pending: null,
    }));
  };

  const submitJoin = (e) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) {
      setErrors({ create: "", join: "Vui lòng nhập mã mời" });
      return;
    }
    run("join", () => joinRoom(value));
  };

  return (
    <>
      <section>
        <h1 className="db-title">Xin chào, {firstName}</h1>
        <p className="db-sub">
          Bạn chưa ở trong phòng nào. Hãy tạo phòng mới cho cả nhóm, hoặc nhập
          mã mời mà bạn cùng phòng gửi để tham gia.
        </p>
      </section>

      <div className="db-grid-2">
        <form className="db-card" onSubmit={submitCreate} noValidate>
          <div className="db-icon">
            <HomeIcon />
          </div>
          <h2 className="db-card-title">Tạo phòng mới</h2>
          <p className="db-card-sub">
            Bạn sẽ là thủ quỹ và nhận một mã mời để gửi cho các bạn cùng phòng.
          </p>
          <label className="db-label" htmlFor="room-name">
            Tên phòng
          </label>
          <input
            id="room-name"
            className="db-input"
            type="text"
            maxLength={100}
            placeholder="Ví dụ: Phòng 101 - Nhà trọ Bình An"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          {errors.create && (
            <div className="db-alert" role="alert">
              {errors.create}
            </div>
          )}
          <button
            className="db-btn db-btn--block"
            type="submit"
            disabled={!!busy}
          >
            {busy === "create" ? "Đang tạo…" : "Tạo phòng"}
          </button>
        </form>

        <form className="db-card" onSubmit={submitJoin} noValidate>
          <div className="db-icon">
            <KeyIcon />
          </div>
          <h2 className="db-card-title">Tham gia bằng mã mời</h2>
          <p className="db-card-sub">
            Nhập mã gồm 6 ký tự mà thủ quỹ hoặc bạn cùng phòng gửi cho bạn. Thủ
            quỹ sẽ duyệt yêu cầu của bạn.
          </p>
          <label className="db-label" htmlFor="invite-code">
            Mã mời
          </label>
          <input
            id="invite-code"
            className="db-input db-input--code"
            type="text"
            maxLength={6}
            placeholder="ABC123"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          {errors.join && (
            <div className="db-alert" role="alert">
              {errors.join}
            </div>
          )}
          <button
            className="db-btn db-btn--block"
            type="submit"
            disabled={!!busy}
          >
            {busy === "join" ? "Đang gửi yêu cầu…" : "Gửi yêu cầu tham gia"}
          </button>
        </form>
      </div>
    </>
  );
}
