import express from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  getMyProfile,
  updateProfile,
  googleAuth,
  forgotPassword,
  resetPassword,
  resendResetLink,
} from "./auth.controller.js";
import { verifyToken } from "./auth.middleware.js";

const router = express.Router();

// ─── Public routes (no token needed) ─────────────────────────────────────────
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

// ─── NEW Google Auth & Forgot Password routes ────────────────────────────────
router.post("/google", googleAuth);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// ─── Protected routes (token required) ───────────────────────────────────────
router.get("/me", verifyToken, getMyProfile);
router.put("/profile", verifyToken, updateProfile);

router.post("/resend-reset", resendResetLink);

export default router;