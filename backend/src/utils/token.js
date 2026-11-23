import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";

const isProd = process.env.NODE_ENV === "production";

export const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
};

export const getJwtSecret = () => {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) return configuredSecret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is not configured. Add a strong random value to backend/.env.",
    );
  }

  const temporarySecret = randomBytes(32).toString("hex");
  process.env.JWT_SECRET = temporarySecret;
  console.warn(
    "JWT_SECRET is missing; using a temporary development secret. Set JWT_SECRET in backend/.env to keep sessions across restarts.",
  );
  return temporarySecret;
};

export const signToken = (userId) =>
  jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: "7d" });

// Gắn cookie đăng nhập vào response và trả về token
export const setAuthCookie = (res, userId) => {
  const token = signToken(userId);
  res.cookie("token", token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
};
