const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request(method, path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Không tải được thông báo");
    err.status = res.status;
    throw err;
  }
  return data;
}

// -> { notifications: [{ _id, type, message, link, read, createdAt, actor }], unread }
export const listNotifications = (limit = 20) =>
  request("GET", `/notifications?limit=${limit}`);

// -> { unread }
export const markRead = (id) => request("PATCH", `/notifications/${id}/read`);

export const markAllRead = () => request("POST", "/notifications/read-all");
