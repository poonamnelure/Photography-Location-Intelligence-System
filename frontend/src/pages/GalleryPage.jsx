// src/pages/GalleryPage.jsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Navbar from '../components/Navbar';
import '../css/gallery.css';

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
const POLL_MS = 2500;

const PHOTO_TYPES = [
  { id: 'LANDSCAPE',        label: 'Landscape',        icon: '🏔' },
  { id: 'PORTRAIT',         label: 'Portrait',          icon: '👤' },
  { id: 'STREET',           label: 'Street',            icon: '🏙' },
  { id: 'ASTROPHOTOGRAPHY', label: 'Astrophotography',  icon: '🌌' },
  { id: 'WILDLIFE',         label: 'Wildlife',          icon: '🦁' },
  { id: 'ARCHITECTURE',     label: 'Architecture',      icon: '🏛' },
  { id: 'GENERAL',          label: 'General',           icon: '📷' },
];

const CATEGORY_META = {
  BEST:     { label: 'Best',     color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', dot: '#c8a96e' },
  AVERAGE:  { label: 'Average',  color: '#7a9fd4', bg: 'rgba(122,159,212,0.10)', dot: '#7a9fd4' },
  REJECTED: { label: 'Rejected', color: '#d46b6b', bg: 'rgba(212,107,107,0.10)', dot: '#d46b6b' },
};

const LIGHTING_LABELS = {
  GOLDEN_HOUR:  '🌅 Golden Hour',
  BLUE_HOUR:    '🌆 Blue Hour',
  LOW_KEY:      '🎭 Low Key',
  HIGH_KEY:     '☀ High Key',
  NIGHT:        '🌙 Night',
  OVEREXPOSED:  '⚠ Overexposed',
  UNDEREXPOSED: '⚠ Underexposed',
  NORMAL:       '💡 Normal',
};

/* ─────────────────────────────────────────────────────────
   ANIMATION VARIANTS
───────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: (i = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.34, 1.56, 0.64, 1] },
  }),
};

const slideRight = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
const pct = (v) => `${Math.round((v || 0) * 100)}%`;
const scoreColor = (v) =>
  v >= 0.75 ? '#c8a96e' : v >= 0.50 ? '#a8b87a' : v >= 0.30 ? '#7a9fd4' : '#d46b6b';

/* ─────────────────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────────────────── */
const AnimatedCounter = ({ value, duration = 1.2 }) => {
  const [display, setDisplay] = useState(0);
  const target = Math.round((value || 0) * 100);

  useEffect(() => {
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <>{display}</>;
};

/* ─────────────────────────────────────────────────────────
   RADIAL SCORE RING
───────────────────────────────────────────────────────── */
const ScoreRing = ({ value, size = 64, strokeW = 5, label, delay = 0 }) => {
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - (value || 0));
  const color = scoreColor(value);

  return (
    <motion.div
      className="gl-ring-wrap"
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={strokeW}
          strokeLinecap="round"
          initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, delay: delay + 0.1, ease: 'easeOut' }}
        />
      </svg>
      <div className="gl-ring-inner">
        <span className="gl-ring-num" style={{ color }}>
          <AnimatedCounter value={value} duration={1.0} />
        </span>
        {label && <span className="gl-ring-label">{label}</span>}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────
   SCORE BAR
───────────────────────────────────────────────────────── */
const ScoreBar = ({ label, value, delay = 0 }) => (
  <motion.div
    className="gl-bar-row"
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <span className="gl-bar-label">{label}</span>
    <div className="gl-bar-track">
      <motion.div
        className="gl-bar-fill"
        style={{ background: scoreColor(value) }}
        initial={{ width: 0 }}
        animate={{ width: pct(value) }}
        transition={{ duration: 0.8, delay: delay + 0.15, ease: 'easeOut' }}
      />
    </div>
    <span className="gl-bar-pct" style={{ color: scoreColor(value) }}>{pct(value)}</span>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────
   COLOUR PALETTE
───────────────────────────────────────────────────────── */
const ColorPalette = ({ swatches = [] }) => (
  <div className="gl-palette">
    {swatches.slice(0, 5).map((s, i) => (
      <motion.div
        key={i} className="gl-swatch-wrap"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: i * 0.06 }}
      >
        <div className="gl-swatch" style={{ background: s.hex }} title={s.hex} />
        <span className="gl-swatch-hex">{s.hex}</span>
      </motion.div>
    ))}
  </div>
);

/* ─────────────────────────────────────────────────────────
   3D TILT CARD WRAPPER
───────────────────────────────────────────────────────── */
const TiltCard = ({ children, className, style }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  const springY = useSpring(y, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-6, 6]);
  const glare  = useTransform(springX, [-0.5, 0.5], [0, 0.08]);

  const onMouseMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...style, rotateX, rotateY, transformStyle: 'preserve-3d', position: 'relative' }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <motion.div
        style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
          background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, transparent 60%)',
          opacity: glare, zIndex: 2,
        }}
      />
      {children}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────
   PHOTO CARD
───────────────────────────────────────────────────────── */
const PhotoCard = ({ photo, index }) => {
  const [open, setOpen] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const cat = CATEGORY_META[photo.category] || CATEGORY_META.REJECTED;
  const a = photo.analysis || {};
  const s = photo.scores || {};
  const fb = photo.feedback || {};

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      layout
    >
      <TiltCard
        className="gl-photo-card"
        style={{ '--cat-color': cat.color, '--cat-bg': cat.bg }}
      >
        {/* ── Image ── */}
        <div className="gl-photo-img-wrap">
          {!imgLoaded && !imgErr && (
            <div className="gl-img-skeleton">
              <div className="gl-skeleton-shimmer" />
            </div>
          )}
          {!imgErr ? (
            <motion.img
              className="gl-photo-img"
              src={`${API.replace('/api', '')}${photo.imageUrl}`}
              alt="Uploaded photo"
              onError={() => setImgErr(true)}
              onLoad={() => setImgLoaded(true)}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={imgLoaded ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ display: imgLoaded ? 'block' : 'none' }}
            />
          ) : (
            <div className="gl-photo-fallback"><span>📷</span></div>
          )}

          {/* Category badge */}
          <motion.div
            className="gl-cat-badge"
            style={{ background: cat.bg, color: cat.color, borderColor: cat.color }}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + index * 0.05 }}
          >
            <span className="gl-cat-dot" style={{ background: cat.color }} />
            {cat.label}
          </motion.div>

          {/* Lighting badge */}
          {a.lightingStyle && (
            <motion.div
              className="gl-lighting-badge"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
            >
              {LIGHTING_LABELS[a.lightingStyle] || a.lightingStyle}
            </motion.div>
          )}

          {/* Overlay score on hover */}
          <div className="gl-img-overlay">
            <span className="gl-img-overlay-score" style={{ color: scoreColor(s.qualityScore) }}>
              {Math.round((s.qualityScore || 0) * 100)}
            </span>
            <span className="gl-img-overlay-den">/100</span>
          </div>
        </div>

        {/* ── Score rings ── */}
        <div className="gl-scores-row">
          <div className="gl-score-block">
            <ScoreRing value={s.qualityScore}   size={60} label="Quality"   delay={0.1 + index * 0.04} />
          </div>
          <div className="gl-score-block">
            <ScoreRing value={s.aestheticScore} size={60} label="Aesthetic" delay={0.18 + index * 0.04} />
          </div>
          <div className="gl-score-block">
            <ScoreRing value={a.sharpnessScore} size={60} label="Sharp"     delay={0.26 + index * 0.04} />
          </div>
        </div>

        {/* ── Chips ── */}
        <motion.div
          className="gl-chip-row"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 + index * 0.04 }}
        >
          {a.megapixels    && <span className="gl-chip">{a.megapixels} MP</span>}
          {a.colorTemperature && <span className="gl-chip">{a.colorTemperature}</span>}
          {a.isGoldenHour  && <span className="gl-chip gl-chip--gold">Golden Hr</span>}
          {a.isBlurry      && <span className="gl-chip gl-chip--warn">Blurry</span>}
          {a.isOverexposed && <span className="gl-chip gl-chip--warn">Overexp.</span>}
          {a.faces?.count > 0 && <span className="gl-chip">{a.faces.count} face{a.faces.count > 1 ? 's' : ''}</span>}
          {a.scene         && <span className="gl-chip">{a.scene}</span>}
        </motion.div>

        {/* ── Color palette ── */}
        {a.colorPalette?.length > 0 && <ColorPalette swatches={a.colorPalette} />}

        {/* ── Feedback reasons ── */}
        {fb.reasons?.length > 0 && (
          <motion.div
            className="gl-feedback gl-feedback--ok"
            variants={slideRight}
            initial="hidden"
            animate="visible"
          >
            <span className="gl-fb-icon">✦</span>
            <div>
              {fb.reasons.slice(0, 2).map((r, i) => (
                <motion.p
                  key={i} className="gl-fb-line"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                >
                  {r}
                </motion.p>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Feedback warnings ── */}
        {fb.warnings?.length > 0 && (
          <motion.div
            className="gl-feedback gl-feedback--warn"
            variants={slideRight}
            initial="hidden"
            animate="visible"
          >
            <span className="gl-fb-icon">⚠</span>
            <div>
              {fb.warnings.slice(0, 2).map((w, i) => (
                <motion.p
                  key={i} className="gl-fb-line"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                >
                  {w}
                </motion.p>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Expand toggle ── */}
        <motion.button
          className="gl-expand-btn"
          onClick={() => setOpen((p) => !p)}
          whileTap={{ scale: 0.97 }}
        >
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ display: 'inline-block', marginRight: 6 }}
          >
            ↓
          </motion.span>
          {open ? 'Hide details' : 'Full analysis'}
        </motion.button>

        {/* ── Expanded detail panel ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              className="gl-detail-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              {/* Breakdown bars */}
              {s.breakdown && (
                <div className="gl-detail-section">
                  <h4 className="gl-detail-head">Score Breakdown</h4>
                  {Object.entries(s.breakdown)
                    .filter(([k]) => k !== 'note' && k !== 'penalty')
                    .map(([k, v], i) => (
                      <ScoreBar
                        key={k}
                        label={k.replace(/([A-Z])/g, ' $1').trim()}
                        value={v}
                        delay={i * 0.06}
                      />
                    ))}
                  {s.breakdown.penalty != null && (
                    <p className="gl-detail-note">
                      Penalty multiplier: {s.breakdown.penalty.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Technical analysis */}
              <div className="gl-detail-section">
                <h4 className="gl-detail-head">Technical Analysis</h4>
                <div className="gl-kv-grid">
                  {[
                    ['Sharpness',        pct(a.sharpnessScore)],
                    ['Laplacian variance', a.lapVariance?.toFixed(0)],
                    ['Dynamic range',    pct(a.dynamicRange)],
                    ['Contrast',         pct(a.contrast)],
                    ['Noise level',      pct(a.noiseLevel)],
                    ['Brightness',       pct(a.brightness)],
                    ['Saturation',       pct(a.saturation)],
                    ['Resolution',       `${a.width}×${a.height}`],
                    ['Aspect ratio',     a.aspectRatio],
                  ].map(([label, val], i) => (
                    <motion.div
                      key={label} className="gl-kv"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.04 }}
                    >
                      <span>{label}</span><span>{val}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Face analysis */}
              {a.faces?.count > 0 && (
                <div className="gl-detail-section">
                  <h4 className="gl-detail-head">Face Analysis</h4>
                  <div className="gl-kv-grid">
                    <div className="gl-kv"><span>Face count</span><span>{a.faces.count}</span></div>
                    <div className="gl-kv"><span>Face brightness</span><span>{pct(a.faces.brightness)}</span></div>
                    <div className="gl-kv"><span>Eye sharpness</span><span>{pct(a.faces.eyeSharpness)}</span></div>
                    <div className="gl-kv"><span>Overall score</span><span>{pct(a.faces.score)}</span></div>
                  </div>
                  {a.faces.details?.[0]?.emotions && (
                    <div className="gl-emotions">
                      {Object.entries(a.faces.details[0].emotions).map(([k, v], i) => (
                        <motion.div
                          key={k} className="gl-emotion"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.05 }}
                        >
                          <span className="gl-em-label">{k}</span>
                          <div className="gl-em-track">
                            <motion.div
                              className="gl-em-fill"
                              style={{ background: scoreColor(v) }}
                              initial={{ width: 0 }}
                              animate={{ width: pct(v) }}
                              transition={{ duration: 0.7, delay: i * 0.05 }}
                            />
                          </div>
                          <span className="gl-em-val">{pct(v)}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Scene labels */}
              {a.labels?.length > 0 && (
                <div className="gl-detail-section">
                  <h4 className="gl-detail-head">Detected Labels</h4>
                  <div className="gl-label-cloud">
                    {a.labels.map((l, i) => (
                      <motion.span
                        key={i} className="gl-label-tag"
                        custom={i}
                        variants={scaleIn}
                        initial="hidden"
                        animate="visible"
                      >
                        {l}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional feedback */}
              {(fb.reasons?.length > 2 || fb.warnings?.length > 2) && (
                <div className="gl-detail-section">
                  <h4 className="gl-detail-head">Full Feedback</h4>
                  {fb.reasons?.slice(2).map((r, i) => (
                    <motion.p
                      key={i} className="gl-fb-line gl-fb-ok"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.07 }}
                    >
                      ✦ {r}
                    </motion.p>
                  ))}
                  {fb.warnings?.slice(2).map((w, i) => (
                    <motion.p
                      key={i} className="gl-fb-line gl-fb-warn"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.07 }}
                    >
                      ⚠ {w}
                    </motion.p>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </TiltCard>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────
   PROCESSING VIEW
───────────────────────────────────────────────────────── */
const ProcessingView = ({ job }) => {
  const summary = job?.summary || {};
  const progress = job?.progress || 0;

  return (
    <motion.div
      className="gl-processing"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Animated shutter */}
      <div className="gl-proc-shutter">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="gl-shutter-blade"
            style={{ transform: `rotate(${i * 60}deg)` }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.9, 1.05, 0.9] }}
            transition={{
              duration: 1.8, delay: i * 0.1,
              repeat: Infinity, ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <motion.h3
        className="gl-proc-title"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Analysing your photos…
      </motion.h3>

      <AnimatePresence mode="wait">
        <motion.p
          key={job?.stage}
          className="gl-proc-stage"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
        >
          {job?.stage || 'Starting AI analysis'}
        </motion.p>
      </AnimatePresence>

      {/* Progress bar */}
      <div className="gl-proc-bar-track">
        <motion.div
          className="gl-proc-bar-fill"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        <motion.span
          className="gl-proc-pct"
          key={progress}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
        >
          {progress}%
        </motion.span>
      </div>

      {/* Live counters */}
      <div className="gl-proc-counters">
        {[
          { num: summary.best     || 0, label: 'Best',     color: '#c8a96e' },
          { num: summary.average  || 0, label: 'Average',  color: '#7a9fd4' },
          { num: summary.rejected || 0, label: 'Rejected', color: '#d46b6b' },
          { num: summary.total    || 0, label: 'Total',    color: '#888'    },
        ].map(({ num, label, color }, i) => (
          <motion.div
            key={label} className="gl-proc-counter"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={num}
                className="gl-pc-num"
                style={{ color }}
                initial={{ opacity: 0, y: -8, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
              >
                {num}
              </motion.span>
            </AnimatePresence>
            <span className="gl-pc-label">{label}</span>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="gl-proc-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        LensIQ is measuring sharpness, lighting, exposure, faces, and scene labels.
        This takes a few seconds per photo.
      </motion.p>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────── */
export default function GalleryPage() {
  const [photoType, setPhotoType] = useState('GENERAL');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [dragging, setDragging] = useState(false);

  const [jobId, setJobId] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [phase, setPhase] = useState('upload');

  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('BEST');

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [ripple, setRipple] = useState(null);

  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const tabsRef = useRef(null);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const active = container.querySelector('.gl-tab--on');
    if (active) {
      const { offsetLeft, offsetWidth } = active;
      setTabIndicator({ left: offsetLeft, width: offsetWidth });
    }
  }, [activeTab, results]);

  const addFiles = useCallback((incoming) => {
    const valid = [...incoming].filter((f) => f.type.startsWith('image/'));
    if (!valid.length) return;
    setFiles((prev) => {
      const combined = [...prev, ...valid].slice(0, 100);
      setPreviews((pp) => {
        pp.forEach((u) => URL.revokeObjectURL(u));
        return combined.map((f) => URL.createObjectURL(f));
      });
      return combined;
    });
  }, []);

  const removeFile = (idx) => {
    setFiles((prev) => {
      const n = prev.filter((_, i) => i !== idx);
      setPreviews((pp) => {
        URL.revokeObjectURL(pp[idx]);
        return pp.filter((_, i) => i !== idx);
      });
      return n;
    });
  };

  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const startPolling = useCallback((id) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/jobs/${id}/status`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        const data = await res.json();
        setJobData(data);

        if (data.status === 'COMPLETED') {
          clearInterval(pollRef.current);
          const rRes = await fetch(`${API}/photos/results/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          });
          const rData = await rRes.json();
          setResults(rData.photos);
          setPhase('results');
          if (rData.photos?.best?.length) setActiveTab('BEST');
          else if (rData.photos?.average?.length) setActiveTab('AVERAGE');
          else setActiveTab('REJECTED');
        } else if (data.status === 'FAILED') {
          clearInterval(pollRef.current);
          setError('Processing failed — check worker logs.');
          setPhase('upload');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, POLL_MS);
  }, []);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleUpload = async (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipple({ x, y, id: Date.now() });
    setTimeout(() => setRipple(null), 700);

    setError('');
    if (!files.length) { setError('Please select at least one photo.'); return; }

    setUploading(true);
    const form = new FormData();
    form.append('photographyType', photoType);
    files.forEach((f) => form.append('photos', f));

    try {
      const res = await fetch(`${API}/photos/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: form
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJobId(data.jobId);
      setPhase('processing');
      startPolling(data.jobId);
    } catch (err) {
      setError('Upload failed — is the backend running on port 5000?');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    clearInterval(pollRef.current);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setFiles([]); setPreviews([]); setJobId(null);
    setJobData(null); setResults(null);
    setPhase('upload'); setError(''); setPhotoType('GENERAL');
  };

  const tabs = results
    ? [
        { key: 'BEST',     label: 'Best',     count: results.best?.length     || 0, color: '#c8a96e' },
        { key: 'AVERAGE',  label: 'Average',  count: results.average?.length   || 0, color: '#7a9fd4' },
        { key: 'REJECTED', label: 'Rejected', count: results.rejected?.length  || 0, color: '#d46b6b' },
        { key: 'FAILED',   label: 'Failed',   count: results.failed?.length    || 0, color: '#888'    },
      ]
    : [];

  const activePhotos = results?.[activeTab.toLowerCase()] || [];

  return (
    <>
      <Navbar />
      <div className="gl-root">

        {/* ── Hero ── */}
        <motion.header
          className="gl-hero"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="gl-eyebrow"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
          >
            AI Photo Intelligence
          </motion.span>
          <motion.h1
            className="gl-heading"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          >
            Analyze &amp; <em>Curate</em> Your Photos
          </motion.h1>
          <motion.p
            className="gl-sub"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
          >
            Upload your shots — LensIQ rates sharpness, lighting, aesthetics,
            faces, and composition per photography type.
          </motion.p>
        </motion.header>

        <AnimatePresence mode="wait">

          {/* ═══ UPLOAD PHASE ══════════════════════════════ */}
          {phase === 'upload' && (
            <motion.div
              key="upload"
              className="gl-upload-wrap"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Photography type card */}
              <motion.div
                className="gl-card"
                custom={0} variants={fadeUp}
                initial="hidden" animate="visible"
              >
                <h2 className="gl-card-title">
                  <span className="gl-card-num">01</span>
                  Select Photography Type
                </h2>
                <p className="gl-card-hint">
                  LensIQ uses different scoring weights per type — a landscape
                  scorer rewards golden-hour light, a portrait scorer prioritises eye sharpness.
                </p>
                <div className="gl-type-grid">
                  {PHOTO_TYPES.map((t, i) => (
                    <motion.button
                      key={t.id}
                      className={`gl-type-btn ${photoType === t.id ? 'gl-type-btn--on' : ''}`}
                      onClick={() => setPhotoType(t.id)}
                      custom={i}
                      variants={scaleIn}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ y: -2, scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.span
                        className="gl-type-icon"
                        animate={photoType === t.id
                          ? { rotate: [0, -10, 10, -6, 6, 0], scale: [1, 1.2, 1] }
                          : {}}
                        transition={{ duration: 0.5 }}
                      >
                        {t.icon}
                      </motion.span>
                      <span className="gl-type-label">{t.label}</span>
                      {photoType === t.id && (
                        <motion.div
                          className="gl-type-check"
                          layoutId="type-check"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Upload drop zone card */}
              <motion.div
                className="gl-card"
                custom={1} variants={fadeUp}
                initial="hidden" animate="visible"
              >
                <h2 className="gl-card-title">
                  <span className="gl-card-num">02</span>
                  Upload Photos
                  <span className="gl-card-sub">up to 100 files · 100 MB total</span>
                </h2>

                <motion.div
                  className={`gl-dropzone ${dragging ? 'gl-dropzone--drag' : ''}`}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  animate={dragging
                    ? { scale: 1.01, borderColor: 'rgba(200,169,110,0.7)' }
                    : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => addFiles(e.target.files)}
                  />

                  {files.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        className="gl-drop-icon"
                        animate={dragging
                          ? { y: [-4, 0, -4], scale: 1.15 }
                          : { y: [0, -6, 0] }}
                        transition={{
                          duration: dragging ? 0.5 : 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                          <rect x="5" y="12" width="30" height="22" rx="4"
                            stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <circle cx="20" cy="23" r="5.5"
                            stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M14 12V10a2 2 0 012-2h8a2 2 0 012 2v2"
                            stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M20 20v-4M18 18l2-2 2 2"
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </motion.div>
                      <p className="gl-drop-title">Drop photos here</p>
                      <p className="gl-drop-hint">or click to browse — JPEG, PNG, WebP</p>
                    </motion.div>
                  ) : (
                    <motion.p
                      className="gl-drop-title"
                      key={files.length}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      {files.length} photo{files.length > 1 ? 's' : ''} ready
                      &nbsp;·&nbsp;
                      <span className="gl-drop-add">+ Add more</span>
                    </motion.p>
                  )}
                </motion.div>

                {previews.length > 0 && (
                  <motion.div
                    className="gl-thumb-grid"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AnimatePresence>
                      {previews.map((src, i) => (
                        <motion.div
                          key={src}
                          className="gl-thumb"
                          custom={i}
                          variants={scaleIn}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, scale: 0.7 }}
                          layout
                        >
                          <img src={src} alt="" className="gl-thumb-img" />
                          <motion.button
                            className="gl-thumb-rm"
                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.85 }}
                          >
                            ✕
                          </motion.button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    className="gl-error"
                    initial={{ opacity: 0, x: -12, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 12, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                className="gl-upload-btn"
                onClick={handleUpload}
                disabled={uploading || !files.length}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                whileHover={!uploading && files.length ? { scale: 1.02 } : {}}
                whileTap={!uploading && files.length ? { scale: 0.97 } : {}}
                style={{ position: 'relative', overflow: 'hidden' }}
              >
                <AnimatePresence>
                  {ripple && (
                    <motion.span
                      key={ripple.id}
                      className="gl-ripple"
                      style={{ left: ripple.x, top: ripple.y }}
                      initial={{ width: 0, height: 0, opacity: 0.5, x: '-50%', y: '-50%' }}
                      animate={{ width: 400, height: 400, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                    />
                  )}
                </AnimatePresence>

                {uploading ? (
                  <motion.span
                    className="gl-spinner"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <>
                    <motion.span
                      animate={{ rotate: [0, 20, -20, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      ✦
                    </motion.span>
                    &nbsp;&nbsp;Analyse {files.length || 0} Photo{files.length !== 1 ? 's' : ''}
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* ═══ PROCESSING PHASE ═══════════════════════════ */}
          {phase === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <ProcessingView job={jobData} />
            </motion.div>
          )}

          {/* ═══ RESULTS PHASE ══════════════════════════════ */}
          {phase === 'results' && results && (
            <motion.div
              key="results"
              className="gl-results-wrap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Summary bar */}
              <motion.div
                className="gl-summary-bar"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="gl-summary-left">
                  <span className="gl-summary-title">Analysis complete</span>
                  <span className="gl-summary-type">
                    {PHOTO_TYPES.find(t => t.id === jobData?.photographyType)?.icon}{' '}
                    {jobData?.photographyType}
                  </span>
                </div>
                <div className="gl-summary-stats">
                  {tabs.map((t, i) => t.count > 0 && (
                    <motion.div
                      key={t.key} className="gl-sum-stat"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.06 }}
                    >
                      <motion.span
                        className="gl-sum-num"
                        style={{ color: t.color }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 + i * 0.06 }}
                      >
                        {t.count}
                      </motion.span>
                      <span className="gl-sum-label">{t.label}</span>
                    </motion.div>
                  ))}
                </div>
                <motion.button
                  className="gl-reset-btn"
                  onClick={handleReset}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  ↑ New Upload
                </motion.button>
              </motion.div>

              {/* Tabs */}
              <div className="gl-tabs" ref={tabsRef} style={{ position: 'relative' }}>
                <motion.div
                  className="gl-tab-indicator"
                  animate={{ left: tabIndicator.left, width: tabIndicator.width }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
                {tabs.filter((t) => t.count > 0).map((t, i) => (
                  <motion.button
                    key={t.key}
                    className={`gl-tab ${activeTab === t.key ? 'gl-tab--on' : ''}`}
                    style={{ '--tab-color': t.color }}
                    onClick={() => setActiveTab(t.key)}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <motion.span
                      className="gl-tab-dot"
                      style={{ background: t.color }}
                      animate={activeTab === t.key ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                      transition={{ duration: 0.35 }}
                    />
                    {t.label}
                    <motion.span
                      className="gl-tab-count"
                      key={`${t.key}-${t.count}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      {t.count}
                    </motion.span>
                  </motion.button>
                ))}
              </div>

              {/* Tab description */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeTab}
                  className="gl-tab-desc"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  {activeTab === 'BEST' && `These ${activePhotos.length} photos cleared both quality and aesthetic thresholds for ${jobData?.photographyType?.toLowerCase() || 'your'} photography.`}
                  {activeTab === 'AVERAGE' && `These ${activePhotos.length} photos met minimum standards but didn't reach the top tier — good for backups or social.`}
                  {activeTab === 'REJECTED' && `These ${activePhotos.length} photos had critical issues — blurry, overexposed, or missing required elements.`}
                  {activeTab === 'FAILED' && `These ${activePhotos.length} photos could not be processed — file may be corrupt or format unsupported.`}
                </motion.p>
              </AnimatePresence>

              {/* Photo grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  className="gl-photo-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {activePhotos.length === 0 ? (
                    <motion.div
                      className="gl-empty"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <motion.span
                        className="gl-empty-icon"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        📭
                      </motion.span>
                      <p>No {activeTab.toLowerCase()} photos in this batch.</p>
                    </motion.div>
                  ) : (
                    activePhotos.map((photo, i) => (
                      <PhotoCard key={photo._id} photo={photo} index={i} />
                    ))
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}