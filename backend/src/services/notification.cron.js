import cron from "node-cron";
import UserPlaceActivity from "../models/UserPlaceActivity.js";
import Notification from "../models/Notification.js";
import Review from "../models/Reviews.js";
import User from "../models/User.js";
import { sendVisitReminder, sendReviewRequest } from "./email.service.js";

// ── Helper: start & end of a given day (UTC) ────────────────────────────────
function dayBounds(date) {
  const d = new Date(date);

  const start = new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    0, 0, 0, 0
  ));

  const end = new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    23, 59, 59, 999
  ));

  return { start, end };
}

// ── Process visit reminders (runs on the morning of scheduled date) ─────────
async function processVisitReminders() {
  const today = dayBounds(new Date());

  const activities = await UserPlaceActivity.find({
    status: "scheduled",
    scheduledDate: { $gte: today.start, $lte: today.end },
  });

  console.log(`[Cron] Found ${activities.length} visits scheduled for today`);

  for (const act of activities) {
    // Check if we already created a reminder for this activity today
    const existing = await Notification.findOne({
      activityId: act._id,
      type: "visit_reminder",
      activeDate: { $gte: today.start, $lte: today.end },
    });
    if (existing) continue;

    // Create in-app notification
    await Notification.create({
      userId: act.userId,
      type: "visit_reminder",
      title: `📅 Visit Reminder: ${act.placeName}`,
      message: `Your ${act.photographyType || "photography"} visit to ${act.placeName} is scheduled for today!`,
      placeId: act.placeId,
      placeName: act.placeName,
      activityId: act._id,
      activeDate: new Date(),
    });

    // Send email if user opted in
    if (act.emailNotify) {
      try {
        const user = await User.findById(act.userId);
        if (user?.email) {
          await sendVisitReminder({
            to: user.email,
            placeName: act.placeName,
            scheduledDate: act.scheduledDate,
            photographyType: act.photographyType,
          });
        }
      } catch (err) {
        console.error(`[Cron] Email error for activity ${act._id}:`, err.message);
      }
    }
  }
}

// ── Process review requests (day after visit) ───────────────────────────────
async function processReviewRequests() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yBounds = dayBounds(yesterday);

  const activities = await UserPlaceActivity.find({
    status: "visited",
    visitedAt: { $gte: yBounds.start, $lte: yBounds.end },
  });

  console.log(`[Cron] Found ${activities.length} visits from yesterday to request reviews`);

  for (const act of activities) {
    // Check if review already exists
    const existingReview = await Review.findOne({
      userId: act.userId,
      placeId: act.placeId,
    });
    if (existingReview) continue;

    // Check if notification already sent
    const existingNotif = await Notification.findOne({
      activityId: act._id,
      type: "review_request",
    });
    if (existingNotif) continue;

    // Create review-request notification
    await Notification.create({
      userId: act.userId,
      type: "review_request",
      title: `⭐ How was ${act.placeName}?`,
      message: `You visited ${act.placeName} yesterday. Share your experience and help other photographers!`,
      placeId: act.placeId,
      placeName: act.placeName,
      activityId: act._id,
      activeDate: new Date(),
    });

    // Send email if user opted in
    if (act.emailNotify) {
      try {
        const user = await User.findById(act.userId);
        if (user?.email) {
          await sendReviewRequest({
            to: user.email,
            placeName: act.placeName,
            photographyType: act.photographyType,
          });
        }
      } catch (err) {
        console.error(`[Cron] Review email error for activity ${act._id}:`, err.message);
      }
    }
  }
}

// ── Initialize cron ─────────────────────────────────────────────────────────
export function initNotificationCron() {
  // Run daily at 7:00 AM (server-local time)
  cron.schedule(
    "* * * * *",
    async () => {
      console.log("[Cron] Running daily notification job…");
      try {
        await processVisitReminders();
        await processReviewRequests();
        console.log("[Cron] Daily notification job complete.");
      } catch (err) {
        console.error("[Cron] Job error:", err);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("[Cron] Notification cron scheduled — daily at 07:00");
}
