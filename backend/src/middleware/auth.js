import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getJwtSecret } from "../utils/token.js";

export const protect = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ message: "Tài khoản không tồn tại" });
    }
    req.user = user;
    next();
  } catch {
    res
      .status(401)
      .json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
  }
};
