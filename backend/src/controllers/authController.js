import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0|\+84)\d{9}$/;
const USERNAME_REGEX = /^[a-z0-9_.]{4,30}$/;

const isProd = process.env.NODE_ENV === "production";
const baseCookie = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
};
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const clean = (value) => String(value ?? "").trim();

// Gửi cookie đăng nhập và trả luôn token trong body
const sendAuth = (res, status, message, user) => {
  const token = signToken(user._id);
  res.cookie("token", token, { ...baseCookie, maxAge: SEVEN_DAYS });
  return res.status(status).json({ message, user, token });
};

export const register = async (req, res) => {
  const body = req.body ?? {};
  const fullName = clean(body.fullName ?? body.name);
  const email = clean(body.email).toLowerCase();
  const phone = clean(body.phone).replace(/\s/g, "");
  const username = clean(body.username).toLowerCase();
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? body.password2 ?? "");

  const errors = {};
  if (fullName.length < 2) errors.fullName = "Họ và tên tối thiểu 2 ký tự";
  if (!EMAIL_REGEX.test(email)) errors.email = "Email không đúng định dạng";
  if (!PHONE_REGEX.test(phone))
    errors.phone = "Số điện thoại không đúng định dạng";
  if (!USERNAME_REGEX.test(username))
    errors.username = "Tên đăng nhập 4-30 ký tự, chỉ gồm chữ, số, _ hoặc .";
  if (password.length < 8) errors.password = "Mật khẩu tối thiểu 8 ký tự";
  if (confirmPassword && confirmPassword !== password)
    errors.confirmPassword = "Mật khẩu nhập lại không khớp";

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: Object.values(errors)[0], errors });
  }

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    const field = existing.email === email ? "email" : "username";
    const text =
      field === "email"
        ? "Email đã được sử dụng"
        : "Tên đăng nhập đã được sử dụng";
    return res.status(409).json({ message: text, errors: { [field]: text } });
  }

  const hashed = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({
      fullName,
      email,
      phone,
      username,
      password: hashed,
    });
    return sendAuth(res, 201, "Đăng ký thành công", user);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Email hoặc tên đăng nhập đã được sử dụng" });
    }
    throw err;
  }
};

export const login = async (req, res) => {
  const email = clean(req.body?.email).toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
  }

  const user = await User.findOne({ email }).select("+password");
  const ok = user && (await bcrypt.compare(password, user.password));

  // Cùng một thông báo cho cả hai trường hợp, để không lộ email nào đã đăng ký
  if (!ok) {
    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
  }

  return sendAuth(res, 200, "Đăng nhập thành công", user);
};

export const logout = (req, res) => {
  res.clearCookie("token", baseCookie);
  res.json({ message: "Đã đăng xuất" });
};

export const getMe = (req, res) => {
  res.json({ user: req.user });
};
