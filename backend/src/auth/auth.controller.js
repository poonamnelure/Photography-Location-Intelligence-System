import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "./token.service.js";
import { OAuth2Client } from 'google-auth-library';
import { sendPasswordReset } from '../services/email.service.js';

// ─── REGISTER ────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Hash password — cost factor 12 (as your friend recommended)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    // Send refresh token as secure httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        city: user.city,
        bio: user.bio,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration.",
    });
  }
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if ( !user.password ){
      return res.status(401).json({
        success: false,
        message: "Invalid Login Method. Please use Google Login"
      })
    }
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    // Send refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        city: user.city,
        bio: user.bio,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login.",
    });
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
// Called by frontend when access token expires
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No refresh token. Please login again.",
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    // Check if refresh token matches the one stored in DB
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token. Please login again.",
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token. Please login again.",
    });
  }
};

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      // Remove refresh token from DB
      await User.findOneAndUpdate(
        { refreshToken: token },
        { refreshToken: null }
      );
    }

    // Clear cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout.",
    });
  }
};

// ─── GET MY PROFILE ──────────────────────────────────────────────────────────
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

// ─── UPDATE PROFILE ──────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const { name, city, bio, profilePic } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, city, bio, profilePic },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });
    if (!user) {
      // Check if email already registered (email/password)
      user = await User.findOne({ email });
      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        user.authProvider = 'google';
        await user.save();
      } else {
        // Create new Google user (no password)
        user = await User.create({
          googleId,
          email,
          name,
          profilePic: picture,
          authProvider: 'google',
        });
      }
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        city: user.city,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({ success: false, message: "Google authentication failed" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Forgot Password – generates token and sends reset email
// ──────────────────────────────────────────────────────────────────────────────
import crypto from 'crypto';

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return success to avoid revealing if email exists
    if (!user) {
      return res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // Send via email — gracefully degrades if SMTP not configured
    await sendPasswordReset({ to: user.email, resetLink });
    console.log(`[Auth] Password reset email sent to ${user.email}`);

    res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// NEW: Reset Password – update with token
// ──────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const resendResetLink = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ success: true, message: "If that email is registered, a new reset link has been sent." });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    await sendPasswordReset({ to: user.email, resetLink });
    console.log(`[Auth] Resent password reset email to ${user.email}`);

    res.json({ success: true, message: "If that email is registered, a new reset link has been sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};