import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/authService';
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
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2 + 0.2,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
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

// ── Validators ────────────────────────────────────────────────────────────────
function validateEmail(email) {
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(email)) return 'Enter a valid email address';
  const domain = email.split('@')[1]?.toLowerCase();
  const typos = { 'gmai.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'yaho.com': 'yahoo.com', 'hotmial.com': 'hotmail.com' };
  if (typos[domain]) return `Did you mean @${typos[domain]}?`;
  return null;
}
function validatePassword(pw) {
  if (pw.length < 8)             return 'At least 8 characters required';
  if (!/[A-Z]/.test(pw))         return 'Include one uppercase letter';
  if (!/[a-z]/.test(pw))         return 'Include one lowercase letter';
  if (!/[0-9]/.test(pw))         return 'Include one number';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Include one symbol (!@#$…)';
  return null;
}
function getStrength(pw) {
  return [/.{8,}/, /[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(pw)).length;
}

// ── Strength Bar ──────────────────────────────────────────────────────────────
function StrengthBar({ password }) {
  if (!password) return null;
  const score = getStrength(password);
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong ✓'];
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '3px', marginBottom: '4px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            flex: 1, height: '3px', borderRadius: '2px',
            background: i <= score ? colors[score] : 'rgba(255,255,255,0.08)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: '10px', color: colors[score] || 'rgba(255,255,255,0.3)', transition: 'color 0.3s' }}>
        {labels[score] || ''}
      </span>
    </div>
  );
}

const REQS = [
  { re: /.{8,}/, label: '8+ chars' },
  { re: /[A-Z]/, label: 'Uppercase' },
  { re: /[a-z]/, label: 'Lowercase' },
  { re: /[0-9]/, label: 'Number' },
  { re: /[^A-Za-z0-9]/, label: 'Symbol' },
];

// ── Main SignupPage ───────────────────────────────────────────────────────────
export default function SignupPage() {
  const navigate = useNavigate();
  const { onLoginSuccess } = useAuth();

  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [apiErr, setApiErr]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [showReq, setShowReq] = useState(false);
  const [touched, setTouched] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    const v = name === 'email' ? value.toLowerCase() : value;
    setForm(p => ({ ...p, [name]: v }));
    if (touched[name]) validateField(name, v);
  };
  const handleBlur = e => {
    const { name, value } = e.target;
    setTouched(p => ({ ...p, [name]: true }));
    validateField(name, value);
    if (name === 'password') setShowReq(false);
  };
  const validateField = (name, value) => {
    let err = null;
    if (name === 'name')     err = value.trim().length < 2 ? 'At least 2 characters' : null;
    if (name === 'email')    err = validateEmail(value);
    if (name === 'password') err = validatePassword(value);
    setErrors(p => ({ ...p, [name]: err }));
    return !err;
  };
  const validateAll = () => {
    const errs = {
      name:     form.name.trim().length < 2 ? 'At least 2 characters' : null,
      email:    validateEmail(form.email),
      password: validatePassword(form.password),
    };
    setErrors(errs);
    return !errs.name && !errs.email && !errs.password;
  };
  const handleSubmit = async e => {
    e.preventDefault(); setApiErr('');
    if (!validateAll()) return;
    setLoading(true);
    try { const data = await register(form); onLoginSuccess(data.user, data.accessToken); navigate('/gallery'); }
    catch (err) { setApiErr(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.bg}>
      <style>{kf}</style>
      <ParticleCanvas />
      <div style={s.topLine} />

      <div style={{
        ...s.card,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
        transition: 'opacity 0.6s cubic-bezier(.22,1,.36,1), transform 0.6s cubic-bezier(.22,1,.36,1)',
      }}>

        {/* Logo */}
        <div style={s.logoRow}>
          <img src="/logo.png" alt="LensIQ" style={s.logoImg} />
          <span style={s.logoText}>Lens<em style={{ color: GOLD, fontStyle: 'italic', fontWeight: '400' }}>IQ</em></span>
        </div>

        <h1 style={s.title}>Create your account</h1>
        <p style={s.subtitle}>Join photographers finding perfect locations</p>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Name */}
          <div style={{ ...s.field, animation: mounted ? 'fsu 0.45s 0.07s ease both' : 'none' }}>
            <label style={s.label}>Full Name</label>
            <input name="name" type="text" required placeholder="Your full name"
              value={form.name} onChange={handleChange} onBlur={handleBlur} autoComplete="name"
              style={{ ...s.input, ...(errors.name ? s.inputErr : {}) }} />
            {errors.name && <p style={s.fieldErr}>⚠ {errors.name}</p>}
          </div>

          {/* Email */}
          <div style={{ ...s.field, animation: mounted ? 'fsu 0.45s 0.13s ease both' : 'none' }}>
            <label style={s.label}>Email Address</label>
            <input name="email" type="email" required placeholder="you@gmail.com"
              value={form.email} onChange={handleChange} onBlur={handleBlur} autoComplete="email"
              style={{ ...s.input, ...(errors.email ? s.inputErr : {}) }} />
            {errors.email && <p style={s.fieldErr}>⚠ {errors.email}</p>}
          </div>

          {/* Password */}
          <div style={{ ...s.field, animation: mounted ? 'fsu 0.45s 0.19s ease both' : 'none' }}>
            <label style={s.label}>Password</label>
            <div style={s.pwWrap}>
              <input name="password" type={showPw ? 'text' : 'password'} required
                placeholder="8+ chars, upper, lower, number, symbol"
                value={form.password} onChange={handleChange}
                onFocus={() => setShowReq(true)} onBlur={handleBlur}
                autoComplete="new-password"
                style={{ ...s.input, paddingRight: '42px', ...(errors.password ? s.inputErr : {}) }} />
              <button
                type="button"
                style={s.eyeBtn}
                onClick={() => setShowPw(p => !p)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                title={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>
            <StrengthBar password={form.password} />
            {/* Requirements */}
            {(showReq || form.password) && (
              <div style={s.reqList}>
                {REQS.map(req => {
                  const met = req.re.test(form.password);
                  return (
                    <span key={req.label} style={{ ...s.req, color: met ? '#4ade80' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}>
                      {met ? '✓' : '○'} {req.label}
                    </span>
                  );
                })}
              </div>
            )}
            {errors.password && !showReq && <p style={s.fieldErr}>⚠ {errors.password}</p>}
          </div>

          {apiErr && <div style={{ ...s.apiErr, animation: 'shake 0.4s ease' }}>{apiErr}</div>}

          <button type="submit" disabled={loading}
            style={{ ...s.btn, opacity: loading ? 0.72 : 1, animation: mounted ? 'fsu 0.45s 0.25s ease both' : 'none' }}>
            {loading ? <span style={s.spinner} /> : 'Create Account →'}
          </button>
        </form>

        <p style={s.switchTxt}>
          Already have an account?{' '}
          <Link to="/login" style={s.link}>Sign in</Link>
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
const s = {
  bg: {
    height: '100vh', overflow: 'hidden',
    background: 'radial-gradient(ellipse at 72% 78%, rgba(212,175,55,0.06) 0%, transparent 55%), #080806',
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
    borderRadius: '8px', padding: '28px 40px',
    width: '100%', maxWidth: '420px',
    boxShadow: '0 0 0 1px rgba(212,175,55,0.04), 0 24px 64px rgba(0,0,0,0.75)',
    position: 'relative', zIndex: 2,
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '16px' },
  logoImg: {
    width: '40px', height: '40px', objectFit: 'contain', display: 'block',
    borderRadius: '9px', border: `1px solid ${GOLD_DIM}`,
    background: 'rgba(212,175,55,0.06)',
  },
  logoText: {
    fontSize: '22px', fontWeight: '600', color: '#fff',
    fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: '0.01em',
  },
  title: {
    color: '#fff', fontSize: '23px', fontWeight: '400', margin: '0 0 3px',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  subtitle: { color: 'rgba(255,255,255,0.36)', fontSize: '12.5px', margin: '0 0 16px', fontWeight: '300' },
  field: { marginBottom: '13px' },
  label: {
    display: 'block', color: 'rgba(255,255,255,0.48)', fontSize: '9.5px',
    letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '5px',
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(212,175,55,0.22)`,
    borderRadius: '4px', color: '#fff', fontSize: '14px',
    padding: '10px 13px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputErr: { borderColor: 'rgba(248,113,113,0.6)' },
  fieldErr: { margin: '3px 0 0', color: '#f87171', fontSize: '11px' },
  pwWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    color: 'rgba(255,255,255,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '3px', transition: 'color 0.18s',
    lineHeight: 0,
  },
  reqList: { display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: '7px' },
  req: { fontSize: '10.5px' },
  apiErr: {
    background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.28)',
    borderRadius: '4px', color: '#f87171', fontSize: '12px',
    padding: '9px 13px', marginBottom: '10px', lineHeight: 1.5,
  },
  btn: {
    background: `linear-gradient(135deg, ${GOLD} 0%, #c49b20 100%)`,
    border: 'none', borderRadius: '4px', color: '#0a0800',
    cursor: 'pointer', fontSize: '11px', fontWeight: '700',
    letterSpacing: '0.13em', padding: '12px', textTransform: 'uppercase',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '43px', marginTop: '6px', width: '100%',
    transition: 'opacity 0.2s, transform 0.15s',
  },
  spinner: {
    width: '16px', height: '16px',
    border: '2px solid rgba(10,8,0,0.2)', borderTopColor: '#0a0800',
    borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite',
  },
  switchTxt: { color: 'rgba(255,255,255,0.3)', fontSize: '12px', textAlign: 'center', margin: '14px 0 0' },
  link: { color: GOLD, textDecoration: 'none', fontWeight: '500' },
};