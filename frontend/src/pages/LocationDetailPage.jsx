import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import '../css/results.css';
import { motion, AnimatePresence } from 'framer-motion';

const ACCENT = '#c8a96e';
const GOLD_GLOW = 'rgba(200,169,110,0.3)';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } }
};

const staggerChildren = {
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const imageVariant = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.7, type: 'spring', stiffness: 100 } }
};

export default function LocationDetailPage() {
  const { state } = useLocation();
  const location = state?.location;
  const navigate = useNavigate();

  if (!location) {
    return (
      <div style={{ background: '#0a0a0b', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <p>Location not found.</p>
            <button onClick={() => navigate('/profile')} style={{ background: ACCENT, border: 'none', padding: '10px 20px', borderRadius: 4, marginTop: 20, cursor: 'pointer' }}>Go back</button>
          </div>
        </motion.div>
      </div>
    );
  }

  const highlights = location.highlights || [];
  const hasValidCoords = location.lat && location.lng && location.lat !== 0 && location.lng !== 0;
  const routeUrl = hasValidCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&travelmode=driving`
    : null;

  // Score ring (circular progress) component
  const scoreCircle = (score) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const progress = circumference * (1 - score / 100);
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <motion.circle
          cx="60" cy="60" r="50" fill="none" stroke={ACCENT} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: progress }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <text x="60" y="70" textAnchor="middle" fill="#f0ede8" fontSize="24" fontWeight="bold" dy=".3em" style={{ transform: 'rotate(90deg) translate(0, -120px)' }}>
          {score}
        </text>
      </svg>
    );
  };

  return (
    <>
      <Navbar />
      <div className="results-root" style={{ background: '#0a0a0b', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
        {/* Animated background glow orbs */}
        <div style={{ position: 'absolute', top: '10%', left: '-20%', width: '60%', height: '60%', background: `radial-gradient(circle, ${GOLD_GLOW}, transparent 70%)`, filter: 'blur(80px)', opacity: 0.4, zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '0', right: '-10%', width: '50%', height: '50%', background: `radial-gradient(circle, ${GOLD_GLOW}, transparent 70%)`, filter: 'blur(100px)', opacity: 0.3, zIndex: 0 }} />
        
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', position: 'relative', zIndex: 1 }}>
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => navigate(-1)}
            style={{ background: 'rgba(200,169,110,0.1)', border: `1px solid ${ACCENT}44`, color: ACCENT, cursor: 'pointer', marginBottom: 32, fontSize: 14, padding: '8px 18px', borderRadius: 40, display: 'inline-flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)' }}
          >
            ← Back to Profile
          </motion.button>

          <motion.div
            className="rp-card"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            style={{ position: 'relative', maxWidth: 900, margin: '0 auto', background: 'rgba(17,17,19,0.85)', backdropFilter: 'blur(12px)', borderRadius: 24, border: `1px solid ${ACCENT}22`, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(200,169,110,0.05)', overflow: 'hidden' }}
          >
            {/* Animated Gold top line */}
            <motion.div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`, width: '100%' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2 }} />

            {/* Image section with parallax zoom effect */}
            <motion.div className="rp-card-img-wrap" variants={imageVariant} style={{ position: 'relative', overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              {location.imageUrl ? (
                <img src={location.imageUrl} alt={location.locationName} style={{ width: '100%', height: 320, objectFit: 'cover', display: 'block', transition: 'transform 0.6s' }} />
              ) : (
                <div style={{ width: '100%', height: 320, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📷</div>
              )}
              {/* Overlay gradient */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0a0b 0%, transparent 60%)' }} />
              <div className="rp-card-img-score" style={{ position: 'absolute', bottom: 20, right: 24, background: 'rgba(10,10,11,0.8)', borderRadius: 60, padding: '8px 16px', backdropFilter: 'blur(4px)', border: `1px solid ${ACCENT}55` }}>
                <span style={{ fontSize: 28, fontWeight: 'bold', color: ACCENT }}>{location.score ?? 0}</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>/100</span>
              </div>
            </motion.div>

            <div className="rp-card-body" style={{ padding: '32px 36px' }}>
              <motion.div variants={staggerChildren} initial="hidden" animate="visible">
                {/* Header */}
                <motion.div variants={fadeInUp} style={{ marginBottom: 16 }}>
                  <h1 className="rp-name" style={{ fontSize: '2.8rem', fontWeight: 400, fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#f0ede8', margin: '0 0 12px 0' }}>{location.locationName}</h1>
                  <div className="rp-chips" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {location.photographyType && <span className="rp-chip" style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}55`, borderRadius: 40, padding: '6px 16px', fontSize: 12, color: ACCENT }}>📷 {location.photographyType}</span>}
                    {location.area && <span className="rp-chip" style={{ background: '#1c1c1f', borderRadius: 40, padding: '6px 16px', fontSize: 12 }}>📍 {location.area}</span>}
                  </div>
                </motion.div>

                {/* Score + Highlights row */}
                <motion.div variants={fadeInUp} style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 32, alignItems: 'center' }}>
                  {/* Score Ring */}
                  <div style={{ textAlign: 'center' }}>
                    {scoreCircle(location.score)}
                    <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: '0.1em' }}>SUITABILITY</div>
                  </div>

                  {/* Highlights */}
                  {highlights.length > 0 && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: ACCENT, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>✨ Why you'll love it</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {highlights.map((h, i) => (
                          <motion.li key={i} variants={fadeInUp} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: ACCENT, fontSize: 18 }}>✦</span>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>{h}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>

                {/* Score breakdown bar as a beautiful gauge */}
                <motion.div variants={fadeInUp} style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>OVERALL SCORE</span>
                    <span style={{ fontSize: 14, color: ACCENT, fontWeight: 500 }}>{location.score} / 100</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                    <motion.div style={{ width: `${location.score}%`, height: '100%', background: `linear-gradient(90deg, ${ACCENT}, #e8c98a)`, borderRadius: 10 }} initial={{ width: 0 }} animate={{ width: `${location.score}%` }} transition={{ duration: 1.2, delay: 0.3 }} />
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div variants={fadeInUp} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
                  {routeUrl ? (
                    <motion.a
                      className="rp-btn rp-btn--nav"
                      href={routeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02, backgroundColor: ACCENT, color: '#0a0a0b' }}
                      whileTap={{ scale: 0.98 }}
                      style={{ background: ACCENT, color: '#0a0a0b', border: 'none', padding: '12px 28px', borderRadius: 40, fontWeight: 600, letterSpacing: '0.06em', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    >
                      🧭 Get Directions
                    </motion.a>
                  ) : (
                    <div style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.05)', borderRadius: 40, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                      📍 Coordinates unavailable
                    </div>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02, borderColor: ACCENT }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/profile')}
                    style={{ background: 'transparent', border: `1px solid ${ACCENT}66`, padding: '12px 28px', borderRadius: 40, color: '#f0ede8', cursor: 'pointer', fontWeight: 500 }}
                  >
                    View My Profile
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}