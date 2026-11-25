import { Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "./components/AuthLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import RoomMembers from "./pages/RoomMembers";
import RoomSettings from "./pages/RoomSettings";
import CommonFund from "./pages/CommonFund";
import FeaturePlaceholder from "./pages/FeaturePlaceholder";

export default function App() {
  return (
    <Routes>
      {/* Đăng nhập / Đăng ký dùng chung khung AuthLayout (có hai tab) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Quên mật khẩu / Đặt lại mật khẩu: trang riêng, tự có bố cục hai nửa */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/" element={<Home />}>
        <Route index element={<Dashboard />} />
        <Route path="quy-chung" element={<CommonFund />} />
        <Route path="khoan-chung" element={<FeaturePlaceholder />} />
        <Route path="khoan-dong" element={<FeaturePlaceholder />} />
        <Route path="chi-tieu" element={<FeaturePlaceholder />} />
        <Route path="thong-ke" element={<FeaturePlaceholder />} />
        <Route path="viec-phong" element={<FeaturePlaceholder />} />
        <Route path="thanh-vien" element={<RoomMembers />} />
        <Route path="cai-dat" element={<RoomSettings />} />
        <Route path="ho-so" element={<FeaturePlaceholder />} />
        <Route path="doi-mat-khau" element={<FeaturePlaceholder />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
