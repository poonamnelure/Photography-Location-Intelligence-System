import UserPlaceActivity from "../models/UserPlaceActivity.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendScheduleConfirmation, sendReviewRequest } from "../services/email.service.js";

// ── Mark interested (want to visit) ─────────────────────────────────────────
export const markInterested = async (req, res) => {
  try {
    const { placeId, placeName, location, photographyType, preview } = req.body;

    const existing = await UserPlaceActivity.findOne({
      userId: req.user.id,
      placeId
    });

    if (existing) {
      return res.json({ success: true, activity: existing });
    }

    const activity = await UserPlaceActivity.create({
      userId: req.user.id,
      placeId,
      placeName,
      location,
      photographyType,
      status: "interested",
      preview
    });

    res.json({ success: true, activity });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Schedule a visit ────────────────────────────────────────────────────────
export const scheduleVisit = async (req, res) => {
  try {
    const { placeId, placeName, location, photographyType, scheduledDate, emailNotify, preview } = req.body;

    // Upsert: create if doesn't exist, update if does
    let activity = await UserPlaceActivity.findOne({ userId: req.user.id, placeId });

    if (activity) {
      activity.status = "scheduled";
      activity.scheduledDate = scheduledDate;
      activity.emailNotify = emailNotify || false;
      if (placeName) activity.placeName = placeName;
      if (photographyType) activity.photographyType = photographyType;
      if (preview) activity.preview = preview;
      await activity.save();
    } else {
      activity = await UserPlaceActivity.create({
        userId: req.user.id,
        placeId,
        placeName,
        location,
        photographyType,
        status: "scheduled",
        scheduledDate,
        emailNotify: emailNotify || false,
        preview,
      });
    }

    // Create an in-app notification confirming the schedule
    await Notification.create({
      userId: req.user.id,
      type: "visit_scheduled",
      title: `✓ Visit Scheduled: ${placeName}`,
      message: `Your visit to ${placeName} is set for ${new Date(scheduledDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}.`,
      placeId,
      placeName,
      activityId: activity._id,
      activeDate: new Date(),
    });

    // ★ Send confirmation email IMMEDIATELY if user opted in
    if (emailNotify) {
      try {
        const user = await User.findById(req.user.id);
        if (user?.email) {
          console.log(`[Schedule] Sending confirmation email to ${user.email} in background...`);
          // Fire and forget (removed await) so the frontend isn't blocked
          sendScheduleConfirmation({
            to: user.email,
            placeName,
            scheduledDate,
            photographyType,
          }).catch(err => console.error("[Schedule] Background email send error:", err.message));
        }
      } catch (emailErr) {
        console.error("[Schedule] Email send error:", emailErr.message);
        // Don't fail the whole request if email fails
      }
    }

    res.json({ success: true, activity });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Mark as visited ─────────────────────────────────────────────────────────
export const markVisited = async (req, res) => {
  try {
    const { placeId, placeName, location, photographyType, preview } = req.body;

    let activity = await UserPlaceActivity.findOne({ userId: req.user.id, placeId });

    if (activity) {
      activity.status = "visited";
      activity.visitedAt = new Date();
      await activity.save();
    } else {
      activity = await UserPlaceActivity.create({
        userId: req.user.id,
        placeId,
        placeName,
        location,
        photographyType,
        status: "visited",
        visitedAt: new Date(),
        preview,
      });
    }

    // Schedule a review-request notification for next day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(7, 0, 0, 0); // 7 AM next day

    await Notification.create({
      userId: req.user.id,
      type: "review_request",
      title: `⭐ How was ${placeName || "your visit"}?`,
      message: `You visited ${placeName || "a location"} — share your experience and help other photographers!`,
      placeId,
      placeName,
      activityId: activity._id,
      activeDate: tomorrow,
    });

    // ★ Send review request email IMMEDIATELY if user had opted in
    const shouldEmail = activity.emailNotify;
    if (shouldEmail) {
      try {
        const user = await User.findById(req.user.id);
        if (user?.email) {
          console.log(`[Visited] Sending review request email to ${user.email}`);
          await sendReviewRequest({
            to: user.email,
            placeName,
            photographyType: activity.photographyType || photographyType,
          });
        }
      } catch (emailErr) {
        console.error("[Visited] Email send error:", emailErr.message);
      }
    }

    res.json({ success: true, activity });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Get user activities (grouped) ───────────────────────────────────────────
export const getUserActivities = async (req, res) => {
  try {
    const activities = await UserPlaceActivity.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    const grouped = {
      interested: [],
      scheduled: [],
      visited: []
    };

    activities.forEach(a => {
      grouped[a.status].push(a);
    });

    res.json(grouped);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ── Get user notifications ──────────────────────────────────────────────────
export const getUserNotifications = async (req, res) => {
  try {
    const now = new Date();

    const notifications = await Notification.find({
      userId: req.user.id,
      activeDate: { $lte: now },
    }).sort({ createdAt: -1 }).limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      read: false,
      activeDate: { $lte: now },
    });

    res.json({ notifications, unreadCount });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Mark notification as read ───────────────────────────────────────────────
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notif) return res.status(404).json({ message: "Notification not found" });

    res.json({ success: true, notification: notif });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Mark all notifications as read ──────────────────────────────────────────
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};