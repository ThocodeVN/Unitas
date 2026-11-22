import { getMe } from "./authApi";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";
// Chỉ bật dữ liệu giả khi file .env.local có dòng VITE_USE_MOCK=true
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export const IS_MOCK = USE_MOCK;

// ======================= API thật (đường dẫn đề xuất, chốt khi họp) =======================
async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.message || "Đã có lỗi xảy ra, vui lòng thử lại");
  return data;
}

const send = (method, body) => ({ method, body: JSON.stringify(body) });
const toState = (d) => ({ room: d.room ?? null, pending: d.pending ?? null });

const real = {
  getMyRoom: () => request("/rooms/me").then(toState),
  createRoom: (roomName) =>
    request("/rooms", send("POST", { roomName })).then((d) => d.room),
  joinRoom: (inviteCode) =>
    request("/rooms/join", send("POST", { inviteCode })).then(toState),
  cancelJoin: () => request("/rooms/join", { method: "DELETE" }),
  leaveRoom: () => request("/rooms/leave", { method: "POST" }),
  approveMember: (roomId, userId) =>
    request(`/rooms/${roomId}/requests/${userId}/approve`, {
      method: "POST",
    }).then((d) => d.room),
  rejectMember: (roomId, userId) =>
    request(`/rooms/${roomId}/requests/${userId}/reject`, {
      method: "POST",
    }).then((d) => d.room),
  transferTreasurer: (roomId, userId) =>
    request(`/rooms/${roomId}/treasurer`, send("PATCH", { userId })).then(
      (d) => d.room,
    ),
};

// ======================= Dữ liệu giả (lưu theo từng tài khoản) =======================
const wait = (value, ms = 300) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));
const same = (a, b) => String(a) === String(b);
const roomKey = (u) => `unitas_mock_room_${u._id}`;
const pendKey = (u) => `unitas_mock_pending_${u._id}`;
const load = (key) => JSON.parse(localStorage.getItem(key) || "null");
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const person = (_id, fullName, username) => ({
  _id,
  fullName,
  username,
  avatar: "",
});
const FAKE = {
  b: person("mock-u2", "Nguyễn Văn B", "nguyenvanb"),
  c: person("mock-u3", "Trần Thị C", "tranthic"),
  d: person("mock-u4", "Lê Minh D", "leminhd"),
  e: person("mock-u5", "Phạm Thu E", "phamthue"),
};
const asMember = (p, roleInRoom) => ({
  _id: p._id,
  fullName: p.fullName,
  username: p.username,
  avatar: p.avatar || "",
  roleInRoom,
});

async function mine() {
  const user = await getMe();
  const room = load(roomKey(user));
  if (!room) throw new Error("Bạn chưa ở trong phòng nào");
  return { user, room };
}

function requireTreasurer(user, room) {
  const me = room.listMember.find((m) => same(m._id, user._id));
  if (me?.roleInRoom !== "TREASURER") {
    throw new Error("Chỉ thủ quỹ mới được thực hiện thao tác này");
  }
}

const mock = {
  async getMyRoom() {
    const user = await getMe();
    return wait({ room: load(roomKey(user)), pending: load(pendKey(user)) });
  },

  async createRoom(roomName) {
    const user = await getMe();
    const name = String(roomName).trim();
    if (!name || name.length > 100)
      throw new Error("Tên phòng phải từ 1 đến 100 ký tự");
    const now = new Date().toISOString();
    const room = {
      _id: "mock-room",
      roomName: name,
      inviteCode: "ABC123",
      createDate: now,
      fundBalance: 0,
      listMember: [asMember(user, "TREASURER")],
      // Hai yêu cầu có sẵn để thử chức năng duyệt thành viên
      pendingMembers: [
        { ...FAKE.d, requestedAt: now },
        { ...FAKE.e, requestedAt: now },
      ],
    };
    save(roomKey(user), room);
    return wait(room);
  },

  async joinRoom(inviteCode) {
    const user = await getMe();
    await wait(null);
    if (String(inviteCode).trim().toUpperCase() !== "ABC123") {
      throw new Error("Mã mời không đúng (bản thử dùng mã ABC123)");
    }
    const pending = {
      roomName: "Phòng 101 - Nhà trọ Bình An",
      requestedAt: new Date().toISOString(),
    };
    save(pendKey(user), pending);
    return { room: null, pending };
  },

  async cancelJoin() {
    const user = await getMe();
    localStorage.removeItem(pendKey(user));
    return wait({ message: "Đã hủy yêu cầu" });
  },

  async leaveRoom() {
    const user = await getMe();
    localStorage.removeItem(roomKey(user));
    return wait({ message: "Đã rời phòng" });
  },

  async approveMember(roomId, userId) {
    const { user, room } = await mine();
    requireTreasurer(user, room);
    const req = (room.pendingMembers || []).find((p) => same(p._id, userId));
    if (!req) throw new Error("Không tìm thấy yêu cầu này");
    room.pendingMembers = room.pendingMembers.filter(
      (p) => !same(p._id, userId),
    );
    room.listMember.push(asMember(req, "MEMBER"));
    save(roomKey(user), room);
    return wait(room);
  },

  async rejectMember(roomId, userId) {
    const { user, room } = await mine();
    requireTreasurer(user, room);
    room.pendingMembers = (room.pendingMembers || []).filter(
      (p) => !same(p._id, userId),
    );
    save(roomKey(user), room);
    return wait(room);
  },

  async transferTreasurer(roomId, userId) {
    const { user, room } = await mine();
    requireTreasurer(user, room);
    if (!room.listMember.some((m) => same(m._id, userId))) {
      throw new Error("Người này không thuộc phòng");
    }
    room.listMember.forEach((m) => {
      if (same(m._id, userId)) m.roleInRoom = "TREASURER";
      else if (same(m._id, user._id)) m.roleInRoom = "MEMBER";
    });
    save(roomKey(user), room);
    return wait(room);
  },

  // Chỉ dùng để demo: giả lập thủ quỹ đã duyệt yêu cầu tham gia
  async simulateApproval() {
    const user = await getMe();
    const room = {
      _id: "mock-room",
      roomName: "Phòng 101 - Nhà trọ Bình An",
      inviteCode: "ABC123",
      createDate: new Date().toISOString(),
      fundBalance: 1250000,
      listMember: [
        asMember(FAKE.b, "TREASURER"),
        asMember(FAKE.c, "MEMBER"),
        asMember(user, "MEMBER"),
      ],
      pendingMembers: [],
    };
    localStorage.removeItem(pendKey(user));
    save(roomKey(user), room);
    return wait(room);
  },

  // Chỉ dùng để demo: đổi vai trò của mình trong phòng
  async setRole(role) {
    const { user, room } = await mine();
    room.listMember.forEach((m) => {
      if (same(m._id, user._id)) m.roleInRoom = role;
      else if (role === "TREASURER" && m.roleInRoom === "TREASURER")
        m.roleInRoom = "MEMBER";
    });
    if (
      role === "MEMBER" &&
      !room.listMember.some((m) => m.roleInRoom === "TREASURER")
    ) {
      room.listMember.unshift(asMember(FAKE.b, "TREASURER"));
    }
    save(roomKey(user), room);
    return wait(room, 150);
  },
};

const api = USE_MOCK ? mock : real;

export const {
  getMyRoom,
  createRoom,
  joinRoom,
  cancelJoin,
  leaveRoom,
  approveMember,
  rejectMember,
  transferTreasurer,
} = api;

export const mockSetRole = mock.setRole;
export const mockApprovePending = mock.simulateApproval;
