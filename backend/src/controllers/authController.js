import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0|\+84)[3-9]\d{8}$/;
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const clean = (value) => String(value ?? "").trim();

export const register = async (req, res) => {
  const body = req.body ?? {};
  const fullName = clean(body.fullName);
  const email = clean(body.email).toLowerCase();
  const phone = clean(body.phone).replace(/[\s.-]/g, "");
  const username = clean(body.username).toLowerCase();
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  const errors = {};
  if (fullName.length < 2) errors.fullName = "Vui lòng nhập họ và tên";
  if (!EMAIL_REGEX.test(email)) errors.email = "Email không hợp lệ";
  if (!PHONE_REGEX.test(phone)) errors.phone = "Số điện thoại không hợp lệ";
  if (!USERNAME_REGEX.test(username))
    errors.username =
      "Tên đăng nhập 3-30 ký tự, chỉ gồm chữ thường, số và dấu gạch dưới";
  if (password.length < 8) errors.password = "Mật khẩu tối thiểu 8 ký tự";
  if (confirmPassword && confirmPassword !== password)
    errors.confirmPassword = "Mật khẩu nhập lại không khớp";

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors });
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
    return res
      .status(201)
      .json({
        message: "Đăng ký thành công",
        user,
        token: signToken(user._id),
      });
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

  return res.json({
    message: "Đăng nhập thành công",
    user,
    token: signToken(user._id),
  });
};

export const getMe = (req, res) => {
  res.json({ user: req.user });
};
