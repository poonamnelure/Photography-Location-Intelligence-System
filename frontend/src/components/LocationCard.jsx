import React from "react";
import { motion } from "framer-motion";
import { FiNavigation, FiChevronDown, FiChevronUp } from "react-icons/fi";

/**
 * LocationCard
 * Uses classes: lc-card, lc-card--selected, lc-rank, lc-score-row,
 *   lc-score-num, lc-score-label, lc-img, lc-name, lc-area,
 *   lc-highlights, lc-highlight, lc-highlight-dot,
 *   lc-actions, lc-btn, lc-btn--accent
 * All defined in finder.css.
 */
export default function LocationCard({
  location,
  index,
  isSelected,
  expandedCard,
  setExpandedCard,
  hoveredCard,
  setHoveredCard,
  getScoreColor,
  getScoreLabel,
}) {
  const isExpanded = expandedCard === location.id;
  const color      = getScoreColor(location.score);

  return (
    <motion.div
      className={`lc-card ${isSelected ? "lc-card--selected" : ""}`}
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.42 }}
      onHoverStart={() => setHoveredCard(location.id)}
      onHoverEnd={() => setHoveredCard(null)}
    >
      {/* Rank */}
      <div className="lc-rank">#{index + 1} &nbsp;·&nbsp; Top pick</div>

      {/* Score */}
      <div className="lc-score-row">
        <div>
          <div className="lc-score-num" style={{ color }}>
            {location.score}
          </div>
          <div className="lc-score-label" style={{ color }}>
            {getScoreLabel(location.score)}
          </div>
        </div>
      </div>

      {/* Image — picsum replaces deprecated source.unsplash.com */}
      <img
        className="lc-img"
        src={`https://picsum.photos/seed/${encodeURIComponent(location.name)}/400/225`}
        alt={location.name}
        loading="lazy"
      />

      {/* Name + area */}
      <h3 className="lc-name">{location.name}</h3>
      <p className="lc-area">{location.area}</p>

      {/* Highlights */}
      <div className="lc-highlights">
        {location.highlights
          .slice(0, isExpanded ? undefined : 2)
          .map((h, i) => (
            <div className="lc-highlight" key={i}>
              <span className="lc-highlight-dot">✦</span>
              {h}
            </div>
          ))}
      </div>

      {/* Actions */}
      <div className="lc-actions">
        <button
          className="lc-btn"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedCard(isExpanded ? null : location.id);
          }}
        >
          {isExpanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
          {isExpanded ? "Less" : "Details"}
        </button>

        <a
          className="lc-btn lc-btn--accent"
          href={location.routeUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <FiNavigation size={12} />
          Route
        </a>
      </div>
    </motion.div>
  );
}