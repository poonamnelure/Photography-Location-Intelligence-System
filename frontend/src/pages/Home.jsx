import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import PhotoLoader from '../components/Loader';
import Navbar from '../components/Navbar';
import logoImage from '../assets/logo.png';
import '../css/home.css';

/* ─────────────────────────────────────────────────────────────
   THEME HOOK
   Re-reads CSS vars whenever data-theme changes on <html>.
   Used to feed theme-aware values into Framer Motion `animate`
   props, which cannot consume CSS variables directly.
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
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return vals;
}

/* ─────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────── */
const GRID_PHOTOS = [
  { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', label: 'Mountain Dawn' },
  { src: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80', label: 'Golden Forest' },
  { src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80', label: 'Rocky Peak' },
  { src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&q=80', label: 'Lake Mirror' },
  { src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80', label: 'Night Sky' },
  { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', label: 'Coastal Fog' },
  { src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80', label: 'Desert Dunes' },
  { src: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&q=80', label: 'Autumn Light' },
];

const STEPS = [
  { number: '01', title: 'Define Your Shoot',    description: 'Select photography type, location preferences, and timing requirements',                       icon: '◎', badge: 'Start here'  },
  { number: '02', title: 'AI Location Analysis', description: 'Our algorithm analyzes weather, crowd density, golden-hour windows, and accessibility',        icon: '⬡', badge: '~3.2 sec'   },
  { number: '03', title: 'Get Curated Results',  description: 'Receive top 3 locations with suitability scores and detailed visual insights',                 icon: '◈', badge: 'Top 3 spots' },
  { number: '04', title: 'Shoot & Analyze',      description: 'Capture photos and upload for AI-powered quality and composition analysis',                    icon: '◉', badge: 'AI feedback' },
];

const MARQUEE_ITEMS = [
  'Golden Hour', 'Blue Hour', 'Cityscape', 'Landscape', 'Portrait',
  'Astrophotography', 'Street', 'Architecture', 'Wildlife', 'Aerial',
  'Long Exposure', 'Macro', 'Documentary', 'Fashion', 'Fine Art',
];

/* ─────────────────────────────────────────────
   APERTURE
───────────────────────────────────────────── */
const Aperture = () => (
  <motion.div className="aperture-wrap"
    initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}>
    <motion.svg className="aperture-svg" viewBox="0 0 200 200" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{ rotate: 360 }}
      transition={{ duration: 60, ease: 'linear', repeat: Infinity }}>
      <circle cx="100" cy="100" r="96" stroke="rgba(200,169,110,0.18)" strokeWidth="1" strokeDasharray="4 6" />
      <circle cx="100" cy="100" r="78" stroke="rgba(200,169,110,0.1)"  strokeWidth="0.5" />
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x1 = 100 + 78 * Math.cos(angle), y1 = 100 + 78 * Math.sin(angle);
        const x2 = 100 + 30 * Math.cos(angle + 0.55), y2 = 100 + 30 * Math.sin(angle + 0.55);
        const x3 = 100 + 30 * Math.cos(angle - 0.55), y3 = 100 + 30 * Math.sin(angle - 0.55);
        return (
          <polygon key={i}
            points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
            fill="rgba(200,169,110,0.07)" stroke="rgba(200,169,110,0.22)" strokeWidth="0.6" />
        );
      })}
      <circle cx="100" cy="100" r="28" stroke="rgba(200,169,110,0.3)" strokeWidth="1" fill="rgba(200,169,110,0.04)" />
      <circle cx="100" cy="100" r="4"  fill="rgba(200,169,110,0.5)" />
    </motion.svg>
    <motion.div className="aperture-labels"
      animate={{ rotate: -360 }}
      transition={{ duration: 60, ease: 'linear', repeat: Infinity }}>
      {['', '', '', ''].map((t, i) => (
        <span key={i} className="aperture-label" style={{ '--i': i }}>{t}</span>
      ))}
    </motion.div>
  </motion.div>
);

/* ─────────────────────────────────────────────
   MARQUEE
───────────────────────────────────────────── */
const Marquee = () => {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="marquee-outer">
      <motion.div className="marquee-track"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, ease: 'linear', repeat: Infinity }}>
        {items.map((item, i) => (
          <span key={i} className="marquee-item">
            <span className="marquee-dot">◆</span>{item}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   PHOTO GRID
───────────────────────────────────────────── */
const PhotoGrid = () => (
  <div className="photo-grid-wrapper">
    <motion.div className="photo-col"
      animate={{ y: ['0%', '-50%'] }}
      transition={{ duration: 18, ease: 'linear', repeat: Infinity }}>
      {[...GRID_PHOTOS, ...GRID_PHOTOS].map((p, i) => (
        <div key={i} className="photo-tile">
          <img src={p.src} alt={p.label} loading="lazy" />
          <span className="photo-label">{p.label}</span>
        </div>
      ))}
    </motion.div>
    <motion.div className="photo-col col-center"
      animate={{ y: ['-50%', '0%'] }}
      transition={{ duration: 22, ease: 'linear', repeat: Infinity }}>
      {[...GRID_PHOTOS.slice(3), ...GRID_PHOTOS.slice(0, 3),
        ...GRID_PHOTOS.slice(3), ...GRID_PHOTOS.slice(0, 3)].map((p, i) => (
        <div key={i} className="photo-tile tall">
          <img src={p.src} alt={p.label} loading="lazy" />
          <span className="photo-label">{p.label}</span>
        </div>
      ))}
    </motion.div>
    <motion.div className="photo-col"
      animate={{ y: ['0%', '-50%'] }}
      transition={{ duration: 26, ease: 'linear', repeat: Infinity }}>
      {[...GRID_PHOTOS.slice(5), ...GRID_PHOTOS.slice(0, 5),
        ...GRID_PHOTOS.slice(5), ...GRID_PHOTOS.slice(0, 5)].map((p, i) => (
        <div key={i} className="photo-tile">
          <img src={p.src} alt={p.label} loading="lazy" />
          <span className="photo-label">{p.label}</span>
        </div>
      ))}
    </motion.div>
    <div className="grid-fade-top" />
    <div className="grid-fade-bottom" />
    <div className="grid-fade-left" />
  </div>
);

/* ─────────────────────────────────────────────
   STEP CARD
   Framer Motion `animate` props cannot read CSS
   variables, so we pull the idle-state colours
   through useThemeVars and pass them as JS values.
───────────────────────────────────────────── */
const StepCard = ({ step, index, isActive, onHoverStart, onHoverEnd }) => {
  /*
   * These two vars are defined in home.css for both themes:
   *   dark  → rgba(255,255,255,0.07)  /  #161618
   *   light → rgba(0,0,0,0.10)        /  #fffdf7
   */
  const tv = useThemeVars(['--step-node-border-idle', '--step-node-bg-idle', '--text-muted', '--step-num-color']);

  const nodeBorderIdle = tv['--step-node-border-idle'] || 'rgba(128,128,128,0.12)';
  const nodeBgIdle     = tv['--step-node-bg-idle']     || 'transparent';
  const textMuted      = tv['--text-muted']            || 'rgba(128,128,128,0.5)';
  const stepNumColor   = tv['--step-num-color']        || 'rgba(128,128,128,0.10)';

  return (
    <motion.div
      className={`step-card${isActive ? ' step-active' : ''}`}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.12 + 0.3, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      animate={isActive ? { y: -8 } : { y: 0 }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
    >
      <AnimatePresence>
        {isActive && (
          <motion.div className="scan-line"
            initial={{ top: '-2px', opacity: 0 }}
            animate={{ top: '102%', opacity: [0, 0.7, 0.7, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: 'linear', repeat: Infinity }} />
        )}
      </AnimatePresence>

      <div className="step-node-wrapper">
        {/* Outer glow ring — only visible when active */}
        <motion.div className="step-node-ring"
          animate={isActive
            ? { scale: 1.35, opacity: 1, borderColor: 'rgba(200,169,110,0.25)' }
            : { scale: 1,    opacity: 0, borderColor: 'transparent' }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        />

        {/* Node circle — idle colours come from CSS vars, active hardcoded accent */}
        <motion.div className="step-node"
          animate={isActive
            ? { borderColor: '#c8a96e', backgroundColor: 'rgba(200,169,110,0.12)', scale: 1.12 }
            : { borderColor: nodeBorderIdle, backgroundColor: nodeBgIdle, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {/* Glyph — idle colour from CSS var, active is accent */}
          <motion.span className="step-node-glyph"
            animate={isActive ? { color: '#c8a96e' } : { color: textMuted }}
            transition={{ duration: 0.3 }}>
            {step.icon}
          </motion.span>
        </motion.div>
      </div>

      {/* Step number watermark — idle colour from CSS var */}
      <motion.span className="step-num"
        animate={isActive ? { color: 'rgba(200,169,110,0.3)' } : { color: stepNumColor }}
        transition={{ duration: 0.3 }}>
        {step.number}
      </motion.span>

      <h3 className="step-name">{step.title}</h3>
      <p  className="step-desc">{step.description}</p>

      <motion.span className="step-badge"
        initial={{ opacity: 0, y: 8 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.3, delay: isActive ? 0.1 : 0 }}>
        {step.badge}
      </motion.span>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   HOME PAGE
───────────────────────────────────────────── */
const Home = () => {
  const [isLoading,   setIsLoading]   = useState(true);
  const [activeStep,  setActiveStep]  = useState(-1);
  const [stepPaused,  setStepPaused]  = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  const heroRef  = useRef(null);
  const stepsRef = useRef(null);
  const timerRef = useRef(null);

  const stepsInView = useInView(stepsRef, { once: true, margin: '-100px' });
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY       = useTransform(scrollYProgress, [0, 1], ['0px', '80px']);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!stepsInView) return;
    const boot = setTimeout(() => {
      setActiveStep(0);
      timerRef.current = setInterval(() => {
        setActiveStep(i => (i + 1) % STEPS.length);
      }, 2200);
    }, 1200);
    return () => { clearTimeout(boot); clearInterval(timerRef.current); };
  }, [stepsInView]);

  useEffect(() => {
    if (stepPaused) clearInterval(timerRef.current);
  }, [stepPaused]);

  const handleStepHover = (i) => { setStepPaused(true); setActiveStep(i); };
  const handleStepLeave = () => {
    setStepPaused(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () => setActiveStep(idx => (idx + 1) % STEPS.length),
      2200
    );
  };

  return (
    <>
      <PhotoLoader isLoading={isLoading} />
      <AnimatePresence>
        {!isLoading && (
          <motion.div className="site-root"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }}>

            <Navbar scrolled={navScrolled} />

            {/* ── Hero ── */}
            <section className="hero" ref={heroRef}>
              <PhotoGrid />
              <Aperture />
              <motion.div className="hero-content" style={{ opacity: heroOpacity, y: heroY }}>
                <motion.div className="hero-eyebrow"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.7 }}>
                  <span className="eyebrow-dot" />
                  Rule based Location Intelligence
                </motion.div>
                <motion.h1 className="hero-title"
                  initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.8 }}>
                  Find the&nbsp;<br />
                  <em className="hero-em">perfect shot</em><br />
                  every time.
                </motion.h1>
                <motion.p className="hero-sub"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.8 }}>
                  Real-time weather, crowd density, golden-hour windows,<br />
                  and accessibility — all in one intelligent platform.
                </motion.p>
                <motion.div className="hero-actions"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75, duration: 0.7 }}>
                  <Link to="/finder" className="btn-primary">
                    Start Finding Locations
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                  <Link to="/gallery" className="btn-ghost">View Gallery</Link>
                </motion.div>
              </motion.div>
            </section>

            <Marquee />

            {/* ── How it works ── */}
            <section className="how-section" ref={stepsRef}>
              <motion.div className="section-header"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.7 }}>
                <span className="section-tag">Process</span>
                <h2 className="section-title">How <span className="accent">LensIQ</span> works</h2>
                <p className="section-sub">From concept to capture — intelligent, in seconds.</p>
              </motion.div>
              <div className="steps-wrapper">
                <div className="progress-track">
                  <motion.div className="progress-fill"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: stepsInView ? 1 : 0 }}
                    transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1], delay: 0.6 }}
                    style={{ originX: 0 }} />
                </div>
                <div className="steps-grid">
                  {STEPS.map((step, i) => (
                    <StepCard key={i} step={step} index={i}
                      isActive={activeStep === i}
                      onHoverStart={() => handleStepHover(i)}
                      onHoverEnd={handleStepLeave} />
                  ))}
                </div>
              </div>
            </section>

            {/* ── CTA Band ── */}
            <motion.section className="cta-band"
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
              viewport={{ once: true }} transition={{ duration: 0.9 }}>
              <div className="cta-inner">
                <h2 className="cta-title">Ready to find your next great location?</h2>
                <p className="cta-sub">Join thousands of photographers discovering perfect spots with AI.</p>
                <Link to="/finder" className="btn-primary btn-lg">
                  Launch Location Finder
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </motion.section>

            {/* ── Footer ── */}
            <footer className="site-footer">
              <div className="footer-inner">
                <div className="footer-brand">
                  <img src={logoImage} alt="LensIQ" className="footer-logo-img" />
                  <span className="footer-logo-text">Lens<em>IQ</em></span>
                </div>
                <p className="footer-tagline">Advanced Photography Location Intelligence</p>
                <nav className="footer-nav">
                  <Link to="/finder">Location Finder</Link>
                  <Link to="/results">Results</Link>
                  <Link to="/gallery">Gallery</Link>
                </nav>
                <p className="footer-copy">© 2026 LensIQ — All rights reserved</p>
              </div>
            </footer>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Home;