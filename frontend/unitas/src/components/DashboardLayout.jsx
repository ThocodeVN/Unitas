import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AccountMenu from "./UserMenu";
import Icon from "./Icon";
import NotificationBell from "./NotificationBell";
import Sidebar from "./Sidebar";
import { findTitle } from "../utils/nav";
import "../styles/dashboardShell.css";

export default function DashboardLayout({
  me,
  room,
  role,
  onLogout,
  onUserChange,
  onRoomChange,
  onLeft,
}) {
  const { pathname } = useLocation();
  const [sideOpen, setSideOpen] = useState(false);

  return (
    <div className="db-app">
      <Sidebar
        open={sideOpen}
        room={room}
        role={role}
        onNavigate={() => setSideOpen(false)}
      />
      {sideOpen && (
        <button
          className="db-scrim show"
          type="button"
          aria-label="Đóng menu"
          onClick={() => setSideOpen(false)}
        />
      )}

      <div className="db-main">
        <header className="db-top">
          <button
            type="button"
            className="db-burger"
            aria-label="Mở menu"
            onClick={() => setSideOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <h1>{findTitle(pathname)}</h1>
          <span className="db-sp" />
          <NotificationBell />
          <AccountMenu
            user={me}
            role={role}
            onLogout={onLogout}
            onUserChange={onUserChange}
          />
        </header>

        <main className="db-view">
          <Outlet
            context={{
              me,
              room,
              role,
              isTreasurer: role === "TREASURER",
              onRoomChange,
              onLeft,
            }}
          />
        </main>
      </div>
    </div>
  );
}
