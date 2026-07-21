import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function() { return !this.googleId; }, // not required if Google user
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    refreshToken: {
      type: String,
      default: null,
    },
    // ─── NEW FIELDS (Google Auth + Forgot Password) ─────────────────────────
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ['email', 'google'],
      default: 'email',
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;