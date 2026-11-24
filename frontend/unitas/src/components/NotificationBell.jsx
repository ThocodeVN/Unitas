import { useCallback, useRef, useState } from "react";
import useClickOutside from "../utils/useClickOutside";
import Icon from "./Icon";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close);

  return (
    <div className="db-pw" ref={ref}>
      <button
        className="db-bell"
        type="button"
        aria-label="Thông báo"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" />
      </button>
      <section
        className={`db-pop${open ? " show" : ""}`}
        aria-label="Thông báo"
        aria-hidden={!open}
      >
        <header>Thông báo</header>
        <div className="db-pop-empty">
          Chưa có thông báo. Thông báo sẽ xuất hiện tại đây khi hệ thống hỗ trợ.
        </div>
      </section>
    </div>
  );
}
