const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request(method, path, body, fallback) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || fallback);
    err.status = res.status;
    throw err;
  }
  return data;
}

// -> { fundBalance, cashBalance, accountBalance, transactions }
export const getFund = () =>
  request("GET", "/finance/fund", null, "Không tải được quỹ chung");

// scale: "week" | "month"; period: id kỳ (bỏ trống = kỳ hiện tại)
// -> { scale, periods: [{ id, label }], period: { id, label, points } }
export function getFundHistory(scale, period) {
  const q = new URLSearchParams({ scale });
  if (period) q.set("period", period);
  return request(
    "GET",
    `/finance/fund/history?${q}`,
    null,
    "Không tải được lịch sử biến động",
  );
}

// -> { adjustments }
export const listAdjustments = () =>
  request("GET", "/finance/adjustments", null, "Không tải được yêu cầu điều chỉnh");

// { source: "CASH" | "ACCOUNT", newBalance, reason } -> { adjustment, cashBalance, accountBalance }
export const createAdjustment = (payload) =>
  request("POST", "/finance/adjustments", payload, "Không gửi được yêu cầu");

export const cancelAdjustment = (id) =>
  request("DELETE", `/finance/adjustments/${id}`, null, "Không hủy được yêu cầu");

export const approveAdjustment = (id) =>
  request("POST", `/finance/adjustments/${id}/approve`, null, "Không duyệt được yêu cầu");

export const rejectAdjustment = (id) =>
  request("POST", `/finance/adjustments/${id}/reject`, null, "Không từ chối được yêu cầu");

// Chuyển giữa tiền mặt và tài khoản (chỉ thủ quỹ)
// { from: "CASH" | "ACCOUNT", amount, note? } -> { cashBalance, accountBalance }
export const createTransfer = (payload) =>
  request("POST", "/finance/transfers", payload, "Không chuyển được tiền");
