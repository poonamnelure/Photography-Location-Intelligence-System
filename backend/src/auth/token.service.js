import jwt from "jsonwebtoken";
import dotenv from 'dotenv'

dotenv.config()



// Generate Access Token — short lived (15 min)
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
};

// Generate Refresh Token — long lived (7 days)
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

// Verify Access Token
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

// Verify Refresh Token
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};