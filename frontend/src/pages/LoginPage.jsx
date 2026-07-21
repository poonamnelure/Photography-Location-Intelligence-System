import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const GOLD = '#D4AF37';
const GOLD_DIM = 'rgba(212,175,55,0.18)';

// ── Professional Eye Icon SVGs ────────────────────────────────────────────────
function EyeOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20C5 20 1 12 1 12A18.45 18.45 0 015.06 6.06M9.9 4.24A9.12 9.12 0 0112 4C19 4 23 12 23 12A18.5 18.5 0 0120.71 15.68M1 1L23 23"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.12 14.12A3 3 0 119.88 9.88"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Floating Particle Canvas ──────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2 + 0.2,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      alpha: Math.random() * 0.35 + 0.08,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,175,55,${p.alpha})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

// ── Main LoginPage ────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function LoginPage() {
  const navigate = useNavigate();
  const { onLoginSuccess } = useAuth();
      console.log("Frontend Google Client ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiErr, setApiErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true; script.defer = true;
    document.head.appendChild(script);
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleLogin,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('googleBtn'),
          { theme: 'filled_black', size: 'large', width: '340', shape: 'rectangular' }
        );
      }
    };
    return () => clearTimeout(t);
  }, []);

  const handleGoogleLogin = async (response) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.accessToken); navigate('/');
      } else { setApiErr(data.message || 'Google login failed'); }
    } catch { setApiErr('Google login error. Please try again.'); }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    const v = name === 'email' ? value.toLowerCase() : value;
    setForm(p => ({ ...p, [name]: v }));
    if (touched[name]) validate(name, v);
  };
  const handleBlur = e => {
    const { name, value } = e.target;
    setTouched(p => ({ ...p, [name]: true }));
    validate(name, value);
  };
  const validate = (field, value) => {
    let err = null;
    if (field === 'email') {
      if (!value) err = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) err = 'Enter a valid email';
    }
    if (field === 'password' && !value) err = 'Password is required';
    setErrors(p => ({ ...p, [field]: err }));
    return !err;
  };
  const validateAll = () => {
    const e = form.email ? null : 'Email is required';
    const p = form.password ? null : 'Password is required';
    setErrors({ email: e, password: p });
    return !e && !p;
  };
  const handleSubmit = async e => {
    e.preventDefault(); setApiErr('');
    if (!validateAll()) return;
    setLoading(true);
    try { const data = await login(form); onLoginSuccess(data.user, data.accessToken); navigate('/'); }
    catch (err) { setApiErr(err.message); }
    finally { setLoading(false); }
  };

  const cardAnim = {
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
    transition: 'opacity 0.6s cubic-bezier(.22,1,.36,1), transform 0.6s cubic-bezier(.22,1,.36,1)',
  };

  return (
    <div style={st.bg}>
      <style>{kf}</style>
      <ParticleCanvas />
      <div style={st.topLine} />

      <div style={{ ...st.card, ...cardAnim }}>

        {/* Logo Row */}
        <div style={st.logoRow}>
          <img src="/logo.png" alt="LensIQ" style={st.logoImg} />
          <span style={st.logoText}>Lens<em style={st.logoEm}>IQ</em></span>
        </div>

        <h1 style={st.title}>Welcome back</h1>
        <p style={st.subtitle}>Sign in to your photography workspace</p>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ ...st.field, animation: mounted ? 'fsu 0.45s 0.08s ease both' : 'none' }}>
            <label style={st.label}>Email Address</label>
            <input name="email" type="email" placeholder="you@gmail.com" value={form.email}
              onChange={handleChange} onBlur={handleBlur}
              style={{ ...st.input, ...(errors.email ? st.inputErr : {}) }} />
            {errors.email && <p style={st.fieldErr}>{errors.email}</p>}
          </div>

          {/* Password */}
          <div style={{ ...st.field, animation: mounted ? 'fsu 0.45s 0.15s ease both' : 'none' }}>
            <label style={st.label}>Password</label>
            <div style={st.pwWrap}>
              <input name="password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={handleChange} onBlur={handleBlur}
                style={{ ...st.input, paddingRight: '42px', ...(errors.password ? st.inputErr : {}) }} />
              <button
                type="button"
                style={st.eyeBtn}
                onClick={() => setShowPw(p => !p)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                title={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>
            {errors.password && <p style={st.fieldErr}>{errors.password}</p>}
            {/* ❌ Forgot password link removed */}
          </div>

          {apiErr && <div style={{ ...st.apiErr, animation: 'shake 0.4s ease' }}>{apiErr}</div>}

          <button type="submit" disabled={loading}
            style={{ ...st.btn, opacity: loading ? 0.75 : 1, animation: mounted ? 'fsu 0.45s 0.22s ease both' : 'none' }}>
            {loading ? <span style={st.spinner} /> : 'Sign In →'}
          </button>
        </form>

        <div style={st.divider}>
          <span style={st.dividerLine} />
          <span style={st.dividerLabel}>OR</span>
          <span style={st.dividerLine} />
        </div>

        <div id="googleBtn" style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px' }} />

        <p style={st.switchTxt}>
          Don&apos;t have an account? <Link to="/signup" style={st.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

// ── Keyframes ─────────────────────────────────────────────────────────────────
const kf = `
  @keyframes fsu { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes tlp { 0%,100%{opacity:.7} 50%{opacity:1} }
  input:focus { border-color:rgba(212,175,55,0.65) !important; box-shadow:0 0 0 3px rgba(212,175,55,0.07); }
  button[type=submit]:hover:not(:disabled) { opacity:.88 !important; transform:translateY(-1px); }
`;

// ── Styles ────────────────────────────────────────────────────────────────────
const st = {
  bg: {
    height: '100vh', overflow: 'hidden',
    background: 'radial-gradient(ellipse at 28% 18%, rgba(212,175,55,0.07) 0%, transparent 56%), #080806',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    padding: '0 24px', position: 'relative', zIndex: 1,
  },
  topLine: {
    position: 'fixed', top: 0, left: 0, right: 0, height: '2px',
    background: `linear-gradient(90deg, transparent 0%, ${GOLD} 35%, #ffe97a 50%, ${GOLD} 65%, transparent 100%)`,
    zIndex: 100, animation: 'tlp 3s ease-in-out infinite',
  },
  card: {
    background: 'rgba(12,10,6,0.98)', border: `1px solid ${GOLD_DIM}`,
    borderRadius: '8px', padding: '30px 40px',
    width: '100%', maxWidth: '420px',
    boxShadow: '0 0 0 1px rgba(212,175,55,0.04), 0 24px 64px rgba(0,0,0,0.75)',
    position: 'relative', zIndex: 2,
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '18px' },
  logoImg: {
    width: '40px', height: '40px', objectFit: 'contain', display: 'block',
    borderRadius: '9px', border: `1px solid ${GOLD_DIM}`,
    background: 'rgba(212,175,55,0.06)',
  },
  logoText: {
    fontSize: '22px', fontWeight: '600', color: '#fff',
    fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: '0.01em',
  },
  logoEm: { color: GOLD, fontStyle: 'italic', fontWeight: '400' },
  title: {
    color: '#fff', fontSize: '24px', fontWeight: '400', margin: '0 0 3px',
    fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: '-0.01em',
  },
  subtitle: { color: 'rgba(255,255,255,0.36)', fontSize: '13px', margin: '0 0 18px', fontWeight: '300' },
  field: { marginBottom: '14px' },
  label: {
    display: 'block', color: 'rgba(255,255,255,0.48)', fontSize: '9.5px',
    letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px',
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(212,175,55,0.22)`,
    borderRadius: '4px', color: '#fff', fontSize: '14px',
    padding: '10px 13px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputErr: { borderColor: 'rgba(248,113,113,0.6)' },
  fieldErr: { margin: '4px 0 0', color: '#f87171', fontSize: '11px' },
  pwWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    color: 'rgba(255,255,255,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '3px', transition: 'color 0.18s',
    lineHeight: 0,
  },
  apiErr: {
    background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.28)',
    borderRadius: '4px', color: '#f87171', fontSize: '12px',
    padding: '10px 13px', marginBottom: '12px', lineHeight: 1.5,
  },
  btn: {
    background: `linear-gradient(135deg, ${GOLD} 0%, #c49b20 100%)`,
    border: 'none', borderRadius: '4px', color: '#0a0800',
    cursor: 'pointer', fontSize: '11px', fontWeight: '700',
    letterSpacing: '0.13em', padding: '12px', textTransform: 'uppercase',
    width: '100%', marginTop: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '43px', transition: 'opacity 0.2s, transform 0.15s',
  },
  spinner: {
    width: '16px', height: '16px',
    border: '2px solid rgba(10,8,0,0.2)', borderTopColor: '#0a0800',
    borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite',
  },
  divider: { display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 10px' },
  dividerLine: { flex: 1, height: '1px', background: `rgba(212,175,55,0.13)` },
  dividerLabel: { color: 'rgba(255,255,255,0.26)', fontSize: '10px', letterSpacing: '0.1em' },
  switchTxt: { color: 'rgba(255,255,255,0.3)', fontSize: '12px', textAlign: 'center', margin: '12px 0 0' },
  link: { color: GOLD, textDecoration: 'none', fontWeight: '500' },
};