// Gọi API đăng nhập / đăng ký. Mặc định gọi /api (vite.config.js đã proxy sang Express cổng 5000).
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // bỏ nếu bạn lưu JWT ở localStorage thay vì cookie
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.message || "Đã có lỗi xảy ra, vui lòng thử lại");
  return data;
}

export const login = ({ email, password }) =>
  post("/auth/login", { email, password });

export const register = ({ name, email, phone, username, password }) =>
  post("/auth/register", { name, email, phone, username, password });

// Đăng nhập Google / Facebook: chuyển hướng sang route OAuth của backend
export const socialLogin = (provider) => {
  window.location.href = `${BASE_URL}/auth/${provider}`;
};

export const forgotPassword = ({ email }) =>
  post("/auth/forgot-password", { email });

export const resetPassword = ({ token, password }) =>
  post("/auth/reset-password", { token, password });

export const logout = () => post("/auth/logout", {});

// Lấy người đang đăng nhập (dùng cho trang chủ)
export const getMe = async () => {
  const res = await fetch(`${BASE_URL}/auth/me`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Chưa đăng nhập");
  return data.user;
};
