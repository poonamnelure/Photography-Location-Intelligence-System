// frontend/src/components/Navbar.jsx

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHome, FiMapPin, FiBarChart2, FiImage, FiBell, FiUser, FiStar, FiMenu, FiX, FiSun, FiMoon } from 'react-icons/fi';
import logoImage from '../assets/logo.png';
import '../css/navbar.css';
import { useAuth } from '../context/AuthContext';
import NotificationPanel from './NotificationPanel';
import ReviewModal from './ReviewModal';

/* ── Logout icon: door with arrow (SVG) ── */
const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {/* Door frame */}
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    {/* Arrow pointing right (exit) */}
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHover, setActiveHover] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });
  const [notifCount, setNotifCount] = useState(0);
  const [logoutHovered, setLogoutHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => { setScrolled(window.scrollY > 20); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const navItems = [
    { path: '/', label: 'Home', icon: <FiHome />, color: '#00E5FF' },
    { path: '/finder', label: 'Location Finder', icon: <FiMapPin />, color: '#4F7CFF' },
    { path: '/results', label: 'Results', icon: <FiBarChart2 />, color: '#A6A8FF' },
    { path: '/gallery', label: 'Gallery', icon: <FiImage />, color: '#00F6FF' },
  ];

  return (
    <>
      <motion.nav
        className={`navbar ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="nav-container">

          {/* Logo */}
          <Link to="/" className="nav-logo">
            <motion.div
              className="logo-icon"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <img src={logoImage} alt="LensIQ Logo" />
            </motion.div>
            <div className="logo-text">
              <span className="logo-primary">Lens</span>
              <span className="logo-secondary">IQ</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="nav-links">
            {navItems.map((item) => (
              <motion.div
                key={item.path}
                className="nav-link-wrapper"
                onHoverStart={() => setActiveHover(item.path)}
                onHoverEnd={() => setActiveHover(null)}
              >
                <Link
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  style={{ '--link-color': item.color }}
                >
                  <motion.div
                    className="nav-icon-wrapper"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <div className="nav-icon">{item.icon}</div>
                  </motion.div>
                  <span className="nav-label">{item.label}</span>
                  <div className="nav-glow" style={{ background: `radial-gradient(circle, ${item.color}40 0%, transparent 70%)` }} />
                </Link>
                {activeHover === item.path && (
                  <motion.div
                    className="nav-tooltip"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    {item.label}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Right-side actions */}
          <div className="nav-actions">

            {/* Theme toggle */}
            <motion.button
              className="theme-toggle"
              onClick={() => setIsDark(!isDark)}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.08 }}
              aria-label="Toggle dark/light mode"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <motion.div
                className="theme-toggle-track"
                animate={{ backgroundColor: isDark ? 'rgba(0,229,255,0.12)' : 'rgba(255,200,50,0.15)' }}
              >
                <motion.div
                  className="theme-toggle-thumb"
                  animate={{ x: isDark ? 2 : 22 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
                <motion.span
                  className="theme-toggle-icon"
                  key={isDark ? 'moon' : 'sun'}
                  initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 30, scale: 0.6 }}
                  transition={{ duration: 0.25 }}
                >
                  {isDark ? <FiMoon /> : <FiSun />}
                </motion.span>
              </motion.div>
            </motion.button>

            {/* Notification Bell */}
            {isLoggedIn && (
              <motion.button
                className="notif-bell-btn"
                onClick={() => setNotifOpen(v => !v)}
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.08 }}
                aria-label="Notifications"
                title="Notifications"
              >
                <FiBell size={18} />
                {notifCount > 0 && (
                  <span className="notif-bell-badge">{notifCount > 9 ? '9+' : notifCount}</span>
                )}
              </motion.button>
            )}

            {/* Auth section */}
            {isLoggedIn ? (
              <div className="nav-auth-group">
                {/* Avatar → profile */}
                <Link to="/profile" title={user?.name} className="nav-avatar" aria-label="My Profile">
                  <motion.div
                    className="nav-avatar-inner"
                    whileHover={{ scale: 1.08 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {initials}
                  </motion.div>
                </Link>

                {/* Refined logout icon-button */}
                <motion.button
                  className="nav-logout-btn"
                  onClick={handleLogout}
                  onHoverStart={() => setLogoutHovered(true)}
                  onHoverEnd={() => setLogoutHovered(false)}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.92 }}
                  aria-label="Logout"
                  title="Logout"
                >
                  {/* Animated ring that draws on hover */}
                  <svg className="nav-logout-ring" viewBox="0 0 36 36" fill="none">
                    <motion.circle
                      cx="18" cy="18" r="16"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeDasharray="100.53"
                      animate={{ strokeDashoffset: logoutHovered ? 0 : 100.53 }}
                      transition={{ duration: 0.45, ease: 'easeInOut' }}
                    />
                  </svg>
                  <span className="nav-logout-icon">
                    <LogoutIcon />
                  </span>
                </motion.button>
              </div>
            ) : (
              <div className="nav-auth-group">
                <Link to="/login" className="nav-signin-btn">
                  Sign In
                </Link>
                <Link to="/signup" className="nav-join-btn">
                  Join
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            whileTap={{ scale: 0.9 }}
          >
            {mobileMenuOpen ? <FiX className="menu-icon" /> : <FiMenu className="menu-icon" />}
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <motion.div
          className="mobile-menu"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: mobileMenuOpen ? 'auto' : 0, opacity: mobileMenuOpen ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {navItems.map((item) => (
            <motion.div
              key={item.path}
              whileHover={{ x: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Link
                to={item.path}
                className={`mobile-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                style={{ '--link-color': item.color }}
              >
                <div className="mobile-nav-icon" style={{ color: item.color }}>{item.icon}</div>
                <span className="mobile-nav-label">{item.label}</span>
              </Link>
            </motion.div>
          ))}

          <div className="mobile-actions">
            <button className="mobile-action-btn" onClick={() => setIsDark(!isDark)}>
              {isDark ? <FiSun /> : <FiMoon />}
              {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </button>

            {isLoggedIn ? (
              <>
                <Link
                  to="/profile"
                  className="mobile-action-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FiUser /> My Profile
                </Link>
                <button
                  className="mobile-action-btn mobile-logout-btn"
                  onClick={handleLogout}
                >
                  <LogoutIcon /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="mobile-action-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FiUser /> Sign In
                </Link>
                <Link
                  to="/signup"
                  className="mobile-action-btn premium"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FiStar /> Join Free
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </motion.nav>

      {/* Notification Panel */}
      {isLoggedIn && (
        <NotificationPanel
          onUnreadChange={setNotifCount}
          isOpen={notifOpen}
          onClose={() => setNotifOpen(false)}
          onReviewClick={(loc) => {
            setNotifOpen(false);
            setReviewTarget(loc);
          }}
        />
      )}

      {/* Review Modal */}
      {reviewTarget && (
        <ReviewModal
          location={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => setReviewTarget(null)}
        />
      )}
    </>
  );
};

export default Navbar;