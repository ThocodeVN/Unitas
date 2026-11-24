const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Đã có lỗi xảy ra, vui lòng thử lại");
    err.status = res.status;
    throw err;
  }
  return data;
}

const send = (method, body) => ({ method, body: JSON.stringify(body) });
const toState = (d) => ({ room: d.room ?? null, pending: d.pending ?? null });

// Endpoints cho trạng thái phòng, thành viên và các thao tác quản lý phòng.
export const getMyRoom = () => request("/rooms/me").then(toState);

export const createRoom = (roomName) =>
  request("/rooms", send("POST", { roomName })).then((d) => d.room);

export const joinRoom = (inviteCode) =>
  request("/rooms/join", send("POST", { inviteCode })).then(toState);

export const cancelJoin = () => request("/rooms/join", { method: "DELETE" });

export const leaveRoom = () => request("/rooms/leave", { method: "POST" });

export const approveMember = (roomId, userId) =>
  request(`/rooms/${roomId}/requests/${userId}/approve`, {
    method: "POST",
  }).then((d) => d.room);

export const rejectMember = (roomId, userId) =>
  request(`/rooms/${roomId}/requests/${userId}/reject`, {
    method: "POST",
  }).then((d) => d.room);

export const transferTreasurer = (roomId, userId) =>
  request(`/rooms/${roomId}/treasurer`, send("PATCH", { userId })).then(
    (d) => d.room,
  );
