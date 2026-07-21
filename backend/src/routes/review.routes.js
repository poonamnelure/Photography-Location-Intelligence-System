import express from "express";
import { submitReview, getUserReviewForPlace, getPlaceReviews } from "../controllers/review.controllers.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, submitReview);
router.get("/place/:placeId", getPlaceReviews);          // public — no auth
router.get("/:placeId", verifyToken, getUserReviewForPlace); // user-specific

export default router;