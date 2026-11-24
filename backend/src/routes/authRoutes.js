import { Router } from "express";
import {
  register,
  login,
  logout,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { startOAuth, finishOAuth } from "../controllers/oauthController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.patch("/password", protect, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/google", startOAuth("google"));
router.get("/google/callback", finishOAuth("google"));
router.get("/facebook", startOAuth("facebook"));
router.get("/facebook/callback", finishOAuth("facebook"));

export default router;
