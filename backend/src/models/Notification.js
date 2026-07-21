import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  type: {
    type: String,
    enum: ["visit_reminder", "review_request", "visit_scheduled"],
    required: true,
  },

  title: {
    type: String,
    required: true,
  },

  message: {
    type: String,
    default: "",
  },

  placeId: {
    type: String,
    default: "",
  },

  placeName: {
    type: String,
    default: "",
  },

  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserPlaceActivity",
    default: null,
  },

  read: {
    type: Boolean,
    default: false,
  },

  // When to surface this notification (allows scheduling future notifications)
  activeDate: {
    type: Date,
    default: Date.now,
  },

}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
