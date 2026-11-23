import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/unitas-logo-white.png";
import PendingView from "../components/PendingView";
import RoomSetup from "../components/RoomSetup";
import RoomView from "../components/RoomView";
import UserMenu from "../components/UserMenu";
import { getMe, logout } from "../services/authApi";
import { getMyRoom } from "../services/roomApi";
import "../styles/dashboard.css";

const JOIN_KEY = "unitas_join_code";

// Liên kết mời có dạng /?join=ABC123. Lưu mã lại để dùng sau khi đăng nhập
function captureInviteCode() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("join");
  if (!code) return;

  const clean = code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  if (clean) sessionStorage.setItem(JOIN_KEY, clean);

  params.delete("join");
  const rest = params.toString();
  window.history.replaceState(
    null,
    "",
    window.location.pathname + (rest ? `?${rest}` : ""),
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    captureInviteCode();
    let alive = true;

    (async () => {
      let me;
      try {
        me = await getMe();
      } catch {
        // Chưa đăng nhập hoặc phiên đã hết hạn
        if (alive) navigate("/login", { replace: true });
        return;
      }

      try {
        const data = await getMyRoom();
        if (alive) {
          setRoom(data.room);
          setPending(data.pending);
        }
      } catch (err) {
        // 404: backend chưa có API phòng
        if (alive)
          setError({ message: err.message, unavailable: err.status === 404 });
      }

      if (alive) {
        setUser(me);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [navigate, attempt]);

  // Đã có phòng hoặc đang chờ duyệt thì bỏ mã mời đã lưu
  useEffect(() => {
    if (room || pending) sessionStorage.removeItem(JOIN_KEY);
  }, [room, pending]);

  const retry = () => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Dù lỗi vẫn đưa về trang đăng nhập
    }
    navigate("/login", { replace: true });
  };

  const applyResult = (result) => {
    setRoom(result.room);
    setPending(result.pending);
  };

  if (loading || !user) {
    return <div className="db-page db-center">Đang tải…</div>;
  }

  const myRole =
    room?.listMember?.find((m) => String(m._id) === String(user._id))
      ?.roleInRoom || null;

  let content;
  if (error?.unavailable) {
    content = (
      <div className="db-card db-pending">
        <h1 className="db-card-title db-card-title--lg">
          Tính năng phòng đang được hoàn thiện
        </h1>
        <p className="db-card-sub">
          Việc tạo phòng, tham gia phòng và quản lý quỹ chung sẽ sớm có mặt. Bạn
          vẫn có thể dùng menu ở góc phải để xem hồ sơ hoặc đăng xuất.
        </p>
        <button className="db-btn" type="button" onClick={retry}>
          Thử lại
        </button>
      </div>
    );
  } else if (error) {
    content = (
      <div className="db-card">
        <h2 className="db-card-title">Không tải được thông tin phòng</h2>
        <div className="db-alert" role="alert">
          {error.message}
        </div>
        <button className="db-btn" type="button" onClick={retry}>
          Thử lại
        </button>
      </div>
    );
  } else if (room) {
    content = (
      <RoomView
        room={room}
        user={user}
        onChange={setRoom}
        onLeft={() => setRoom(null)}
      />
    );
  } else if (pending) {
    content = (
      <PendingView
        pending={pending}
        onCancelled={() => setPending(null)}
        onApproved={(approvedRoom) =>
          applyResult({ room: approvedRoom, pending: null })
        }
      />
    );
  } else {
    content = <RoomSetup user={user} onResult={applyResult} />;
  }

  return (
    <div className="db-page">
      <header className="db-header">
        <div className="db-header-inner">
          <div className="db-brand">
            <img src={logo} alt="" />
            <span>Unitas</span>
          </div>
          <UserMenu
            user={user}
            role={myRole}
            onLogout={handleLogout}
            onUserChange={setUser}
          />
        </div>
      </header>

      <main className="db-main">{content}</main>
    </div>
  );
}
