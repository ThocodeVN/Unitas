import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { setAuthCookie, cookieOptions } from "../utils/token.js";
import { sendEmail } from "../utils/sendEmail.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0|\+84)\d{9}$/;
const USERNAME_REGEX = /^[a-z0-9_.]{4,30}$/;

const clean = (value) => String(value ?? "").trim();
const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const sendAuth = (res, status, message, user) => {
  const token = setAuthCookie(res, user._id);
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
  // Tài khoản tạo bằng Google/Facebook có thể chưa có mật khẩu
  const ok =
    user && user.password && (await bcrypt.compare(password, user.password));

  if (!ok) {
    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
  }

  return sendAuth(res, 200, "Đăng nhập thành công", user);
};

export const logout = (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Đã đăng xuất" });
};

export const getMe = (req, res) => {
  res.json({ user: req.user });
};

export const forgotPassword = async (req, res) => {
  const email = clean(req.body?.email).toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Email không đúng định dạng" });
  }

  // Luôn trả cùng một thông báo dù email có tồn tại hay không
  const message =
    "Nếu email đã đăng ký, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu";

  const user = await User.findOne({ email });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = sha256(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const link = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Đặt lại mật khẩu Unitas",
        text: `Bạn vừa yêu cầu đặt lại mật khẩu Unitas. Mở liên kết sau trong vòng 15 phút:\n${link}\n\nNếu không phải bạn, hãy bỏ qua email này.`,
        html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu Unitas.</p><p><a href="${link}">Bấm vào đây để đặt lại mật khẩu</a> (hiệu lực 15 phút).</p><p>Nếu không phải bạn, hãy bỏ qua email này.</p>`,
      });
    } catch (err) {
      console.error("Gửi email thất bại:", err.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
    }
  }

  return res.json({ message });
};

export const resetPassword = async (req, res) => {
  const token = clean(req.body?.token);
  const password = String(req.body?.password ?? "");

  if (!token) {
    return res
      .status(400)
      .json({ message: "Liên kết đặt lại mật khẩu không hợp lệ" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Mật khẩu tối thiểu 8 ký tự" });
  }

  const user = await User.findOne({
    resetPasswordToken: sha256(token),
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) {
    return res.status(400).json({
      message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
    });
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return res.json({
    message: "Đặt lại mật khẩu thành công, hãy đăng nhập lại",
  });
};
const AVATAR_REGEX = /^data:image\/(jpeg|png|webp|svg\+xml)[;,]/;

// PATCH /api/auth/me { fullName?, phone?, username?, avatar? } -> { user }
// Chỉ cập nhật những trường được gửi lên; trường không gửi giữ nguyên.
// Email không đổi ở đây (cần xác minh email riêng).
export const updateMe = async (req, res) => {
  const user = req.user;
  const body = req.body ?? {};
  const errors = {};
  const updates = {};

  if (body.fullName !== undefined) {
    const fullName = clean(body.fullName);
    if (fullName.length < 2 || fullName.length > 100)
      errors.fullName = "Họ và tên từ 2 đến 100 ký tự";
    else updates.fullName = fullName;
  }

  if (body.phone !== undefined) {
    // Tài khoản Google/Facebook có thể chưa có số điện thoại nên cho phép để trống
    const phone = clean(body.phone).replace(/\s/g, "");
    if (phone !== "" && !PHONE_REGEX.test(phone))
      errors.phone = "Số điện thoại không đúng định dạng";
    else updates.phone = phone;
  }

  if (body.username !== undefined) {
    const username = clean(body.username).toLowerCase();
    if (!USERNAME_REGEX.test(username))
      errors.username = "Tên đăng nhập 4-30 ký tự, chỉ gồm chữ, số, _ hoặc .";
    else if (username !== user.username) updates.username = username;
  }

  if (body.avatar !== undefined) {
    const avatar = String(body.avatar ?? "");
    if (avatar !== "" && !AVATAR_REGEX.test(avatar))
      errors.avatar = "Ảnh đại diện không hợp lệ";
    else if (avatar.length > 300000) errors.avatar = "Ảnh đại diện quá lớn";
    else updates.avatar = avatar;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: Object.values(errors)[0], errors });
  }
  if (Object.keys(updates).length === 0) {
    return res.json({ message: "Không có thay đổi nào", user });
  }

  if (
    updates.username &&
    (await User.exists({ username: updates.username, _id: { $ne: user._id } }))
  ) {
    const text = "Tên đăng nhập đã được sử dụng";
    return res.status(409).json({ message: text, errors: { username: text } });
  }

  Object.assign(user, updates);
  try {
    await user.save();
  } catch (err) {
    // Hai người cùng lấy một username trong cùng lúc: index unique chặn lại
    if (err?.code === 11000 && err?.keyPattern?.username) {
      const text = "Tên đăng nhập đã được sử dụng";
      return res.status(409).json({ message: text, errors: { username: text } });
    }
    throw err;
  }

  const onlyAvatar = Object.keys(updates).every((k) => k === "avatar");
  return res.json({
    message: onlyAvatar ? "Đã cập nhật ảnh đại diện" : "Đã cập nhật hồ sơ",
    user,
  });
};
// PATCH /api/auth/password { currentPassword, newPassword }
export const changePassword = async (req, res) => {
  const currentPassword = String(req.body?.currentPassword ?? "");
  const newPassword = String(req.body?.newPassword ?? "");

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "Mật khẩu mới tối thiểu 8 ký tự" });
  }

  const user = await User.findById(req.user._id).select("+password");

  // Tài khoản Google/Facebook chưa có mật khẩu thì được đặt luôn
  if (user.password) {
    const ok =
      currentPassword && (await bcrypt.compare(currentPassword, user.password));
    if (!ok) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }
    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải khác mật khẩu cũ" });
    }
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  return res.json({ message: "Đã đổi mật khẩu" });
};
