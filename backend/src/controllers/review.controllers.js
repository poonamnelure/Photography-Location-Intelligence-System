import Review from "../models/Reviews.js";
import Notification from "../models/Notification.js";

export const submitReview = async (req, res) => {
  try {
    const { placeId, placeName, rating, reviewText } = req.body;

    // Prevent duplicate reviews
    const existing = await Review.findOne({ userId: req.user.id, placeId });
    if (existing) {
      return res.status(409).json({ message: "You have already reviewed this location." });
    }

    const review = await Review.create({
      userId: req.user.id,
      placeId,
      placeName,
      rating,
      reviewText
    });

    // Mark any review_request notifications for this place as read
    await Notification.updateMany(
      { userId: req.user.id, placeId, type: "review_request", read: false },
      { read: true }
    );

    res.json({ success: true, review });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserReviewForPlace = async (req, res) => {
  try {
    const { placeId } = req.params;
    const review = await Review.findOne({ userId: req.user.id, placeId });
    res.json({ review: review || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Public endpoint — fetch all reviews for a place (no auth required)
export const getPlaceReviews = async (req, res) => {
  try {
    const { placeId } = req.params;
    const reviews = await Review.find({ placeId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userId", "name email")
      .lean();

    // Mask email for privacy: show only first 3 chars + ***
    const sanitized = reviews.map(r => ({
      _id: r._id,
      rating: r.rating,
      reviewText: r.reviewText,
      placeName: r.placeName,
      createdAt: r.createdAt,
      user: r.userId ? {
        name: r.userId.name || "Anonymous",
        avatar: (r.userId.name || "A").charAt(0).toUpperCase(),
      } : { name: "Anonymous", avatar: "A" },
    }));

    const avgRating = reviews.length
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    res.json({ reviews: sanitized, count: reviews.length, avgRating: parseFloat(avgRating) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};