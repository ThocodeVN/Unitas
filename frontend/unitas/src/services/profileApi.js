const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Ảnh có sẵn: hình tròn màu kèm biểu tượng, tạo bằng SVG nên không cần tệp ảnh
const svgAvatar = (emoji, bg) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">` +
    `<rect width="128" height="128" fill="${bg}"/>` +
    `<text x="64" y="66" font-size="68" text-anchor="middle" dominant-baseline="central">${emoji}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const PRESETS = [
  ["🐱", "#f5b800", "Mèo"],
  ["🐶", "#ff9e6d", "Chó"],
  ["🦊", "#ff7a70", "Cáo"],
  ["🐼", "#6fd17a", "Gấu trúc"],
  ["🐸", "#4dd0c8", "Ếch"],
  ["🦁", "#ffc857", "Sư tử"],
  ["🐯", "#ffa24d", "Hổ"],
  ["🐨", "#9aa7ff", "Koala"],
];

export const PRESET_AVATARS = PRESETS.map(([emoji, bg, label]) => ({
  id: label,
  label,
  url: svgAvatar(emoji, bg),
}));

// Cắt vuông ở giữa, thu nhỏ còn 256x256 rồi đổi sang JPEG để nhẹ
export function fileToAvatar(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Vui lòng chọn một tệp ảnh"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Ảnh quá lớn (tối đa 8 MB)"));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh này"));
    };
    img.src = url;
  });
}

// Lưu ảnh đại diện, trả về người dùng đã cập nhật (cần backend có PATCH /api/auth/me)
export async function saveAvatar(_user, avatar) {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatar }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 404) {
    throw new Error(
      "Máy chủ chưa hỗ trợ đổi ảnh đại diện. Tính năng sẽ có khi backend hoàn thiện.",
    );
  }
  if (!res.ok) throw new Error(data.message || "Không lưu được ảnh đại diện");
  return data.user;
}
