import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useClickOutside from "../utils/useClickOutside";
import {
  listNotifications,
  markAllRead,
  markRead,
} from "../services/notificationApi";
import Avatar from "./Avatar";
import Icon from "./Icon";
import "../styles/notifications.css";

const POLL_MS = 30_000; // tự kiểm tra thông báo mới mỗi 30 giây
const TYPE_ICON = { ROOM: "users", FUND: "wallet", DUTY: "task", ACCOUNT: "lock" };

const dayKey = (d) => new Date(d).toDateString();

function timeAgo(value) {
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)} giờ trước`;
  const d = new Date(value);
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (diff < 2 * 86_400) return `Hôm qua, ${time}`;
  return `${d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}, ${time}`;
}

// Chia thành "Hôm nay" và "Trước đó"
function groupByDay(list) {
  const today = dayKey(Date.now());
  const groups = [
    { label: "Hôm nay", items: list.filter((n) => dayKey(n.createdAt) === today) },
    { label: "Trước đó", items: list.filter((n) => dayKey(n.createdAt) !== today) },
  ];
  return groups.filter((g) => g.items.length > 0);
}

function NotificationItem({ item, onOpen }) {
  const icon = TYPE_ICON[item.type] || "bell";
  return (
    <li>
      <button
        type="button"
        className={`nb-item${item.read ? "" : " is-unread"}`}
        onClick={() => onOpen(item)}
      >
        <span className="nb-visual">
          {item.actor ? (
            <Avatar user={item.actor} size={36} />
          ) : (
            <span className={`nb-icon nb-icon--${item.type.toLowerCase()}`}>
              <Icon name={icon} />
            </span>
          )}
          {item.actor && (
            <span className={`nb-type nb-type--${item.type.toLowerCase()}`}>
              <Icon name={icon} />
            </span>
          )}
        </span>
        <span className="nb-text">
          <span className="nb-msg">{item.message}</span>
          <span className="nb-time">{timeAgo(item.createdAt)}</span>
        </span>
        {!item.read && <i className="nb-dot" aria-label="Chưa đọc" />}
      </button>
    </li>
  );
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null); // null = chưa tải lần nào
  const [unread, setUnread] = useState(0);
  const [tab, setTab] = useState("all"); // "all" | "unread"
  const [error, setError] = useState("");
  const [ring, setRing] = useState(0); // đổi key để chuông lắc khi có tin mới
  const lastUnread = useRef(0);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close);

  const refresh = useCallback(
    () =>
      listNotifications(30)
        .then((data) => {
          setItems(data.notifications);
          setUnread(data.unread);
          if (data.unread > lastUnread.current) setRing((n) => n + 1);
          lastUnread.current = data.unread;
          setError("");
        })
        .catch((err) => setError(err.message)),
    [],
  );

  // Tải lúc mở trang, rồi kiểm tra định kỳ khi tab đang hiển thị
  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const setUnreadCount = (n) => {
    lastUnread.current = n;
    setUnread(n);
  };

  const toggle = () => {
    if (!open) refresh();
    setOpen((value) => !value);
  };

  const openItem = (item) => {
    setOpen(false);
    if (!item.read) {
      setItems((list) =>
        list.map((n) => (n._id === item._id ? { ...n, read: true } : n)),
      );
      setUnreadCount(Math.max(0, unread - 1));
      markRead(item._id).catch(() => {});
    }
    if (item.link) navigate(item.link);
  };

  const readAll = async () => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllRead();
    } catch (err) {
      setError(err.message);
      refresh();
    }
  };

  const shown = (items || []).filter((n) => tab === "all" || !n.read);

  return (
    <div className="db-pw" ref={ref}>
      <button
        className={`db-bell nb-bell${open ? " is-open" : ""}`}
        type="button"
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        aria-expanded={open}
        onClick={toggle}
      >
        <span className={`nb-bell-icon${ring ? " nb-ring" : ""}`} key={ring}>
          <Icon name="bell" />
        </span>
        {unread > 0 && (
          <span className="nb-badge" aria-hidden="true">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <section
        className={`db-pop nb-pop${open ? " show" : ""}`}
        aria-label="Thông báo"
        aria-hidden={!open}
      >
        <header className="nb-head">
          <div className="nb-title">
            <strong>Thông báo</strong>
            {unread > 0 && <span className="nb-count">{unread} mới</span>}
          </div>
          {unread > 0 && (
            <button className="nb-read-all" type="button" onClick={readAll}>
              Đọc tất cả
            </button>
          )}
        </header>

        <div className="nb-tabs" role="tablist">
          {[
            ["all", "Tất cả"],
            ["unread", "Chưa đọc"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`nb-tab${tab === key ? " is-active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="nb-body">
          {error && items === null ? (
            <div className="nb-empty">Không tải được thông báo. {error}</div>
          ) : items === null ? (
            <div className="nb-empty">Đang tải…</div>
          ) : shown.length === 0 ? (
            <div className="nb-empty">
              <span className="nb-empty-icon">
                <Icon name="bell" />
              </span>
              {tab === "unread"
                ? "Bạn đã đọc hết thông báo."
                : "Chưa có hoạt động nào. Mọi thay đổi trong phòng sẽ hiện ở đây."}
            </div>
          ) : (
            groupByDay(shown).map((group) => (
              <div key={group.label}>
                <div className="nb-group">{group.label}</div>
                <ul className="nb-list">
                  {group.items.map((item) => (
                    <NotificationItem key={item._id} item={item} onOpen={openItem} />
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
