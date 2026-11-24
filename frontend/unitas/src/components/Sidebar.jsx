import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import logo from "../assets/unitas-logo-white.png";
import { NAV } from "../utils/nav";
import Icon from "./Icon";

export default function Sidebar({ room, role, open, onNavigate }) {
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const next = {};
    NAV.filter((item) => item.children).forEach((item) => {
      next[item.label] = item.children.some((child) =>
        pathname.startsWith(child.to),
      );
    });
    setExpanded(next);
  }, [pathname]);

  const toggle = (label) =>
    setExpanded((current) => ({ ...current, [label]: !current[label] }));

  return (
    <aside className={`db-side${open ? " open" : ""}`}>
      <Link className="db-brand" to="/" onClick={onNavigate}>
        <img src={logo} alt="" />
        <b>Unitas</b>
      </Link>

      <div className="db-room">
        <span className="db-room-mark" aria-hidden="true" />
        <span className="db-room-name">{room?.roomName || "Phòng của bạn"}</span>
        <small>{role === "TREASURER" ? "Thủ quỹ" : "Thành viên"}</small>
      </div>

      <nav className="db-nav" aria-label="Điều hướng chính">
        {NAV.map((item) =>
          item.children ? (
            <div
              className={`db-g${expanded[item.label] ? " open" : ""}`}
              key={item.label}
            >
              <button
                className="db-grp"
                type="button"
                aria-expanded={!!expanded[item.label]}
                onClick={() => toggle(item.label)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <Icon name="chevron" className="db-chev" />
              </button>
              <div className="db-sub">
                <div>
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        `db-it${isActive ? " on" : ""}`
                      }
                      onClick={onNavigate}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={!!item.end}
              className={({ isActive }) => `db-it${isActive ? " on" : ""}`}
              onClick={onNavigate}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ),
        )}
      </nav>

      <div className="db-side-foot">Quản lý phòng trọ cùng Unitas</div>
    </aside>
  );
}
