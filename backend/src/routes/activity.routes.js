import express from "express";
import {
  markInterested,
  scheduleVisit,
  markVisited,
  getUserActivities,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/activity.controllers.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = express.Router();

router.post("/interested", verifyToken, markInterested);
router.post("/schedule", verifyToken, scheduleVisit);
router.post("/visited", verifyToken, markVisited);
router.get("/profile", verifyToken, getUserActivities);

// Notification endpoints
router.get("/notifications", verifyToken, getUserNotifications);
router.patch("/notifications/:id/read", verifyToken, markNotificationRead);
router.patch("/notifications/read-all", verifyToken, markAllNotificationsRead);

export default router;