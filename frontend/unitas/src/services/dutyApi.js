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

// { from, to, mine } -> [duty]
export const listDuties = ({ from, to, mine = false }) => {
  const q = new URLSearchParams({ from, to });
  if (mine) q.set("mine", "true");
  return request(`/duties?${q}`).then((d) => d.duties);
};

// { title, assigneeId, date, from?, to?, note? } -> duty
export const createDuty = (body) =>
  request("/duties", send("POST", body)).then((d) => d.duty);

// { title, startDate, days, memberIds?, from?, to?, note? } -> [duty]
export const createRotation = (body) =>
  request("/duties/rotation", send("POST", body)).then((d) => d.duties);

// status: "TODO" | "DONE" -> duty
export const setDutyStatus = (id, status) =>
  request(`/duties/${id}/status`, send("PATCH", { status })).then((d) => d.duty);

export const deleteDuty = (id) =>
  request(`/duties/${id}`, { method: "DELETE" });
