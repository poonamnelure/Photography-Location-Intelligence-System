import { useEffect, useRef, useState } from "react";
import "../css/SuitabilityMeter.css";

/* ─────────────────────────────────────────────────────────────
   THEME HOOK — reads CSS variables and re-reads on theme toggle
───────────────────────────────────────────────────────────── */
function useThemeVars(names) {
  const [vals, setVals] = useState(() => {
    const root = document.documentElement;
    return Object.fromEntries(
      names.map((n) => [n, getComputedStyle(root).getPropertyValue(n).trim()])
    );
  });

  useEffect(() => {
    const update = () => {
      const root = document.documentElement;
      setVals(
        Object.fromEntries(
          names.map((n) => [n, getComputedStyle(root).getPropertyValue(n).trim()])
        )
      );
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return vals;
}

/* ─────────────────────────────────────────────────────────────
   SHARED CONSTANTS
───────────────────────────────────────────────────────────── */
const PHOTO_WORDS = {
  astrophotography: { prime: "Stellar",    frame: "Clear",      soft: "Hazy",     off: "Murky"  },
  celebration:      { prime: "Magical",    frame: "Festive",    soft: "Basic",    off: "Avoid"  },
  landscape:        { prime: "Epic",       frame: "Scenic",     soft: "Decent",   off: "Flat"   },
  street:           { prime: "Iconic",     frame: "Buzzing",    soft: "Meh",      off: "Dead"   },
  portrait:         { prime: "Flawless",   frame: "Flattering", soft: "Passable", off: "Harsh"  },
  nature:           { prime: "Pristine",   frame: "Lush",       soft: "Okay",     off: "Barren" },
  architecture:     { prime: "Striking",   frame: "Solid",      soft: "Generic",  off: "Bland"  },
  sports:           { prime: "Electric",   frame: "Dynamic",    soft: "Sluggish", off: "Dead"   },
  default:          { prime: "Perfect",    frame: "Go For It",  soft: "Timepass", off: "Skip"   },
};

const TIERS = [
  { key: "off",   colorFrom: "#8B0000", colorTo: "#c0614a", min: 0,  max: 40  },
  { key: "soft",  colorFrom: "#c0614a", colorTo: "#d4a020", min: 40, max: 60  },
  { key: "frame", colorFrom: "#d4a020", colorTo: "#5bbf6a", min: 60, max: 80  },
  { key: "prime", colorFrom: "#5bbf6a", colorTo: "#c8a96e", min: 80, max: 100 },
];

function getTierLabels(photoType) {
  const key = (photoType || "").toLowerCase().replace(/\s+/g, "_");
  return PHOTO_WORDS[key] ?? PHOTO_WORDS.default;
}
function getTierKey(score) {
  if (score >= 80) return "prime";
  if (score >= 60) return "frame";
  if (score >= 40) return "soft";
  return "off";
}
function getActiveTier(score) {
  return TIERS.slice().reverse().find((t) => score >= t.min) ?? TIERS[0];
}
function getWord(score, photoType) {
  return getTierLabels(photoType)[getTierKey(score)];
}

/* ── SVG helpers ── */
function polarXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}
function scoreToDeg(score) {
  return Math.min(Math.max(score, 0), 100) * 1.8;
}
function arcD(cx, cy, r, startDeg, endDeg) {
  const [sx, sy] = polarXY(cx, cy, r, startDeg);
  const [ex, ey] = polarXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

const RANK_PALETTE = ["#c8a96e", "#8a9ab5", "#b87333"];
const RANK_LABELS  = ["#1", "#2", "#3"];

/* ─────────────────────────────────────────────────────────────
   METER 1 — Rainbow Semicircle
───────────────────────────────────────────────────────────── */
export function RainbowMeter({ locations = [], photoType = "", onHover, hovered }) {
  /*
   * All these vars are defined in SuitabilityMeter.css for BOTH themes.
   * The fallback string (second arg to ||) is only used on the very first
   * paint before the MutationObserver fires — kept dark as a safe default.
   */
  const tv = useThemeVars([
    "--sm-arc-track",
    "--sm-divider",
    "--sm-tick-major",
    "--sm-tick-minor",
    "--sm-scale-num",
    "--sm-sub-score",
  ]);

  const W = 420, H = 240;
  const cx = W / 2, cy = H - 10;
  const outerR = 170, innerR = 110;
  const midR = (outerR + innerR) / 2;
  const SW = outerR - innerR;
  const gradId = "rainbow-grad";

  const primaryScore = locations[0]?.score ?? 0;
  const activeScore  = hovered !== null ? (locations[hovered]?.score ?? 0) : primaryScore;
  const activeTier   = getActiveTier(activeScore);
  const word         = getWord(activeScore, photoType);
  const tierLabels   = getTierLabels(photoType);

  /* Tier label colors — always vivid, fine hardcoded on both themes */
  const tierLabelColors = {
    off:   "#c0614a",
    soft:  "#d4a020",
    frame: "#5bbf6a",
    prime: "#c8a96e",
  };

  /* Safe resolved values with sensible fallbacks */
  const arcTrack  = tv["--sm-arc-track"]  || "rgba(128,128,128,0.12)";
  const divider   = tv["--sm-divider"]    || "rgba(128,128,128,0.18)";
  const tickMajor = tv["--sm-tick-major"] || "rgba(128,128,128,0.22)";
  const tickMinor = tv["--sm-tick-minor"] || "rgba(128,128,128,0.14)";
  const scaleNum  = tv["--sm-scale-num"]  || "rgba(128,128,128,0.40)";
  const subScore  = tv["--sm-sub-score"]  || "rgba(128,128,128,0.45)";

  return (
    <div className="sm-rainbow-wrap">
      <svg
        width={W} height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="sm-rainbow-svg"
        overflow="visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#8B0000" />
            <stop offset="20%"  stopColor="#c0614a" />
            <stop offset="40%"  stopColor="#d4a020" />
            <stop offset="65%"  stopColor="#5bbf6a" />
            <stop offset="100%" stopColor="#c8a96e" />
          </linearGradient>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Background arc track ── */}
        <path
          d={arcD(cx, cy, midR, 0, 180)}
          fill="none"
          stroke={arcTrack}
          strokeWidth={SW}
          strokeLinecap="butt"
        />

        {/* ── Dim gradient overlay on track ── */}
        <path
          d={arcD(cx, cy, midR, 0, 180)}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={SW}
          strokeLinecap="butt"
          opacity="0.15"
        />

        {/* ── Tier divider lines ── */}
        {[40, 60, 80].map((v) => {
          const deg = scoreToDeg(v);
          const [ix, iy] = polarXY(cx, cy, innerR - 2, deg);
          const [ox, oy] = polarXY(cx, cy, outerR + 2, deg);
          return (
            <line key={v} x1={ix} y1={iy} x2={ox} y2={oy}
              stroke={divider}
              strokeWidth="1.5"
            />
          );
        })}

        {/* ── Active arc fill ── */}
        <path
          d={arcD(cx, cy, midR, 0, scoreToDeg(activeScore))}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={SW}
          strokeLinecap="butt"
          filter="url(#glow)"
          style={{ transition: "d 0.6s cubic-bezier(0.4,0,0.2,1)" }}
        />

        {/* ── Tier label text on arc ── */}
        {[
          { labelKey: "off",   deg: 18  },
          { labelKey: "soft",  deg: 72  },
          { labelKey: "frame", deg: 126 },
          { labelKey: "prime", deg: 162 },
        ].map(({ labelKey, deg }) => {
          const [tx, ty] = polarXY(cx, cy, outerR + 18, deg);
          return (
            <text
              key={labelKey}
              x={tx} y={ty}
              textAnchor="middle" dominantBaseline="middle"
              fill={tierLabelColors[labelKey]}
              fontSize="9"
              fontFamily="'DM Sans',sans-serif"
              fontWeight="500" letterSpacing="0.08em"
              opacity="0.9"
            >
              {tierLabels[labelKey]}
            </text>
          );
        })}

        {/* ── Scale tick marks ── */}
        {[0, 20, 40, 60, 80, 100].map((v) => {
          const deg = scoreToDeg(v);
          const [ix, iy] = polarXY(cx, cy, innerR - 6, deg);
          const [ox, oy] = polarXY(cx, cy, outerR + 6, deg);
          return (
            <line key={v} x1={ix} y1={iy} x2={ox} y2={oy}
              stroke={v % 40 === 0 ? tickMajor : tickMinor}
              strokeWidth={v % 40 === 0 ? "2" : "1"}
            />
          );
        })}

        {/* ── Location markers ── */}
        {locations.slice(0, 3).map((loc, i) => {
          const deg = scoreToDeg(loc.score ?? 0);
          const [mx, my] = polarXY(cx, cy, midR, deg);
          const isHov = hovered === i;
          const col = RANK_PALETTE[i];
          return (
            <g key={i} style={{ cursor: "pointer" }}
              onMouseEnter={() => onHover?.(i)}
              onMouseLeave={() => onHover?.(null)}
            >
              {isHov && (
                <circle cx={mx} cy={my} r={18} fill="none"
                  stroke={col} strokeWidth="1.5" opacity="0.4"
                  style={{ animation: "sm-pulse 1.2s ease-out infinite" }}
                />
              )}
              <circle
                cx={mx} cy={my}
                r={isHov ? 13 : 10}
                fill={col}
                opacity={isHov ? 1 : 0.85}
                filter={isHov ? "url(#glow)" : "none"}
                style={{ transition: "r 0.2s ease" }}
              />
              <text
                x={mx} y={my + 0.5}
                textAnchor="middle" dominantBaseline="middle"
                fill="#0a0a0b"
                fontSize={isHov ? "9" : "8"}
                fontFamily="'DM Sans',sans-serif"
                fontWeight="700"
              >
                {RANK_LABELS[i]}
              </text>
            </g>
          );
        })}

        {/* ── Centre score number ── */}
        <text
          x={cx} y={cy - outerR * 0.18}
          textAnchor="middle"
          fill={activeTier.colorTo}
          fontSize="52"
          fontFamily="'Cormorant Garamond',serif"
          fontWeight="500"
          style={{ filter: `drop-shadow(0 0 18px ${activeTier.colorTo}88)` }}
        >
          {activeScore}
        </text>

        {/* ── "/100" sub-label ── */}
        <text
          x={cx} y={cy - outerR * 0.18 + 28}
          textAnchor="middle"
          fill={subScore}
          fontSize="13"
          fontFamily="'DM Sans',sans-serif"
        >
          / 100
        </text>

        {/* ── Tier word (e.g. "Hazy") ── */}
        <text
          x={cx} y={cy - outerR * 0.18 + 50}
          textAnchor="middle"
          fill={activeTier.colorTo}
          fontSize="15"
          fontFamily="'DM Sans',sans-serif"
          fontWeight="500" letterSpacing="0.06em"
          style={{ filter: `drop-shadow(0 0 10px ${activeTier.colorTo}88)` }}
        >
          {word}
        </text>

        {/* ── "0" and "100" scale numbers at arc ends ── */}
        <text
          x={cx - outerR + 4} y={cy + 16}
          textAnchor="middle"
          fill={scaleNum}
          fontSize="10"
          fontFamily="'DM Sans',sans-serif"
        >
          0
        </text>
        <text
          x={cx + outerR - 4} y={cy + 16}
          textAnchor="middle"
          fill={scaleNum}
          fontSize="10"
          fontFamily="'DM Sans',sans-serif"
        >
          100
        </text>
      </svg>

      {/* ── Location legend rows ── */}
      <div className="sm-loc-legend">
        {locations.slice(0, 3).map((loc, i) => {
          const col   = RANK_PALETTE[i];
          const isHov = hovered === i;
          return (
            <div
              key={i}
              className={`sm-loc-item${isHov ? " sm-loc-item--active" : ""}`}
              style={{ borderColor: isHov ? col : "transparent" }}
              onMouseEnter={() => onHover?.(i)}
              onMouseLeave={() => onHover?.(null)}
            >
              <span
                className="sm-loc-dot"
                style={{ background: col, boxShadow: isHov ? `0 0 8px ${col}` : "none" }}
              />
              {/* rank & score: accent palette colour — always vivid on both themes */}
              <span className="sm-loc-rank" style={{ color: col }}>{RANK_LABELS[i]}</span>
              {/* name: colour from CSS var --sm-loc-name-clr, switches on theme */}
              <span className="sm-loc-name">{loc.name}</span>
              <span className="sm-loc-score" style={{ color: col }}>{loc.score ?? 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   METER 2 — Photography Type Donut
───────────────────────────────────────────────────────────── */
const PHOTO_TYPES = [
  { key: "astrophotography", label: "Astrophoto",  color: "#4aafdc" },
  { key: "celebration",      label: "Celebration", color: "#e879a0" },
  { key: "landscape",        label: "Landscape",   color: "#5bbf6a" },
  { key: "street",           label: "Street",      color: "#7c6fcd" },
];

export function PhotoTypeDonut({ photoScores = {}, size = 240 }) {
  const [hovered, setHovered] = useState(null);
  const [animPct, setAnimPct] = useState(0);
  const rafRef                = useRef(null);

  /*
   * All vars defined in SuitabilityMeter.css for both themes.
   * Neutral grey fallbacks so the component is always readable
   * even before the CSS has been parsed.
   */
  const tv = useThemeVars([
    "--ptd-track",
    "--ptd-center-label",
    "--ptd-center-sub",
    "--ptd-leg-label",
    "--ptd-leg-pct",
    "--ptd-bar-track",
  ]);

  useEffect(() => {
    const dur = 1200, t0 = performance.now();
    const tick = (now) => {
      const t = Math.min((now - t0) / dur, 1);
      setAnimPct(1 - Math.pow(1 - t, 3));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.43;
  const innerR = size * 0.28;
  const midR   = (outerR + innerR) / 2;
  const SW     = outerR - innerR;
  const GAP    = 4;

  const raw   = PHOTO_TYPES.map((pt) => ({ ...pt, score: Math.max(photoScores[pt.key] ?? 0, 0) }));
  const total = raw.reduce((s, p) => s + p.score, 0) || 1;

  let cursor = -90;
  const segs = raw.map((p) => {
    const span  = (p.score / total) * 360 * animPct;
    const start = cursor + GAP / 2;
    const end   = cursor + span - GAP / 2;
    cursor += span;
    return { ...p, start, end, pct: Math.round((p.score / total) * 100) };
  });

  const toRad = (d) => (d * Math.PI) / 180;
  const segPath = (s, e) => {
    const sx = cx + midR * Math.cos(toRad(s));
    const sy = cy + midR * Math.sin(toRad(s));
    const ex = cx + midR * Math.cos(toRad(e));
    const ey = cy + midR * Math.sin(toRad(e));
    return `M ${sx} ${sy} A ${midR} ${midR} 0 ${e - s > 180 ? 1 : 0} 1 ${ex} ${ey}`;
  };

  const hovSeg = hovered !== null ? segs[hovered] : null;

  /* Resolved values — neutral fallback works on both themes */
  const arcTrack    = tv["--ptd-track"]          || "rgba(128,128,128,0.08)";
  const centerLabel = tv["--ptd-center-label"]   || "rgba(128,128,128,0.45)";
  const centerSub   = tv["--ptd-center-sub"]     || "rgba(128,128,128,0.55)";
  const legLabel    = tv["--ptd-leg-label"]      || "rgba(128,128,128,0.65)";
  const legPct      = tv["--ptd-leg-pct"]        || "rgba(128,128,128,0.45)";
  const barTrack    = tv["--ptd-bar-track"]      || "rgba(128,128,128,0.10)";

  return (
    <div className="ptd-wrap">
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          {PHOTO_TYPES.map((pt) => (
            <filter key={pt.key} id={`glow-${pt.key}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feFlood floodColor={pt.color} floodOpacity="0.7" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {/* ── Background track ring ── */}
        <circle
          cx={cx} cy={cy} r={midR}
          fill="none"
          stroke={arcTrack}
          strokeWidth={SW}
        />

        {/* ── Donut segments ── */}
        {segs.map((seg, i) => {
          if (seg.end <= seg.start) return null;
          const isHov    = hovered === i;
          const inactive = hovered !== null && !isHov;
          return (
            <path
              key={seg.key}
              d={segPath(seg.start, seg.end)}
              fill="none"
              stroke={seg.color}
              strokeWidth={SW}
              strokeLinecap="butt"
              opacity={inactive ? 0.22 : 1}
              filter={isHov ? `url(#glow-${seg.key})` : "none"}
              style={{
                cursor: "pointer",
                transition: "opacity 0.25s ease, filter 0.25s ease",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        {/* ── Centre label — hovered shows genre details, else generic ── */}
        {hovSeg ? (
          <>
            <text
              x={cx} y={cy - size * 0.1}
              textAnchor="middle" dominantBaseline="middle"
              fill={hovSeg.color}
              fontSize={size * 0.085}
              fontFamily="'DM Sans',sans-serif"
              fontWeight="600" letterSpacing="0.04em"
              style={{ filter: `drop-shadow(0 0 8px ${hovSeg.color}99)` }}
            >
              {hovSeg.label}
            </text>
            <text
              x={cx} y={cy + size * 0.08}
              textAnchor="middle" dominantBaseline="middle"
              fill={hovSeg.color}
              fontSize={size * 0.2}
              fontFamily="'Cormorant Garamond',serif"
              fontWeight="500"
              style={{ filter: `drop-shadow(0 0 14px ${hovSeg.color}88)` }}
            >
              {hovSeg.pct}%
            </text>
            <text
              x={cx} y={cy + size * 0.22}
              textAnchor="middle" dominantBaseline="middle"
              fill={hovSeg.color}
              fontSize={size * 0.065}
              fontFamily="'DM Sans',sans-serif"
              opacity="0.65"
            >
              score: {hovSeg.score}
            </text>
          </>
        ) : (
          <>
            {/* ── "GENRE" label — theme-aware via CSS var ── */}
            <text
              x={cx} y={cy - size * 0.06}
              textAnchor="middle" dominantBaseline="middle"
              fill={centerLabel}
              fontSize={size * 0.08}
              fontFamily="'DM Sans',sans-serif"
              letterSpacing="0.12em"
            >
              GENRE
            </text>
            {/* ── "Suitability" label — theme-aware via CSS var ── */}
            <text
              x={cx} y={cy + size * 0.07}
              textAnchor="middle" dominantBaseline="middle"
              fill={centerSub}
              fontSize={size * 0.1}
              fontFamily="'Cormorant Garamond',serif"
            >
              Suitability
            </text>
          </>
        )}
      </svg>

      {/* ── Legend ── */}
      <div className="ptd-legend">
        {segs.map((seg, i) => {
          const isHov    = hovered === i;
          const inactive = hovered !== null && !isHov;
          return (
            <div
              key={seg.key}
              className="ptd-leg-item"
              style={{
                background:  isHov ? `${seg.color}12` : "transparent",
                borderColor: isHov ? `${seg.color}44` : "transparent",
                opacity:     inactive ? 0.38 : 1,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Colour dot */}
              <span
                className="ptd-leg-dot"
                style={{
                  background: seg.color,
                  boxShadow:  isHov ? `0 0 10px 2px ${seg.color}88` : "none",
                  transform:  isHov ? "scale(1.35)" : "scale(1)",
                }}
              />

              {/* Label — accent colour when hovered, CSS var otherwise */}
              <span
                className="ptd-leg-label"
                style={{
                  color:      isHov ? seg.color : legLabel,
                  fontWeight: isHov ? "600" : "400",
                }}
              >
                {seg.label}
              </span>

              {/* Mini bar */}
              <div className="ptd-leg-bar-wrap" style={{ background: barTrack }}>
                <div
                  className="ptd-leg-bar-fill"
                  style={{
                    width:     `${seg.pct}%`,
                    background: seg.color,
                    opacity:    isHov ? 1 : 0.45,
                    boxShadow:  isHov ? `0 0 6px ${seg.color}` : "none",
                  }}
                />
              </div>

              {/* Percentage — accent colour when hovered, CSS var otherwise */}
              <span
                className="ptd-leg-pct"
                style={{
                  color:      isHov ? seg.color : legPct,
                  fontWeight: isHov ? "600" : "400",
                }}
              >
                {seg.pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}