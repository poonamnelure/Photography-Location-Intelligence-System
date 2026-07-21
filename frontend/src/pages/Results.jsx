import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import { RainbowMeter, PhotoTypeDonut } from "../components/SuitabilityMeter";
import ScheduleModal from "../components/ScheduleModal";
import ReviewModal from "../components/ReviewModal";
import "../css/results.css";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

console.log("Maps Key:", GOOGLE_MAPS_API_KEY);

const PARAM_META = {
  weatherSuitability:  { label: "Weather Suitability",  icon: "🌤" },
  lightingCondition:   { label: "Lighting Condition",   icon: "💡" },
  accessibility:       { label: "Accessibility",        icon: "🛣"  },
  crowdDensity:        { label: "Crowd Density",        icon: "👥" },
  timeSuitability:     { label: "Time Suitability",     icon: "🕐" },
  lightPollution:      { label: "Light Pollution",      icon: "🌙" },
  noiseLevel:          { label: "Noise Level",          icon: "🔇" },
  spaceOpenness:       { label: "Space Openness",       icon: "🌅" },
  aestheticBackground: { label: "Aesthetic Background", icon: "🎨" },
  windCondition:       { label: "Wind Condition",       icon: "💨" },
};

const RANK_PALETTE = [
  { color: "#c8a96e", label: "#1", badge: "Top Pick"    },
  { color: "#8a9ab5", label: "#2", badge: "Runner Up"   },
  { color: "#b87333", label: "#3", badge: "Third Place" },
];

function computePhotoTypeScores(parameters) {
  if (!parameters) return {};
  const p = parameters;
  const w = (pairs) => Math.round(pairs.reduce((s, [k, wt]) => s + (p[k] ?? 0) * wt, 0) * 100);
  return {
    celebration:      w([["lightingCondition",0.25],["weatherSuitability",0.2],["aestheticBackground",0.2],["crowdDensity",0.15],["accessibility",0.1],["noiseLevel",0.1]]),
    landscape:        w([["weatherSuitability",0.25],["lightingCondition",0.25],["spaceOpenness",0.2],["aestheticBackground",0.15],["windCondition",0.1],["crowdDensity",0.05]]),
    street:           w([["timeSuitability",0.2],["lightingCondition",0.2],["crowdDensity",0.2],["aestheticBackground",0.15],["accessibility",0.15],["noiseLevel",0.1]]),
    astrophotography: w([["lightPollution",0.35],["weatherSuitability",0.3],["crowdDensity",0.15],["timeSuitability",0.1],["windCondition",0.1]]),
  };
}

function generateHighlights(parameters, photoType) {
  if (!parameters) return [];
  const hints = [], p = parameters;
  if (p.lightPollution >= 0.8) hints.push("Minimal light pollution — ideal for long exposures");
  else if (p.lightPollution <= 0.3) hints.push("High light pollution — challenging for low-light work");
  if (p.weatherSuitability >= 0.8) hints.push("Clear skies forecast — excellent shooting conditions");
  if (p.weatherSuitability >= 0.7) hints.push("🌤️ Favorable weather — great shooting conditions");
  else if (p.weatherSuitability < 0.4) hints.push("🌧️ Unpredictable weather — have backup plans");
  if (p.crowdDensity >= 0.7) hints.push("👤 Low footfall — clean compositions");
  else if (p.crowdDensity < 0.35) hints.push("👥 High footfall — plan for crowd management");
  if (p.spaceOpenness >= 0.75) hints.push("🏞️ Open vista — ideal for wide-angle shots");
  if (p.accessibility >= 0.8) hints.push("🛣️ Easy access — gear-friendly location");
  else if (p.accessibility < 0.4) hints.push("🥾 Limited access — scout in advance");
  if (p.lightingCondition >= 0.8) hints.push("☀️ Outstanding natural light quality");
  else if (p.lightingCondition < 0.35) hints.push("🔦 Low light — bring additional lighting");
  if (p.noiseLevel >= 0.75) hints.push("🤫 Quiet environment — ideal for portrait work");
  if (p.windCondition < 0.35) hints.push("💨 High wind expected — secure equipment");
  if (p.aestheticBackground >= 0.8) hints.push("🎨 Visually compelling backdrop");
  return hints.slice(0, 4);
}

function getScoreLabel(score) {
  if (score >= 80) return { label: "Perfect",    color: "green"  };
  if (score >= 60) return { label: "Go For It",  color: "green"  };
  if (score >= 40) return { label: "Timepass",   color: "yellow" };
  return             { label: "Skip",         color: "red"    };
}

const paramColor = (v) => v >= 0.8 ? "#5bbf6a" : v >= 0.6 ? "#c8a96e" : v >= 0.4 ? "#d4a020" : "#c0614a";

function streetViewUrl(lat, lng, width = 400, height = 220) {
  if (!lat || !lng) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${lat},${lng}&fov=90&pitch=10&key=${GOOGLE_MAPS_API_KEY}`;
}

/* Google Maps Static (satellite) image — fallback when street view unavailable */

/* Google Maps Static (satellite) image — fallback when street view unavailable */
function satelliteUrl(lat, lng, width = 400, height = 180, zoom = 15) {
  if (!lat || !lng) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=satellite&key=${GOOGLE_MAPS_API_KEY}`;
}

   /* Google Street View METADATA — checks if imagery exists at coords */
  async function hasStreetView(lat, lng) {
    if (!lat || !lng) return false;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await res.json();
      return json.status === "OK";
    } catch {
      return false;
    }
  }
async function generateReport(location, photoType, dateTime, payload) {
  const scoreInfo = getScoreLabel(location.score ?? 0);
  const body = {
    placeData: {
      placeId: location.placeId ?? location.id ?? "",
      name: location.name ?? "",
      distanceKm: location.distance != null ? (typeof location.distance === "number" ? location.distance.toFixed(2) : location.distance) : "0",
      area: location.area ?? "",
      photographyType: photoType ?? "",
      suitabilityMeter: { score: location.score ?? 0, label: scoreInfo.label, color: scoreInfo.color },
      keyHighlights: location.highlights?.length ? location.highlights : generateHighlights(location.parameters, photoType),
      routeUrl: location.routeUrl || (location.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&travelmode=driving` : ""),
      rawParameters: location.parameters ?? {},
      finalScore: location.finalScore ?? (location.score ?? 0) / 100,
      location: {
        lat: location.lat ?? 0,
        lng: location.lng ?? 0,
      },
    },
    photographyType: photoType ?? "",
    dateTime: dateTime ?? new Date().toISOString(),
    // Forward user's real location for accurate distance in PDF
    ...(payload?.userLat != null ? { userLat: payload.userLat, userLng: payload.userLng } : {}),
  };

  const res = await fetch(`${API_BASE}/api/report/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Report generation failed: ${res.status}`);

  // Backend always responds with application/pdf (in-memory buffer, cloud-safe)
  const blob = await res.blob();

  // Prefer the server-suggested filename from Content-Disposition header
  let suggestedName = `${location.name?.replace(/\s+/g, "_") ?? "location"}_Report.pdf`;
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^";\n]+)"?/i);
  if (match?.[1]) suggestedName = match[1];

  // Trigger browser's native Save As dialog
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = suggestedName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Give the browser a moment to initiate the download before revoking
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}

function ParamTable({ parameters }) {
  if (!parameters) return null;
  const entries = Object.entries(parameters).filter(([k]) => PARAM_META[k]);
  if (!entries.length) return null;
  return (
    <div className="rp-param-table">
      {entries.map(([key, val]) => {
        const meta = PARAM_META[key];
        const pct = Math.round(val * 100);
        const col = paramColor(val);
        return (
          <div className="rp-param-row" key={key}>
            <span className="rp-param-icon">{meta.icon}</span>
            <span className="rp-param-label">{meta.label}</span>
            <div className="rp-param-track">
              <motion.div className="rp-param-fill"
                style={{ background: col }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.85, ease: "easeOut" }}
              />
            </div>
            <span className="rp-param-pct" style={{ color: col }}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

const PHOTO_WEIGHTS = {
  celebration: [["lightingCondition", 0.22], ["weatherSuitability", 0.2], ["aestheticBackground", 0.18], ["accessibility", 0.15], ["spaceOpenness", 0.15], ["noiseLevel", 0.1]],
  landscape: [["weatherSuitability", 0.25], ["lightingCondition", 0.25], ["spaceOpenness", 0.2], ["aestheticBackground", 0.15], ["windCondition", 0.1], ["crowdDensity", 0.05]],
  street: [["timeSuitability", 0.2], ["lightingCondition", 0.2], ["crowdDensity", 0.2], ["aestheticBackground", 0.15], ["accessibility", 0.15], ["noiseLevel", 0.1]],
  astrophotography: [["lightPollution", 0.35], ["weatherSuitability", 0.3], ["crowdDensity", 0.15], ["timeSuitability", 0.1], ["windCondition", 0.1]],
};

function ScoreBreakdownPanel({ parameters, photoType, score, accentColor }) {
  const [open, setOpen] = useState(false);

  /* Build rows from real backend parameters */
  const p = parameters || {};
  const typeKey = (photoType || "").toLowerCase().replace(/\s+/g, "");
  const weights = PHOTO_WEIGHTS[typeKey] || Object.keys(PARAM_META).map(k => [k, 0.1]);
  const hasData = Object.keys(p).length > 0;

  const rows = weights.map(([key, wt]) => {
    const val = p[key] ?? 0;
    const pct = Math.round(val * 100);
    const contrib = Math.round(val * wt * 100);
    const meta = PARAM_META[key] || { label: key, icon: "◈" };
    const color = pct >= 70 ? "#5bbf6a" : pct >= 45 ? accentColor : "#c0614a";
    return { key, label: meta.label, icon: meta.icon, pct, contrib, wt, color };
  }).sort((a, b) => b.contrib - a.contrib);
  const topBoost = rows[0];
  const topDrag = [...rows].sort((a, b) => a.pct - b.pct)[0];

  return (
    <div className="sbp-wrap">
      <button className="sbp-trigger" style={{ borderColor: `${accentColor}55`, color: accentColor }} onClick={() => setOpen(v => !v)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
        Score Breakdown <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: "inline-block", marginLeft: 4 }}>▾</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="sbp-panel"
            style={{ borderColor: `${accentColor}22` }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* ── Header: score + verdicts ── */}
            <div className="sbp-header">
              <div className="sbp-score-block">
                <span className="sbp-score-num" style={{ color: accentColor }}>{score}</span>
                <span className="sbp-score-den">/100</span>
              </div>
              <div className="sbp-total-bar-wrap">
                <div className="sbp-total-bar-track">
                  <motion.div className="sbp-total-bar-fill"
                    style={{ background: accentColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                </div>
                <div className="sbp-verdicts">
                  {hasData && topBoost && (
                    <span className="sbp-verdict sbp-verdict--up">
                      ▲ {topBoost.icon} {topBoost.label} <em>({topBoost.pct}%)</em>
                    </span>
                  )}
                  {hasData && topDrag && (
                    <span className="sbp-verdict sbp-verdict--down">
                      ▼ {topDrag.icon} {topDrag.label} <em>({topDrag.pct}%)</em>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Param rows ── */}
            {hasData ? (
              <div className="sbp-rows">
                {rows.map((r, i) => (
                  <motion.div key={r.key} className="sbp-row"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.035 }}
                  >
                    <span className="sbp-row-icon">{r.icon}</span>
                    <div className="sbp-row-mid">
                      <div className="sbp-row-top">
                        <span className="sbp-row-label">{r.label}</span>
                        <span className="sbp-row-weight">×{Math.round(r.wt * 100)}%</span>
                      </div>
                      <div className="sbp-bar-track">
                        <motion.div className="sbp-bar-fill"
                          style={{ background: r.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${r.pct}%` }}
                          transition={{ duration: 0.65, delay: i * 0.035, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                    <div className="sbp-row-right">
                      <span className="sbp-row-pct" style={{ color: r.color }}>{r.pct}%</span>
                      <span className="sbp-row-pts">+{r.contrib}pts</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="sbp-nodata">
                No parameter data returned from backend for this location.
              </div>
            )}

            <div className="sbp-footer">
              ◈ Score = Σ (parameter × weight) for <em>{photoType || "selected"}</em> photography
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HoverCard({ location, rank, photoType }) {
  const rp = RANK_PALETTE[rank] ?? RANK_PALETTE[0];
  const svUrl  = streetViewUrl(location.lat, location.lng, 560, 200);
  const satUrl = satelliteUrl(location.lat, location.lng, 560, 200);

  // ── NEW: verify street-view exists before committing to it ──
  const [imgSrc, setImgSrc]   = useState(null);
  const [imgReady, setReady]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (location.lat && location.lng) {
        const ok = await hasStreetView(location.lat, location.lng);
        if (!cancelled) setImgSrc(ok ? svUrl : satUrl);
      } else {
        if (!cancelled) setImgSrc(satUrl);
      }
      if (!cancelled) setReady(true);
    }
    resolve();
    return () => { cancelled = true; };
  }, [location.lat, location.lng]);

  return (
    <motion.div
      className="rp-hover-card"
      initial={{ opacity: 0, y: 8, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ borderColor: rp.color }}
    >
      <div className="rp-hc-tail" style={{ borderBottomColor: rp.color }} />
      <div className="rp-hc-strip" style={{ background: `${rp.color}22`, borderBottom: `1px solid ${rp.color}33` }}>
        <span className="rp-hc-dot" style={{ background: rp.color, boxShadow: `0 0 8px ${rp.color}` }} />
        <span className="rp-hc-rank-label" style={{ color: rp.color }}>{rp.label}</span>
        <span className="rp-hc-badge">{rp.badge}</span>
        <span className="rp-hc-score-pill" style={{ color: rp.color, borderColor: `${rp.color}44` }}>
          {location.score ?? 0}<span style={{ fontSize: 10, opacity: 0.6 }}>/100</span>
        </span>
      </div>

      {/* ── image area ── */}
      <div className="rp-hc-img-wrap">
        {!imgReady ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--bg-panel)', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading…
          </div>
        ) : imgSrc ? (
          <>
            <img
              src={imgSrc}
              alt={location.name}
              className="rp-hc-img"
              onError={() => setImgSrc(satUrl)}   // last-ditch fallback
            />
            <div className="rp-hc-img-overlay" />
          </>
        ) : null}
      </div>

      <div className="rp-hc-body">
        <div className="rp-hc-name">{location.name}</div>
        <div className="rp-hc-chips">
          {location.distance != null && (
            <span className="rp-chip">
              📏 {typeof location.distance === "number" ? location.distance.toFixed(1) : location.distance} km
            </span>
          )}
          {photoType && (
            <span className="rp-chip rp-chip--type">
              📷 {photoType.charAt(0).toUpperCase() + photoType.slice(1)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CARD IMAGE  — street-view with satellite fallback
───────────────────────────────────────────────────────────── */
    function CardImage({ location, imgUrl }) {
    const satUrl = satelliteUrl(location.lat, location.lng, 600, 260);
    const [src, setSrc] = useState(null); // start null, resolve after metadata check
    const [checked, setChecked] = useState(false);

    useEffect(() => {
      let cancelled = false;
      async function resolve() {
        if (location.lat && location.lng) {
          const ok = await hasStreetView(location.lat, location.lng);
          if (!cancelled) setSrc(ok ? imgUrl : satUrl);
        } else {
          if (!cancelled) setSrc(satUrl);
        }
        if (!cancelled) setChecked(true);
      }
      resolve();
      return () => { cancelled = true; };
    }, [location.lat, location.lng]);

    if (!checked) {
      return (
        <div className="rp-card-img-fallback" style={{ display: "flex" }}>
          <span>⏳</span><span>Loading map…</span>
        </div>
      );
    }

    if (!src) {
      return (
        <div className="rp-card-img-fallback" style={{ display: "flex" }}>
          <span>📷</span><span>{location.name}</span>
        </div>
      );
    }

    return (
      <img
        src={src}
        alt={location.name}
        className="rp-card-img"
        onError={() => setSrc(satUrl)}
      />
    );
  }

function LocationCard({ location, rank, photoType, dateTime, payload, isFavorited, onFavoriteToggle, onSchedule, onAlreadyVisited, onViewReviews }) {
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const rp = RANK_PALETTE[rank] ?? RANK_PALETTE[0];
  const highlights = location.highlights?.length ? location.highlights.slice(0, 4) : generateHighlights(location.parameters, photoType);
  const routeUrl = location.routeUrl || (location.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&travelmode=driving` : null);
  const imgUrl = streetViewUrl(location.lat, location.lng, 600, 260);
  async function handleReport() {
    setReportLoading(true);
    setReportError(null);
    setReportSuccess(false);
    try {
      await generateReport(location, photoType, dateTime, payload);
      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 3500);
    } catch (err) {
      setReportError("Failed to generate report. Try again.");
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  }
  return (
    <motion.div className="rp-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: rank * 0.12 }} layout style={{ position: 'relative' }}>
      <button 
        onClick={(e) => { e.stopPropagation(); onFavoriteToggle(); }} 
        className={`rp-fav-btn ${isFavorited ? 'rp-fav-btn--active' : ''}`}
        title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
      <div className="rp-strip" style={{ background: rp.color }}><span className="rp-strip-rank">{rp.label}</span><span className="rp-strip-badge">{rp.badge}</span></div>
      <div className="rp-card-img-wrap">
      <CardImage location={location} imgUrl={imgUrl} />
      <div className="rp-card-img-score" style={{ borderColor: rp.color, color: rp.color }}>
        <span className="rp-card-img-score-val">{location.score ?? 0}</span>
        <span className="rp-card-img-score-den">/100</span>
      </div>
    </div>
      <div className="rp-card-body">
        <div className="rp-info">
          <h3 className="rp-name">{location.name}</h3>
          {location.area && <p className="rp-area">📍 {location.area}</p>}

          {/* Highlights */}
          {highlights.length > 0 && (
            <ul className="rp-highlights">
              {highlights.map((h, i) => (
                <motion.li key={i} className="rp-hl"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rank * 0.1 + i * 0.06 + 0.3 }}
                >
                  <span className="rp-hl-dot" style={{ color: rp.color }}>▸</span> {h}
                </motion.li>
              ))}
            </ul>
          )}

          {/* ── Score Breakdown ── */}
          <ScoreBreakdownPanel
            parameters={location.parameters}
            photoType={photoType}
            score={location.score ?? 0}
            accentColor={rp.color}
          />

          {/* ── Get Directions — full width centered ── */}
          {routeUrl && (
            <a className="rp-btn rp-btn--nav rp-btn--full" href={routeUrl}
              target="_blank" rel="noopener noreferrer"
              style={{ background: rp.color, color: "#0a0a0b" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Get Directions
            </a>
          )}

          {/* ── Download Report ── */}
          <button
            className={`rp-btn rp-btn--report rp-btn--full ${
              reportLoading ? "rp-btn--loading" : ""
            }${reportSuccess ? " rp-btn--report-success" : ""}`}
            onClick={handleReport}
            disabled={reportLoading || reportSuccess}
            title="Generate and download a detailed PDF analysis report"
          >
            {reportLoading ? (
              <><span className="rp-btn-spinner" />Generating report…</>
            ) : reportSuccess ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Downloading…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Report
              </>
            )}
          </button>
          {reportError && <p className="rp-report-error">{reportError}</p>}

          {/* ── Schedule Visit — full width primary ── */}
          <motion.button
            className="rp-btn rp-btn--schedule rp-btn--full"
            onClick={(e) => { e.stopPropagation(); onSchedule?.(); }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Schedule Visit
          </motion.button>

          {/* ── Been Here? Review — full width ── */}
          <motion.button
            className="rp-btn rp-btn--write-review rp-btn--full"
            onClick={(e) => { e.stopPropagation(); onAlreadyVisited?.(); }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Been Here? Write a Review
          </motion.button>

          {/* ── View Reviews — subtle text link ── */}
          <motion.button
            className="rp-view-reviews-link"
            onClick={(e) => { e.stopPropagation(); onViewReviews?.(); }}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            View community reviews →
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const results = state?.results || [];
  const payload = state?.payload || null;
  const photoType = payload?.photographyType || "";
  const dateTime = payload?.dateTime || null;

  const [hovered, setHovered] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeReviewsPlace, setActiveReviewsPlace] = useState(null); // { placeId, placeName }
  const [placeReviews, setPlaceReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsMeta, setReviewsMeta] = useState({ count: 0, avgRating: 0 });
  const reviewsSectionRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    fetch(`${API_BASE}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setFavorites(data))
      .catch(err => console.error(err));
  }, []);

  const topResults = results.slice(0, 3);
  const photoLabel = photoType ? photoType.charAt(0).toUpperCase() + photoType.slice(1).replace(/_/g, " ") : null;
  const primaryPhotoScores = topResults[0] ? (topResults[0].photoTypeScores ?? computePhotoTypeScores(topResults[0].parameters)) : {};

  const isFavorited = (locationName) => favorites.some(f => f.locationName === locationName);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleFavoriteToggle = async (location) => {
    const token = localStorage.getItem('accessToken');
    if (!token) { navigate('/login'); return; }
    const already = isFavorited(location.name);
    if (already) {
      alert('Already in your Favorites list.');
      return;
    }
    const highlights = location.highlights?.length 
      ? location.highlights.slice(0, 3) 
      : generateHighlights(location.parameters, photoType).slice(0, 3);
    try {
      const res = await fetch(`${API_BASE}/api/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          locationName: location.name,
          score: location.score,
          imageUrl: location.imageUrl || (location.lat && location.lng ? streetViewUrl(location.lat, location.lng, 200, 200) : ''),
          photographyType: photoType,
          highlights: highlights,
        }),
      });
      if (res.ok) {
        const newFav = await res.json();
        setFavorites(prev => [...prev, newFav.favorite]);
        showToast('❤️ Added to your Favorites!');
      } else {
        alert('Could not save favorite.');
      }
    } catch (err) { console.error(err); alert('Error saving favorite'); }
  };

  const handleAlreadyVisited = async (location) => {
    const token = localStorage.getItem('accessToken');
    if (!token) { navigate('/login'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/activity/visited`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          placeId: location.placeId || location.id || location.name,
          placeName: location.name,
          location: { lat: location.lat, lng: location.lng },
          photographyType: photoType,
          preview: {
            score: location.score,
            highlights: location.highlights?.slice(0, 3) || [],
            photographyType: photoType,
          },
        }),
      });
      if (res.ok) {
        showToast('✓ Marked as visited! We\'ll ask for your review soon.');
        // Offer immediate review
        setReviewTarget({ placeId: location.placeId || location.id || location.name, placeName: location.name });
      }
    } catch (err) { console.error(err); alert('Error marking as visited'); }
  };

  const handleScheduleClick = (location) => {
    const token = localStorage.getItem('accessToken');
    if (!token) { navigate('/login'); return; }
    setScheduleTarget({ ...location, photographyType: photoType });
  };

  const handleViewReviews = useCallback(async (location) => {
    const placeId = location.placeId || location.id || location.name;
    const placeName = location.name;

    // If same place clicked, toggle off
    if (activeReviewsPlace?.placeId === placeId) {
      setActiveReviewsPlace(null);
      setPlaceReviews([]);
      return;
    }

    setActiveReviewsPlace({ placeId, placeName });
    setReviewsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/review/place/${encodeURIComponent(placeId)}`);
      if (res.ok) {
        const data = await res.json();
        setPlaceReviews(data.reviews || []);
        setReviewsMeta({ count: data.count || 0, avgRating: data.avgRating || 0 });
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setReviewsLoading(false);
      // Scroll into view after a frame
      setTimeout(() => reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, [activeReviewsPlace]);

  return (
    <>
      <Navbar />
      <div className="results-root">
        <div className="r-bg-glow r-bg-glow--1" /><div className="r-bg-glow r-bg-glow--2" />
        <motion.header className="r-hero" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <h1 className="r-heading">Your <em>Perfect</em> Frames</h1>
          {payload && <motion.div className="r-pills" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            {photoLabel && <span className="r-pill r-pill--photo"><span className="r-pill-dot" />{photoLabel}</span>}
            {payload.radius && <span className="r-pill">◎ {Math.round(payload.radius / 1000)} km radius</span>}
            {payload.dateTime && <span className="r-pill">◷ {new Date(payload.dateTime).toLocaleString("en-IN",  { dateStyle:  "medium", timeStyle:  "short" })}</span>}
          </motion.div>}
        </motion.header>
        {topResults.length === 0 ? (
          <motion.div className="r-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="r-empty-icon">⬡</div>
            <h2 className="r-empty-title">No locations found</h2>
            <p className="r-empty-sub">Adjust your search radius or select a different photography type.</p>
            <Link to="/finder" className="rp-btn rp-btn--nav" style={{ marginTop: 12 }}>← Back to Finder</Link>
          </motion.div>
        ) : (
          <>
            <motion.div className="rp-meters-section" initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}>
              <div className="rp-meters-left">
                <div className="rp-meters-label">Suitability Overview</div>
                <div className="rp-meters-sub">Hover a marker to preview that location</div>
                {/* Rainbow arc */}
                <div className="rp-rainbow-and-popup">
                  <RainbowMeter
                    locations={topResults}
                    photoType={photoType}
                    hovered={hovered}
                    onHover={setHovered}
                  />
                </div>
                {/* HoverCard: absolutely positioned relative to rp-meters-left, upper-center of the arc */}
                <AnimatePresence>
                  {hovered !== null && topResults[hovered] && (
                    <HoverCard key={hovered} location={topResults[hovered]} rank={hovered} photoType={photoType} />
                  )}
                </AnimatePresence>
              </div>
              <div className="rp-meters-right">
                <div className="rp-meters-label">Genre Suitability</div>
                <div className="rp-meters-sub">How this spot performs across photography styles</div>
                <PhotoTypeDonut photoScores={primaryPhotoScores} size={280} />
              </div>
            </motion.div>
            <motion.div className="rp-breakdown" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <div className="rp-cards-grid">
                {topResults.map((loc, idx) => (
                  <LocationCard
                    key={loc.id ?? idx}
                    location={loc}
                    rank={idx}
                    photoType={photoType}
                    dateTime={dateTime}
                    payload={payload}
                    isFavorited={isFavorited(loc.name)}
                    onFavoriteToggle={() => handleFavoriteToggle(loc)}
                    onSchedule={() => handleScheduleClick(loc)}
                    onAlreadyVisited={() => handleAlreadyVisited(loc)}
                    onViewReviews={() => handleViewReviews(loc)}
                  />
                ))}
              </div>
            </motion.div>

            {/* ── Reviews Section ── */}
            <AnimatePresence>
              {activeReviewsPlace && (
                <motion.div
                  ref={reviewsSectionRef}
                  className="rv-section"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="rv-header">
                    <div className="rv-header-left">
                      <h2 className="rv-title">Reviews for <em>{activeReviewsPlace.placeName}</em></h2>
                      <div className="rv-meta">
                        {reviewsMeta.count > 0 ? (
                          <>
                            <span className="rv-avg">{"⭐".repeat(Math.round(reviewsMeta.avgRating))} {reviewsMeta.avgRating}</span>
                            <span className="rv-count">{reviewsMeta.count} review{reviewsMeta.count !== 1 ? 's' : ''}</span>
                          </>
                        ) : (
                          <span className="rv-count">No reviews yet</span>
                        )}
                      </div>
                    </div>
                    <button className="rv-close" onClick={() => { setActiveReviewsPlace(null); setPlaceReviews([]); }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>

                  {reviewsLoading ? (
                    <div className="rv-loading">
                      <span className="sched-btn-spinner" style={{ width: 20, height: 20 }} />
                      <p>Loading reviews…</p>
                    </div>
                  ) : placeReviews.length === 0 ? (
                    <div className="rv-empty">
                      <span className="rv-empty-icon">💬</span>
                      <p>No reviews yet for this location.</p>
                      <span className="rv-empty-sub">Be the first — schedule a visit and share your experience!</span>
                    </div>
                  ) : (
                    <div className="rv-list">
                      {placeReviews.map((r) => (
                        <motion.div
                          key={r._id}
                          className="rv-card"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="rv-card-header">
                            <div className="rv-avatar">{r.user.avatar}</div>
                            <div className="rv-user-info">
                              <span className="rv-user-name">{r.user.name}</span>
                              <span className="rv-date">{new Date(r.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                            </div>
                            <div className="rv-stars-display">
                              {[1,2,3,4,5].map(s => (
                                <svg key={s} width="14" height="14" viewBox="0 0 24 24"
                                  fill={s <= r.rating ? 'var(--accent)' : 'none'}
                                  stroke={s <= r.rating ? 'var(--accent)' : 'var(--text-muted)'}
                                  strokeWidth="1.5" strokeLinejoin="round">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          {r.reviewText && <p className="rv-text">{r.reviewText}</p>}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div className="r-footer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <p>◈ Scores derived from real-time weather, lighting, crowd density &amp; environmental data.<br />Conditions may shift — always verify on location before your shoot.</p>
              <Link to="/finder" className="r-back-link">← Refine Search</Link>
            </motion.div>
          </>
        )}

        {/* ── Toast ── */}
        <AnimatePresence>
          {toast && (
            <motion.div className="rp-toast"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Schedule Modal ── */}
      {scheduleTarget && (
        <ScheduleModal
          location={scheduleTarget}
          searchDateTime={dateTime}
          onClose={() => setScheduleTarget(null)}
          onScheduled={() => {
            setScheduleTarget(null);
            showToast('📅 Visit scheduled successfully!');
          }}
        />
      )}

      {/* ── Review Modal ── */}
      {reviewTarget && (
        <ReviewModal
          location={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => {
            setReviewTarget(null);
            showToast('⭐ Review submitted! Thank you.');
          }}
        />
      )}
    </>
  );
}