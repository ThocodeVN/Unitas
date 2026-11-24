const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export async function getDashboardSummary() {
  const response = await fetch(`${BASE_URL}/rooms/dashboard`, {
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Không tải được tổng quan phòng");
    error.status = response.status;
    throw error;
  }
  return data;
}
