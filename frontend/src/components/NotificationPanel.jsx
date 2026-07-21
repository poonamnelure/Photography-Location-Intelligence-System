import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

const ICON_MAP = {
  visit_reminder: "📅",
  review_request: "⭐",
  visit_scheduled: "✓",
};

export default function NotificationPanel({ isOpen, onClose, onReviewClick, onUnreadChange }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/activity/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        if (onUnreadChange) onUnreadChange(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Also poll every 60s when panel is closed (for badge count)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (id) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/activity/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => {
        const newCount = Math.max(0, c - 1);
        if (onUnreadChange) onUnreadChange(newCount);
        return newCount;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/activity/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      if (onUnreadChange) onUnreadChange(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (notif) => {
    if (!notif.read) await markRead(notif._id);
    if (notif.type === "review_request" && onReviewClick) {
      onReviewClick({
        placeId: notif.placeId,
        placeName: notif.placeName,
      });
    }
  };

  // Group notifications by date
  const grouped = notifications.reduce((acc, n) => {
    const d = new Date(n.createdAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let label;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString("en-IN", { dateStyle: "medium" });

    if (!acc[label]) acc[label] = [];
    acc[label].push(n);
    return acc;
  }, {});

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="notif-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="notif-panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="notif-panel-header">
              <h3 className="notif-panel-title">Notifications</h3>
              <div className="notif-panel-header-actions">
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
                <button className="notif-panel-close" onClick={onClose}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="notif-panel-body">
              {loading && notifications.length === 0 ? (
                <div className="notif-empty">
                  <span className="notif-empty-icon">⏳</span>
                  <p>Loading…</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="notif-empty">
                  <span className="notif-empty-icon">🔔</span>
                  <p>No notifications yet</p>
                  <span className="notif-empty-sub">Schedule a visit to get started!</span>
                </div>
              ) : (
                Object.entries(grouped).map(([label, items]) => (
                  <div key={label} className="notif-group">
                    <div className="notif-group-label">{label}</div>
                    {items.map((notif) => (
                      <motion.div
                        key={notif._id}
                        className={`notif-card ${!notif.read ? "notif-card--unread" : ""}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="notif-card-icon">
                          {ICON_MAP[notif.type] || "📌"}
                        </span>
                        <div className="notif-card-content">
                          <p className="notif-card-title">{notif.title}</p>
                          <p className="notif-card-msg">{notif.message}</p>
                          <div className="notif-card-footer">
                            <span className="notif-card-time">{timeAgo(notif.createdAt)}</span>
                            {notif.type === "review_request" && (
                              <button
                                className="notif-card-action"
                                onClick={() => handleAction(notif)}
                              >
                                Write Review →
                              </button>
                            )}
                            {notif.type !== "review_request" && !notif.read && (
                              <button
                                className="notif-card-action"
                                onClick={() => markRead(notif._id)}
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expose unreadCount for parent (bell badge) */}
    </>
  );
}
