import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ScheduleModal({ location, searchDateTime, onClose, onScheduled }) {
  const [dateMode, setDateMode] = useState("search"); // "search" | "custom"
  const [customDate, setCustomDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [emailNotify, setEmailNotify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchDateFormatted = searchDateTime
    ? new Date(searchDateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : null;

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const handleConfirm = async () => {
    const scheduledDate = dateMode === "search" ? searchDateTime : customDate;
    if (!scheduledDate) {
      setError("Please select a date.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Please log in to schedule visits.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/activity/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          placeId: location.placeId || location.id || location.name,
          placeName: location.name,
          location: { lat: location.lat, lng: location.lng },
          photographyType: location.photographyType || "",
          scheduledDate,
          emailNotify,
          preview: {
            score: location.score,
            highlights: location.highlights?.slice(0, 3) || [],
            photographyType: location.photographyType || "",
            imageUrl: location.imageUrl || "",
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to schedule visit");
      const data = await res.json();
      onScheduled?.(data.activity);
    } catch (err) {
      console.error(err);
      setError("Could not schedule visit. Please try again.");
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
          className="sched-modal"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button className="sched-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="sched-header">
            <span className="sched-icon">📅</span>
            <h2 className="sched-title">Schedule Your Visit</h2>
          </div>

          {/* Location Info */}
          <div className="sched-location-info">
            <p className="sched-loc-name">{location.name}</p>
            {location.area && <p className="sched-loc-area">📍 {location.area}</p>}
          </div>

          <div className="sched-divider" />

          {/* Date Selection */}
          <div className="sched-section">
            <label className="sched-section-label">When do you plan to visit?</label>

            {/* Search date option */}
            {searchDateTime && (
              <label className={`sched-radio ${dateMode === "search" ? "sched-radio--on" : ""}`}>
                <input
                  type="radio"
                  name="dateMode"
                  value="search"
                  checked={dateMode === "search"}
                  onChange={() => setDateMode("search")}
                />
                <span className="sched-radio-dot" />
                <span className="sched-radio-text">
                  Use search date: <strong>{searchDateFormatted}</strong>
                </span>
              </label>
            )}

            {/* Custom date option */}
            <label className={`sched-radio ${dateMode === "custom" ? "sched-radio--on" : ""}`}>
              <input
                type="radio"
                name="dateMode"
                value="custom"
                checked={dateMode === "custom"}
                onChange={() => setDateMode("custom")}
              />
              <span className="sched-radio-dot" />
              <span className="sched-radio-text">Choose a different date</span>
            </label>

            <AnimatePresence>
              {dateMode === "custom" && (
                <motion.div
                  className="sched-date-input-wrap"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <input
                    className="sched-date-input"
                    type="datetime-local"
                    value={customDate}
                    min={getMinDateTime()}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="sched-divider" />

          {/* Email Notification */}
          <label className="sched-checkbox-wrap">
            <input
              type="checkbox"
              checked={emailNotify}
              onChange={(e) => setEmailNotify(e.target.checked)}
            />
            <span className={`sched-checkbox-box ${emailNotify ? "sched-checkbox-box--on" : ""}`}>
              {emailNotify && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </span>
            <span className="sched-checkbox-label">
              <span className="sched-checkbox-title">Notify me via email on visit day</span>
              <span className="sched-checkbox-sub">We'll send a reminder to your registered email</span>
            </span>
          </label>

          {/* Error */}
          {error && <p className="sched-error">{error}</p>}

          {/* Actions */}
          <div className="sched-actions">
            <button className="sched-btn sched-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <motion.button
              className={`sched-btn sched-btn--confirm ${loading ? "sched-btn--loading" : ""}`}
              onClick={handleConfirm}
              disabled={loading}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? (
                <>
                  <span className="sched-btn-spinner" />
                  Scheduling…
                </>
              ) : (
                <>Confirm Schedule ✓</>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
