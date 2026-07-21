import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function StarIcon({ filled, hovered, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <motion.button
      type="button"
      className="rev-star-btn"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill={filled || hovered ? "var(--accent, #c8a96e)" : "none"}
        stroke={filled || hovered ? "var(--accent, #c8a96e)" : "var(--text-muted, rgba(240,237,232,0.28))"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          filter: filled ? "drop-shadow(0 0 6px rgba(200,169,110,0.4))" : "none",
          transition: "filter 0.2s",
        }}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </motion.button>
  );
}

export default function ReviewModal({ location, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Amazing"];

  const handleSubmit = async () => {
    if (!rating) {
      setError("Please select a star rating.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Please log in to submit a review.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          placeId: location.placeId || location.id || location.name,
          placeName: location.placeName || location.name,
          rating,
          reviewText,
        }),
      });

      if (res.status === 409) {
        setError("You have already reviewed this location.");
        return;
      }
      if (!res.ok) throw new Error("Submit failed");

      setSuccess(true);
      setTimeout(() => {
        onSubmitted?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("Could not submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="sched-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="sched-modal rev-modal"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button className="sched-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {success ? (
            <motion.div
              className="rev-success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <span className="rev-success-icon">🎉</span>
              <h3 className="rev-success-title">Thank You!</h3>
              <p className="rev-success-sub">Your review has been submitted successfully.</p>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="sched-header">
                <span className="sched-icon">⭐</span>
                <h2 className="sched-title">Rate Your Experience</h2>
              </div>

              <p className="rev-place-name">
                at <strong>{location.placeName || location.name}</strong>
              </p>

              <div className="sched-divider" />

              {/* Star Rating */}
              <div className="rev-section">
                <label className="sched-section-label">How would you rate this location?</label>
                <div className="rev-stars-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                      key={star}
                      filled={star <= rating}
                      hovered={star <= hoveredStar && star > rating}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                    />
                  ))}
                </div>
                {(rating > 0 || hoveredStar > 0) && (
                  <motion.p
                    className="rev-rating-label"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={hoveredStar || rating}
                  >
                    {ratingLabels[hoveredStar || rating]}
                  </motion.p>
                )}
              </div>

              <div className="sched-divider" />

              {/* Text Review */}
              <div className="rev-section">
                <label className="sched-section-label">Tell us more <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
                <textarea
                  className="rev-textarea"
                  placeholder="Share your thoughts about this location — lighting quality, accessibility, atmosphere…"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Error */}
              {error && <p className="sched-error">{error}</p>}

              {/* Actions */}
              <div className="sched-actions">
                <button className="sched-btn sched-btn--cancel" onClick={onClose}>
                  Skip
                </button>
                <motion.button
                  className={`sched-btn sched-btn--confirm ${loading ? "sched-btn--loading" : ""}`}
                  onClick={handleSubmit}
                  disabled={loading}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? (
                    <>
                      <span className="sched-btn-spinner" />
                      Submitting…
                    </>
                  ) : (
                    <>Submit Review ⭐</>
                  )}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
