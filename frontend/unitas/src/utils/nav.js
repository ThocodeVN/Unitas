export const NAV = [
  { label: "Tổng quan", to: "/", icon: "home", end: true },
  {
    label: "Tài chính",
    icon: "wallet",
    children: [
      { label: "Quỹ chung", to: "/quy-chung" },
      { label: "Khoản chung", to: "/khoan-chung" },
      { label: "Khoản đóng", to: "/khoan-dong" },
      { label: "Chi tiêu", to: "/chi-tieu" },
      { label: "Thống kê", to: "/thong-ke" },
    ],
  },
  { label: "Việc phòng", to: "/viec-phong", icon: "task" },
  { label: "Thành viên", to: "/thanh-vien", icon: "users" },
  { label: "Cài đặt phòng", to: "/cai-dat", icon: "gear" },
];

const EXTRA = {
  "/ho-so": "Hồ sơ cá nhân",
  "/doi-mat-khau": "Đổi mật khẩu",
};

export function findTitle(pathname) {
  if (EXTRA[pathname]) return EXTRA[pathname];
  for (const item of NAV) {
    if (item.to && (item.end ? pathname === item.to : pathname.startsWith(item.to))) {
      return item.label;
    }
    for (const child of item.children || []) {
      if (pathname.startsWith(child.to)) return child.label;
    }
  }
  return "Unitas";
}
