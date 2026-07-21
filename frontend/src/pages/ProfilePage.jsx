import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, updateProfile } from '../services/authService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: ctxUser, isLoggedIn, logout, setUser } = useAuth();
  const avatarInputRef = useRef(null);

  const [user, setLocalUser]               = useState(ctxUser);
  const [allPhotos, setAllPhotos]          = useState([]);
  const [activeTab, setActiveTab]          = useState('collections');
  const [filter, setFilter]               = useState('ALL');
  const [loading, setLoading]             = useState(true);
  const [editing, setEditing]             = useState(false);
  const [editForm, setEditForm]           = useState({ name: '', city: '', bio: '' });
  const [saving, setSaving]               = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [favorites, setFavorites]         = useState([]);
  const [mounted, setMounted]             = useState(false);
  const [scrollY, setScrollY]             = useState(0);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) navigate('/login', { replace: true });
  }, [isLoggedIn, navigate]);

  const loadData = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const [freshUser, photosRes, favRes] = await Promise.all([
        getMyProfile(),
        fetch(`${API_BASE}/api/photos/user`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_BASE}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      setLocalUser(freshUser);
      setUser(freshUser);
      if (photosRes.success) {
        const combined = [
          ...(photosRes.data.best     || []).map(p => ({ ...p, category: 'BEST'     })),
          ...(photosRes.data.average  || []).map(p => ({ ...p, category: 'AVERAGE'  })),
          ...(photosRes.data.rejected || []).map(p => ({ ...p, category: 'REJECTED' })),
        ];
        setAllPhotos(combined);
      }
      if (Array.isArray(favRes)) setFavorites(favRes);
      else if (favRes.data) setFavorites(favRes.data);
    } catch (err) {
      if (err.message === 'Unauthorized' || err.status === 401) {
        logout(); navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, setUser, logout, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setAvatarPreview(ev.target.result);
      try {
        const updated = await updateProfile({ ...user, profilePic: ev.target.result });
        setLocalUser(updated); setUser(updated);
      } catch (err) { console.error('Avatar update failed:', err); }
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = async () => {
    try {
      const updated = await updateProfile({ ...user, profilePic: null });
      setLocalUser(updated); setUser(updated); setAvatarPreview(null);
    } catch (err) { console.error('Remove avatar failed:', err); }
  };

  const startEdit = () => {
    setEditForm({ name: user?.name || '', city: user?.city || '', bio: user?.bio || '' });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile(editForm);
      setLocalUser(updated); setUser(updated); setEditing(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const bestCount    = allPhotos.filter(p => p.category === 'BEST').length;
  const avgCount     = allPhotos.filter(p => p.category === 'AVERAGE').length;
  const rejCount     = allPhotos.filter(p => p.category === 'REJECTED').length;
  const totalUploads = allPhotos.length;

  const displayName = user?.name || 'Photographer';
  const initials    = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarSrc   = avatarPreview || user?.profilePic || null;

  const filteredPhotos = allPhotos.filter(p => filter === 'ALL' ? true : p.category === filter);

  if (loading) return <LoadingScreen />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ═══════════════════════════════════════
           CSS CUSTOM PROPERTIES — THEME AWARE
        ═══════════════════════════════════════ */
        :root,
        html[data-theme='dark'] {
          --bg:                #0a0a0b;
          --bg-panel:          #111113;
          --bg-card:           #161618;
          --bg-card-hover:     #1c1c1f;
          --border:            rgba(255,255,255,0.07);
          --border-bright:     rgba(255,255,255,0.14);
          --text:              #f0ede8;
          --text-sec:          rgba(240,237,232,0.55);
          --text-muted:        rgba(240,237,232,0.30);
          --accent:            #c8a96e;
          --accent-dim:        rgba(200,169,110,0.13);
          --accent-glow:       rgba(200,169,110,0.22);
          --accent-hover:      #d9bc83;
          --sidebar-bg:        #111113;
          --sidebar-border:    rgba(200,169,110,0.15);
          --modal-bg:          #111113;
          --input-bg:          rgba(255,255,255,0.04);
          --input-border:      rgba(255,255,255,0.10);
          --card-bg:           #161618;
          --card-border:       rgba(255,255,255,0.07);
          --nf-card-inner-bg:  #161618;
          --nf-info-panel-bg:  #1a1a1c;
          --nf-info-panel-hvr: #232325;
          --bar-track:         rgba(255,255,255,0.08);
          --pill-color:        rgba(240,237,232,0.45);
          --pill-border:       rgba(200,169,110,0.20);
          --pill-active-text:  #0a0a0b;
          --tab-color:         rgba(240,237,232,0.40);
          --tab-border:        rgba(255,255,255,0.07);
          --orb-1:             rgba(200,169,110,0.07);
          --orb-2:             rgba(91,191,106,0.04);
          --orb-3:             rgba(192,97,74,0.04);
          --gradient-sidebar:  linear-gradient(160deg, #161618 0%, #111113 100%);
          --shimmer-from:      rgba(255,255,255,0.00);
          --shimmer-via:       rgba(255,255,255,0.04);
          --shimmer-to:        rgba(255,255,255,0.00);
          --fav-card-bg:       rgba(17,17,19,0.90);
          --fav-card-border:   rgba(200,169,110,0.20);
        }

        html[data-theme='light'] {
          --bg:                #f4f1eb;
          --bg-panel:          #eceae2;
          --bg-card:           #fffdf7;
          --bg-card-hover:     #f7f5ef;
          --border:            rgba(0,0,0,0.08);
          --border-bright:     rgba(0,0,0,0.14);
          --text:              #1a1510;
          --text-sec:          rgba(26,21,16,0.60);
          --text-muted:        rgba(26,21,16,0.35);
          --accent:            #a07830;
          --accent-dim:        rgba(160,120,48,0.13);
          --accent-glow:       rgba(160,120,48,0.20);
          --accent-hover:      #b98a38;
          --sidebar-bg:        #fffdf7;
          --sidebar-border:    rgba(160,120,48,0.20);
          --modal-bg:          #fffdf7;
          --input-bg:          rgba(0,0,0,0.03);
          --input-border:      rgba(0,0,0,0.12);
          --card-bg:           #fffdf7;
          --card-border:       rgba(0,0,0,0.08);
          --nf-card-inner-bg:  #fffdf7;
          --nf-info-panel-bg:  #f4f1eb;
          --nf-info-panel-hvr: #eceae2;
          --bar-track:         rgba(0,0,0,0.07);
          --pill-color:        rgba(26,21,16,0.55);
          --pill-border:       rgba(160,120,48,0.25);
          --pill-active-text:  #fff;
          --tab-color:         rgba(26,21,16,0.40);
          --tab-border:        rgba(0,0,0,0.08);
          --orb-1:             rgba(160,120,48,0.06);
          --orb-2:             rgba(91,191,106,0.04);
          --orb-3:             rgba(192,97,74,0.03);
          --gradient-sidebar:  linear-gradient(160deg, #fffdf7 0%, #f4f1eb 100%);
          --shimmer-from:      rgba(255,255,255,0.0);
          --shimmer-via:       rgba(255,255,255,0.5);
          --shimmer-to:        rgba(255,255,255,0.0);
          --fav-card-bg:       rgba(255,253,247,0.95);
          --fav-card-border:   rgba(160,120,48,0.22);
        }

        /* ═══════════════════════════════════════
           KEYFRAMES
        ═══════════════════════════════════════ */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideRight {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(40px, -30px) scale(1.08); }
          66%       { transform: translate(-25px, 20px) scale(0.95); }
        }
        @keyframes orb-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(-30px, 40px) scale(1.05); }
          66%       { transform: translate(20px, -15px) scale(0.97); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bar-grow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes count-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px var(--accent-glow); }
          50%       { box-shadow: 0 0 40px var(--accent-glow), 0 0 80px var(--accent-dim); }
        }
        @keyframes border-trace {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes tab-indicator {
          from { width: 0; opacity: 0; }
          to   { width: 100%; opacity: 1; }
        }

        /* ═══════════════════════════════════════
           PAGE LAYOUT
        ═══════════════════════════════════════ */
        .prof-page {
          min-height: 100vh;
          background: var(--bg);
          padding: 80px 38px 60px;
          color: var(--text);
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow-x: hidden;
          position: relative;
          transition: background 0.4s ease, color 0.4s ease;
        }

        /* Ambient orbs */
        .prof-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          filter: blur(90px);
          will-change: transform;
        }
        .prof-orb-1 {
          width: 700px; height: 700px;
          top: -10%; right: -10%;
          background: radial-gradient(circle, var(--orb-1), transparent 65%);
          animation: orb-float 18s ease-in-out infinite;
        }
        .prof-orb-2 {
          width: 500px; height: 500px;
          bottom: 20%; left: -8%;
          background: radial-gradient(circle, var(--orb-2), transparent 65%);
          animation: orb-float-2 22s ease-in-out infinite;
        }
        .prof-orb-3 {
          width: 400px; height: 400px;
          top: 50%; right: 20%;
          background: radial-gradient(circle, var(--orb-3), transparent 65%);
          animation: orb-float 28s ease-in-out infinite reverse;
        }

        .prof-container {
          display: flex;
          gap: 36px;
          max-width: 1380px;
          margin: 0 auto;
          align-items: flex-start;
          position: relative;
          z-index: 1;
          overflow: visible;
        }

        /* ═══════════════════════════════════════
           SIDEBAR
        ═══════════════════════════════════════ */
        .prof-sidebar {
          width: 264px;
          flex-shrink: 0;
          background: var(--sidebar-bg);
          border: 1px solid var(--sidebar-border);
          border-radius: 20px;
          padding: 28px 22px;
          position: sticky;
          top: 92px;
          align-self: flex-start;
          overflow: visible;
          transition: background 0.4s, border-color 0.4s, box-shadow 0.4s;
          animation: fadeUp 0.65s cubic-bezier(0.34,1.2,0.64,1) both;
        }
        .prof-sidebar::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 21px;
          background: linear-gradient(135deg, var(--accent), transparent 60%, transparent 70%, var(--accent-dim));
          z-index: -1;
          opacity: 0;
          transition: opacity 0.4s;
        }
        .prof-sidebar:hover::before { opacity: 1; }
        .prof-sidebar:hover {
          box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px var(--accent-dim);
        }

       

        /* ═══════════════════════════════════════
           AVATAR
        ═══════════════════════════════════════ */
        .prof-avatar-wrap {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto 10px;
        }
        .prof-avatar-ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          background: conic-gradient(var(--accent) 0deg, var(--accent-dim) 120deg, var(--accent) 240deg, transparent 360deg);
          animation: border-trace 3s linear infinite;
          background-size: 200% 200%;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .prof-avatar-wrap:hover .prof-avatar-ring { opacity: 1; }
        .prof-avatar-pulse {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 1.5px solid var(--accent);
          animation: pulse-ring 2.5s ease-out infinite;
        }
        .prof-avatar {
          width: 100%; height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--accent);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .prof-avatar-wrap:hover .prof-avatar {
          transform: scale(1.04);
          box-shadow: 0 0 28px var(--accent-glow);
        }
        .prof-avatar-fallback {
          width: 100%; height: 100%;
          border-radius: 50%;
          background: var(--accent-dim);
          border: 2px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 30px;
          font-weight: 300;
          color: var(--accent);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .prof-avatar-wrap:hover .prof-avatar-fallback {
          transform: scale(1.04);
          box-shadow: 0 0 28px var(--accent-glow);
        }
        .prof-camera-btn {
          position: absolute;
          bottom: 0; right: 0;
          width: 30px; height: 30px;
          border-radius: 50%;
          background: var(--accent);
          border: 2.5px solid var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          padding: 0;
          transition: transform 0.25s cubic-bezier(0.34,1.5,0.64,1), background 0.2s;
          z-index: 2;
        }
        .prof-camera-btn:hover {
          transform: scale(1.18) rotate(12deg);
          background: var(--accent-hover);
        }
        .prof-remove-btn {
          display: block;
          margin: 8px auto 0;
          background: transparent;
          border: 1px solid var(--border-bright);
          color: var(--text-muted);
          border-radius: 20px;
          font-size: 10px;
          letter-spacing: 0.06em;
          padding: 4px 14px;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s, color 0.2s, transform 0.2s;
        }
        .prof-remove-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
          transform: translateY(-1px);
        }

        /* ═══════════════════════════════════════
           SIDEBAR TEXT
        ═══════════════════════════════════════ */
        .prof-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.3rem;
          font-weight: 400;
          text-align: center;
          color: var(--text);
          margin: 14px 0 4px;
          word-break: break-word;
          animation: count-up 0.5s 0.2s both;
        }
        .prof-email {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 6px;
          word-break: break-all;
          letter-spacing: 0.04em;
        }
        .prof-city {
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 10px;
          letter-spacing: 0.06em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .prof-bio {
          color: var(--text-sec);
          text-align: center;
          line-height: 1.65;
          margin-bottom: 16px;
          font-style: italic;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 0.95rem;
          padding: 10px 12px;
          background: var(--accent-dim);
          border-radius: 10px;
          border-left: 2px solid var(--accent);
          position: relative;
        }
        .prof-bio::before {
          content: '"';
          font-size: 2rem;
          color: var(--accent);
          opacity: 0.4;
          position: absolute;
          top: -4px;
          left: 8px;
          font-family: Georgia, serif;
          line-height: 1;
        }

        /* ═══════════════════════════════════════
           STATS GRID
        ═══════════════════════════════════════ */
        .prof-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 18px 4px;
          margin-bottom: 20px;
        }
        .prof-stat-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 8px;
          border-radius: 10px;
          background: var(--accent-dim);
          border: 1px solid transparent;
          transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
          cursor: default;
          position: relative;
          overflow: hidden;
        }
        .prof-stat-cell:: after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--shimmer-from), var(--shimmer-via), var(--shimmer-to));
          background-size: 200% 100%;
          opacity: 0;
          transition: opacity 0.3s;
          animation: shimmer 2s ease infinite paused;
        }
        .prof-stat-cell:hover::after {
          opacity: 1;
          animation-play-state: running;
        }
        .prof-stat-cell:hover {
          border-color: var(--accent);
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 24px var(--accent-dim);
        }
        .prof-stat-num {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 2rem;
          font-weight: 300;
          line-height: 1;
          color: var(--text);
          transition: color 0.2s;
        }
        .prof-stat-num--gold { color: var(--accent) !important; }
        .prof-stat-label {
          font-size: 9px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 500;
        }

        /* ═══════════════════════════════════════
           SIDEBAR BUTTONS
        ═══════════════════════════════════════ */
        .prof-edit-btn {
          width: 100%;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          color: #0a0a0b;
          padding: 12px 0;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .prof-edit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .prof-edit-btn:hover::before { transform: translateX(100%); }
        .prof-edit-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px var(--accent-glow);
        }
        .prof-logout-btn {
          width: 100%;
          background: transparent;
          border: 1px solid var(--border-bright);
          border-radius: 8px;
          color: var(--text-muted);
          padding: 11px 0;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          letter-spacing: 0.06em;
          transition: border-color 0.2s, color 0.2s, transform 0.2s;
        }
        .prof-logout-btn:hover {
          border-color: rgba(255, 80, 80, 0.4);
          color: #ff6b6b;
          transform: translateY(-1px);
        }

        /* ═══════════════════════════════════════
           MAIN CONTENT
        ═══════════════════════════════════════ */
        .prof-main {
          flex: 1;
          min-width: 0;
          overflow: visible;
          animation: fadeUp 0.75s 0.15s cubic-bezier(0.34,1.2,0.64,1) both;
        }

        /* Hero header */
        .prof-hero {
        }
        .prof-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.20em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 12px;
        }
        .prof-eyebrow-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--accent);
          display: inline-block;
          animation: pulse-ring 2s ease-out infinite;
        }
        .prof-page-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(2.2rem, 4.5vw, 3.6rem);
          font-weight: 300;
          line-height: 1.08;
          color: var(--text);
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }
        .prof-page-title em {
          font-style: italic;
          color: var(--accent);
          position: relative;
        }
        .prof-page-title em::after {
          content: '';
          position: absolute;
          bottom: 2px; left: 0; right: 0;
          height: 1px;
          background: var(--accent);
          opacity: 0.4;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        .prof-page-title:hover em::after { transform: scaleX(1); }
        .prof-page-sub {
          font-size: 14px;
          font-weight: 300;
          color: var(--text-sec);
          line-height: 1.7;
          margin-bottom: 5px;
        }

        /* ═══════════════════════════════════════
           TABS
        ═══════════════════════════════════════ */
        .prof-tabs {
          display: flex;
          gap: 32px;
          border-bottom: 1px solid var(--tab-border);
          margin-bottom: 30px;
          position: relative;
        }
        .prof-tab-btn {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 12px 0;
          color: var(--tab-color);
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition: color 0.25s, border-color 0.25s;
          margin-bottom: -1px;
          position: relative;
        }
        .prof-tab-btn::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 0; right: 0;
          height: 2px;
          background: var(--accent);
          transform: scaleX(0);
          transition: transform 0.3s cubic-bezier(0.34,1.2,0.64,1);
        }
        .prof-tab-btn:hover { color: var(--text-sec); }
        .prof-tab-btn.active { color: var(--accent); }
        .prof-tab-btn.active::after { transform: scaleX(1); }

        /* ═══════════════════════════════════════
           FILTER PILLS
        ═══════════════════════════════════════ */
        .prof-pills {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 28px;
          align-items: center;
        }
        .prof-pill {
          position: relative;
          border: 1px solid var(--pill-border);
          background: transparent;
          padding: 8px 22px;
          border-radius: 40px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--pill-color);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .prof-pill::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--accent);
          opacity: 0;
          transform: scale(0.5);
          transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.5,0.64,1);
          border-radius: 40px;
        }
        .prof-pill span { position: relative; z-index: 1; }
        .prof-pill:hover {
          border-color: rgba(200,169,110,0.5);
          color: var(--text);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(200,169,110,0.12);
        }
        .prof-pill.active { color: var(--pill-active-text); border-color: var(--accent); }
        .prof-pill.active::before { opacity: 1; transform: scale(1); }
        .prof-pill-count {
          font-size: 9px;
          opacity: 0.65;
          font-weight: 600;
          margin-left: 6px;
          letter-spacing: 0.04em;
        }

        /* ═══════════════════════════════════════
           MODAL
        ═══════════════════════════════════════ */
        .prof-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9000;
          backdrop-filter: blur(6px);
          animation: fadeIn 0.2s ease both;
        }
        .prof-modal {
          background: var(--modal-bg);
          border: 1px solid var(--sidebar-border);
          border-radius: 16px;
          padding: 32px;
          width: 380px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,169,110,0.12);
          display: flex;
          flex-direction: column;
          position: relative;
          animation: scaleIn 0.3s cubic-bezier(0.34,1.2,0.64,1) both;
          overflow: hidden;
        }
        .prof-modal::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(to right, var(--accent), transparent);
          border-radius: 16px 16px 0 0;
        }
        .prof-modal-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.7rem;
          font-weight: 300;
          color: var(--text);
          margin-bottom: 4px;
        }
        .prof-modal-sub {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          margin-bottom: 24px;
        }
        .prof-form-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 28px;
        }
        .prof-form-label {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .prof-label-text {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 500;
        }
        .prof-input {
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 8px;
          color: var(--text);
          font-size: 14px;
          padding: 11px 14px;
          width: 100%;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .prof-input::placeholder { color: var(--text-muted); }
        .prof-input:focus {
          border-color: rgba(200,169,110,0.5);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }
        .prof-modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .prof-modal-save {
          background: var(--accent);
          border: none;
          border-radius: 8px;
          color: #0a0a0b;
          padding: 11px 26px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 13px;
          transition: background 0.2s, transform 0.2s;
        }
        .prof-modal-save:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
        .prof-modal-save:disabled { opacity: 0.55; cursor: wait; }
        .prof-modal-cancel {
          background: transparent;
          border: 1px solid var(--border-bright);
          color: var(--text-sec);
          border-radius: 8px;
          padding: 11px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          transition: border-color 0.2s, color 0.2s;
        }
        .prof-modal-cancel:hover { border-color: var(--accent); color: var(--accent); }

        /* ═══════════════════════════════════════
           ANALYSIS CARD
        ═══════════════════════════════════════ */
        .prof-ac-card {
          display: flex;
          background: var(--bg-card);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          overflow: hidden;
          transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s, background 0.4s;
          animation: fadeUp 0.5s both;
        }
        .prof-ac-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.15);
          border-color: rgba(200,169,110,0.25);
        }
        .prof-ac-thumb { width: 92px; flex-shrink: 0; }
        .prof-ac-img { width: 92px; height: 70px; object-fit: cover; display: block; }
        .prof-ac-body { flex: 1; padding: 12px 18px; display: flex; flex-direction: column; gap: 8px; }
        .prof-ac-top { display: flex; align-items: center; gap: 10px; }
        .prof-ac-cat {
          border-radius: 3px; color: rgb(0, 0, 0);
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.10em; padding: 3px 8px;
          text-transform: uppercase;
        }
        .prof-ac-type { color: var(--text-muted); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
        .prof-ac-bars { display: flex; gap: 20px; flex-wrap: wrap; }
        .prof-ac-reasons { display: flex; gap: 6px; flex-wrap: wrap; }
        .prof-ac-reason {
          background: var(--accent-dim);
          border: 1px solid rgba(200,169,110,0.2);
          border-radius: 3px; color: var(--text-sec);
          font-size: 11px; padding: 2px 9px;
        }

        /* Mini bar */
        .prof-mini-bar { min-width: 60px; flex: 1; }
        .prof-mini-bar-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .prof-mini-bar-label { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
        .prof-mini-bar-val { font-size: 10px; font-weight: 600; color: var(--accent); }
        .prof-mini-bar-track {
          height: 2px;
          background: var(--bar-track);
          border-radius: 1px;
          overflow: hidden;
        }
        .prof-mini-bar-fill {
          height: 100%;
          background: linear-gradient(to right, var(--accent), var(--accent-hover));
          border-radius: 1px;
          transform-origin: left;
          animation: bar-grow 0.8s cubic-bezier(0.4,0,0.2,1) both;
        }

        /* ═══════════════════════════════════════
           FAVORITES / INTERESTED TAB
        ═══════════════════════════════════════ */
        .prof-fav-card {
          display: flex;
          gap: 18px;
          background: var(--fav-card-bg);
          border: 1px solid var(--fav-card-border);
          border-radius: 14px;
          padding: 16px 20px;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          animation: fadeUp 0.5s both;
          position: relative;
          overflow: hidden;
        }
        .prof-fav-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 3px;
          height: 0;
          background: var(--accent);
          border-radius: 0 0 0 14px;
          transition: height 0.3s ease;
        }
        .prof-fav-card:hover::before { height: 100%; }
        .prof-fav-card:hover {
          border-color: rgba(200,169,110,0.45);
          transform: translateX(6px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        }

        /* ═══════════════════════════════════════
           EMPTY STATE
        ═══════════════════════════════════════ */
        .prof-empty {
          text-align: center;
          padding: 72px 20px;
          color: var(--text-muted);
          animation: fadeIn 0.5s ease both;
        }
        .prof-empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
        .prof-empty-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.5rem; font-weight: 300;
          color: var(--text); margin-bottom: 8px;
        }
        .prof-empty-sub { font-size: 13px; margin-bottom: 24px; line-height: 1.65; }
        .prof-empty-btn {
          background: var(--accent); border: none; border-radius: 8px;
          color: #0a0a0b; padding: 11px 26px;
          font-family: 'DM Sans', sans-serif; font-size: 12px;
          font-weight: 600; letter-spacing: 0.08em; 
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .prof-empty-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px var(--accent-glow);
          background: var(--accent-hover);
        }

        /* ═══════════════════════════════════════
           LOADING SCREEN
        ═══════════════════════════════════════ */
        .prof-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
        }
        .prof-spinner {
          width: 40px; height: 40px;
          border: 1.5px solid var(--border-bright);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
          margin: 0 auto 16px;
        }
        .prof-loading-text {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        /* ═══════════════════════════════════════
           NETFLIX CAROUSEL  (enhanced)
        ═══════════════════════════════════════ */
        .nf-root {
          position: relative;
          padding-bottom: 24px;
        }
        .nf-dots {
          display: flex;
          justify-content: flex-end;
          gap: 4px;
          margin-bottom: 8px;
        }
        .nf-dot {
          height: 2px;
          border-radius: 2px;
          background: var(--border-bright);
          transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        .nf-dot.active { background: var(--accent); }
        .nf-dot:hover { background: var(--accent); opacity: 0.7; }

        .nf-clip {
          position: relative;
          overflow: hidden;
          margin-top: -80px; padding-top: 80px;
          margin-bottom: -80px; padding-bottom: 80px;
        }
        .nf-track {
          display: flex;
          gap: 12px;
          padding: 0 6px;
          transition: transform 0.58s cubic-bezier(0.77,0,0.18,1);
          will-change: transform;
        }

        /* Card base */
        .nf-card {
          flex-shrink: 0;
          width: 210px;
          position: relative;
          z-index: 1;
          transform-origin: center center;
          transition:
            transform 0.38s cubic-bezier(0.34,1.5,0.64,1),
            z-index 0s 0.38s;
          border-radius: 8px;
        }
        .nf-card:hover {
          transform: scale(1.32);
          z-index: 200;
          transition:
            transform 0.38s cubic-bezier(0.34,1.5,0.64,1),
            z-index 0s 0s;
        }
        .nf-card:hover + .nf-card { transform: translateX(22px); transition: transform 0.38s cubic-bezier(0.34,1.2,0.64,1); }
        .nf-track:has(.nf-card:hover) .nf-card:has(+ .nf-card:hover) { transform: translateX(-22px); transition: transform 0.38s cubic-bezier(0.34,1.2,0.64,1); }

        .nf-card-inner {
          background: var(--nf-card-inner-bg);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(0,0,0,0.4);
          border: 1px solid var(--card-border);
          transition: box-shadow 0.38s ease, border-color 0.38s ease;
        }
        .nf-card:hover .nf-card-inner {
          box-shadow: 0 30px 80px rgba(0,0,0,0.85), 0 0 0 1.5px var(--accent);
        }

        .nf-img-wrap {
          position: relative;
          height: 148px;
          overflow: hidden;
          background: var(--bg-panel);
        }
        .nf-img-wrap img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
          pointer-events: none; user-select: none;
          display: block;
        }
        .nf-card:hover .nf-img-wrap img { transform: scale(1.08); }

        .nf-badge {
          position: absolute; top: 8px; left: 8px;
          font-size: 8px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #0a0a0b;
          padding: 2px 8px; border-radius: 3px; z-index: 2;
        }
        .nf-score-chip {
          position: absolute; top: 8px; right: 8px;
          background: rgba(10,10,11,0.85); border-radius: 5px;
          padding: 3px 8px; display: flex; align-items: baseline; gap: 2px;
          backdrop-filter: blur(8px); z-index: 2;
          border: 1px solid var(--accent-dim);
        }
        .nf-hover-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(10,10,11,0.92) 0%, rgba(10,10,11,0.15) 55%, transparent 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          display: flex; flex-direction: column;
          justify-content: flex-end; padding: 10px; z-index: 3;
        }
        .nf-card:hover .nf-hover-overlay { opacity: 1; }

        .nf-info-panel {
          background: var(--nf-info-panel-bg);
          padding: 11px 12px 13px;
          border-top: 1px solid var(--border);
          transition: background 0.3s;
        }
        .nf-card:hover .nf-info-panel { background: var(--nf-info-panel-hvr); }
        .nf-photo-type {
          font-size: 9px; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 7px;
        }

        /* Arrow buttons */
        .nf-btn {
          position: absolute;
          top: 50%; transform: translateY(-50%);
          width: 40px; height: 100px;
          border: none; background: none; 
          display: flex; align-items: center; justify-content: center;
          z-index: 300; border-radius: 4px;
          transition: width 0.2s ease;
        }
        .nf-btn-left {
          left: 0;
          background: linear-gradient(to right, var(--bg) 45%, transparent);
        }
        .nf-btn-right {
          right: 0;
          background: linear-gradient(to left, var(--bg) 45%, transparent);
        }
        .nf-btn:hover { width: 52px; }
        .nf-btn svg { width: 22px; height: 22px; color: var(--text-sec); transition: transform 0.2s, color 0.2s; flex-shrink: 0; }
        .nf-btn:hover svg { transform: scale(1.35); color: var(--accent); }

        .nf-fade-l, .nf-fade-r {
          position: absolute; top: 0; bottom: 0; width: 60px;
          pointer-events: none; z-index: 10; transition: opacity 0.3s;
        }
        .nf-fade-l { left: 0;  background: linear-gradient(to right, var(--bg), transparent); }
        .nf-fade-r { right: 0; background: linear-gradient(to left, var(--bg), transparent); }

        /* ═══════════════════════════════════════
           RESPONSIVE
        ═══════════════════════════════════════ */
        @media (max-width: 860px) {
          .prof-page { padding-left: 20px; padding-right: 20px; }
          .prof-container { flex-direction: column; }
          .prof-sidebar { width: 100%; position: static; }
        }
        @media (max-width: 640px) {
          .prof-page { padding-left: 14px; padding-right: 14px; padding-top: 88px; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div className="prof-page">
        {/* Ambient orbs */}
        <div className="prof-orb prof-orb-1" />
        <div className="prof-orb prof-orb-2" />
        <div className="prof-orb prof-orb-3" />

        {/* Edit Modal */}
        {editing && (
          <div className="prof-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditing(false); }}>
            <div className="prof-modal">
              <h3 className="prof-modal-title">Edit Profile</h3>
              <p className="prof-modal-sub">Update your public information</p>
              <div className="prof-form-fields">
                <label className="prof-form-label">
                  <span className="prof-label-text">Full Name</span>
                  <input className="prof-input" placeholder="Your name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </label>
                <label className="prof-form-label">
                  <span className="prof-label-text">City</span>
                  <input className="prof-input" placeholder="Where you shoot" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} />
                </label>
                <label className="prof-form-label">
                  <span className="prof-label-text">Bio</span>
                  <textarea className="prof-input" style={{ resize: 'vertical', minHeight: 84, lineHeight: 1.6 }} placeholder="Tell your story…" value={editForm.bio} rows={3} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} />
                </label>
              </div>
              <div className="prof-modal-actions">
                <button className="prof-modal-cancel" onClick={() => setEditing(false)}>Cancel</button>
                <button className="prof-modal-save" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        )}

        <div className="prof-container">
          {/* ── SIDEBAR ── */}
          <aside className="prof-sidebar">
            <div className="prof-sidebar-accent-line" />

            {/* Avatar */}
            <div className="prof-avatar-wrap">
              <div className="prof-avatar-pulse" />
              {avatarSrc
                ? <img src={avatarSrc} alt="profile" className="prof-avatar" />
                : <div className="prof-avatar-fallback">{initials}</div>
              }
              <button className="prof-camera-btn" onClick={() => avatarInputRef.current?.click()}>📷</button>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
            {avatarSrc && <button className="prof-remove-btn" onClick={removeAvatar}>Remove Photo</button>}

            <h2 className="prof-name">{displayName}</h2>
            <p className="prof-email">{user?.email}</p>
            {user?.city && <p className="prof-city">📍 {user.city}</p>}
            {user?.bio && <p className="prof-bio">{user.bio}</p>}

            <div className="prof-stats-grid">
              <StatCell value={totalUploads} label="Uploads" />
              <StatCell value={bestCount}    label="Best"    gold />
              <StatCell value={avgCount}     label="Avg"     />
              <StatCell value={rejCount}     label="Reject"  />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="prof-edit-btn" onClick={startEdit}>✦ Edit Profile</button>
              <button className="prof-logout-btn" onClick={handleLogout}>Sign Out</button>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="prof-main">
            <div className="prof-hero">
              <div className="prof-eyebrow">
                <span className="prof-eyebrow-dot" />
                Visual Diary
              </div>
              <h1 className="prof-page-title">
                My <em>Collection</em>
              </h1>
              <p className="prof-page-sub">Your captured moments — analyzed, scored, and organized beautifully.</p>
            </div>

            {/* TABS */}
            <div className="prof-tabs">
              {['collections', 'analysis', 'interested'].map(tab => (
                <button
                  key={tab}
                  className={`prof-tab-btn${activeTab === tab ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'collections' ? 'Collections' : tab === 'analysis' ? 'AI Analysis' : 'Interested'}
                </button>
              ))}
            </div>

            {/* COLLECTIONS TAB */}
            {activeTab === 'collections' && (
              <div>
                <div className="prof-pills">
                  {[
                    { key: 'ALL',      label: 'All Photos', count: totalUploads },
                    { key: 'BEST',     label: '✦ Best',     count: bestCount    },
                    { key: 'AVERAGE',  label: '◈ Average',  count: avgCount     },
                    { key: 'REJECTED', label: '✕ Rejected', count: rejCount     },
                  ].map(p => (
                    <button
                      key={p.key}
                      className={`prof-pill${filter === p.key ? ' active' : ''}`}
                      onClick={() => setFilter(p.key)}
                    >
                      <span>
                        {p.label}
                        <span className="prof-pill-count">{p.count}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {filteredPhotos.length === 0
                  ? <EmptyState onNavigate={() => navigate('/gallery')} label="Upload Photos →" />
                  : <NetflixCarousel items={filteredPhotos} />
                }
              </div>
            )}

            {/* AI ANALYSIS TAB */}
            {activeTab === 'analysis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allPhotos.length === 0
                  ? <EmptyState onNavigate={() => navigate('/gallery')} label="Upload Photos →" />
                  : allPhotos.map((photo, i) => <AnalysisCard key={photo._id} photo={photo} index={i} />)
                }
              </div>
            )}

            {/* INTERESTED TAB */}
            {activeTab === 'interested' && (
              <div>
                {favorites.length === 0 ? (
                  <EmptyState
                    icon="💛"
                    title="No favorites yet"
                    sub="Locations you ❤️ on the results page will appear here with all insights."
                    onNavigate={() => navigate('/finder')}
                    label="Start Exploring →"
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                    {favorites.map((fav, i) => (
                      <div
                        key={fav._id}
                        className="prof-fav-card"
                        style={{ animationDelay: `${i * 0.07}s` }}
                        onClick={() => navigate('/location-detail', { state: { location: fav } })}
                      >
                        <div style={{ flexShrink: 0 }}>
                          {fav.imageUrl
                            ? <img src={fav.imageUrl} alt={fav.locationName} style={{ width: 82, height: 82, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-bright)' }} onError={e => { e.target.style.display = 'none'; }} />
                            : <div style={{ width: 82, height: 82, borderRadius: 10, background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📍</div>
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', fontWeight: 400, color: 'var(--text)', margin: 0 }}>{fav.locationName}</h3>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                              {fav.photographyType && (
                                <span style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 20, padding: '4px 10px', fontSize: 10, color: 'var(--accent)', fontWeight: 500, textTransform: 'uppercase' }}>📷 {fav.photographyType}</span>
                              )}
                              <span style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-bright)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Score {fav.score}/100</span>
                            </div>
                          </div>
                          {fav.highlights?.length > 0 ? (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>✨ Key highlights</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {fav.highlights.map((h, idx) => (
                                  <span key={idx} style={{ fontSize: 11, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 4, padding: '3px 10px', color: 'var(--text-sec)' }}>✓ {h}</span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>Added from earlier version – check results again for full insights.</p>
                          )}
                          <div style={{ marginTop: 10, height: 2, background: 'var(--bar-track)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${fav.score}%`, background: 'var(--accent)', borderRadius: 2, transformOrigin: 'left', animation: 'bar-grow 1s cubic-bezier(0.4,0,0.2,1) both' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════ */

function StatCell({ value, label, gold }) {
  return (
    <div className="prof-stat-cell">
      <span className={`prof-stat-num${gold ? ' prof-stat-num--gold' : ''}`}>{value}</span>
      <span className="prof-stat-label">{label}</span>
    </div>
  );
}

function EmptyState({ icon = '📷', title = 'No photos yet', sub = 'Start uploading to build your visual diary.', onNavigate, label }) {
  return (
    <div className="prof-empty">
      <div className="prof-empty-icon">{icon}</div>
      <p className="prof-empty-title">{title}</p>
      <p className="prof-empty-sub">{sub}</p>
      {onNavigate && <button className="prof-empty-btn" onClick={onNavigate}>{label}</button>}
    </div>
  );
}

function catColor(cat) {
  if (cat === 'BEST')    return '#c8a96e';
  if (cat === 'AVERAGE') return '#5bbf6a';
  return '#c0614a';
}

/* ══════════════════════════════════════════════════════
   NETFLIX CAROUSEL
══════════════════════════════════════════════════════ */
function NetflixCarousel({ items }) {
  const VISIBLE  = 4;
  const CARD_W   = 210;
  const CARD_GAP = 12;
  const STEP_PX  = (CARD_W + CARD_GAP) * VISIBLE;

  const totalPages = Math.ceil(items.length / VISIBLE);
  const maxPage    = Math.max(0, totalPages - 1);

  const [page, setPage]         = useState(0);
  const [isAnim, setIsAnim]     = useState(false);
  const [rowHovered, setRowHov] = useState(false);

  const goTo = (next) => {
    if (isAnim || next === page) return;
    setIsAnim(true);
    setPage(next);
    setTimeout(() => setIsAnim(false), 640);
  };

  const go = (dir) => goTo(dir === 'right' ? Math.min(page + 1, maxPage) : Math.max(page - 1, 0));

  const touchX = useRef(null);
  const onTouchStart = e => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = e => {
    if (touchX.current === null) return;
    const dx = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) go(dx > 0 ? 'right' : 'left');
    touchX.current = null;
  };

  useEffect(() => {
    const h = e => {
      if (!rowHovered) return;
      if (e.key === 'ArrowRight') go('right');
      if (e.key === 'ArrowLeft')  go('left');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [rowHovered, page, isAnim]);

  const canLeft  = page > 0;
  const canRight = page < maxPage;
  const offset   = page * STEP_PX;

  return (
    <div className="nf-root" onMouseEnter={() => setRowHov(true)} onMouseLeave={() => setRowHov(false)}>
      {totalPages > 1 && (
        <div className="nf-dots">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={`nf-dot${i === page ? ' active' : ''}`}
              style={{ width: i === page ? 26 : 14 }}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}

      <div className="nf-clip" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="nf-fade-l" style={{ opacity: canLeft  ? 1 : 0 }} />
        <div className="nf-fade-r" style={{ opacity: canRight ? 1 : 0 }} />

        {canLeft && (
          <button className="nf-btn nf-btn-left" onClick={() => go('left')} aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <div className="nf-track" style={{ transform: `translateX(-${offset}px)` }}>
          {items.map((item, idx) => <NetflixCard key={item._id || idx} photo={item} />)}
          <div style={{ flexShrink: 0, width: 1 }} />
        </div>

        {canRight && (
          <button className="nf-btn nf-btn-right" onClick={() => go('right')} aria-label="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function NetflixCard({ photo }) {
  const [imgErr, setImgErr] = useState(false);
  const src       = `${API_BASE}${photo.imageUrl}`;
  const quality   = (photo.scores?.qualityScore  ?? 0) * 100;
  const aesthetic = (photo.scores?.aestheticScore ?? 0) * 100;
  const avg       = Math.round((quality + aesthetic) / 2);
  const color     = catColor(photo.category);

  return (
    <div className="nf-card">
      <div className="nf-card-inner">
        <div className="nf-img-wrap">
          {!imgErr
            ? <img src={src} alt={photo.photographyType || 'Photo'} onError={() => setImgErr(true)} draggable={false} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, background: 'var(--bg-panel)', color: 'var(--text-muted)' }}>📷</div>
          }
          <span className="nf-badge" style={{ background: color }}>{photo.category}</span>
          <div className="nf-score-chip">
            <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: '1.05rem', lineHeight: 1, color }}>{avg}</span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>/100</span>
          </div>
          <div className="nf-hover-overlay">
            <div style={{ display: 'flex', gap: 8 }}>
              <MiniBar label="Q" value={quality} />
              <MiniBar label="A" value={aesthetic} />
            </div>
          </div>
        </div>
        <div className="nf-info-panel">
          <div className="nf-photo-type">{photo.photographyType || 'Photo'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <MiniBar label="Quality"   value={quality}   />
            <MiniBar label="Aesthetic" value={aesthetic} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisCard({ photo, index }) {
  const quality   = (photo.scores?.qualityScore  ?? 0) * 100;
  const aesthetic = (photo.scores?.aestheticScore ?? 0) * 100;
  return (
    <div className="prof-ac-card" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="prof-ac-thumb">
        <img src={`${API_BASE}${photo.imageUrl}`} alt="" className="prof-ac-img" onError={e => e.target.style.display = 'none'} />

      </div>
      <div className="prof-ac-body">
        <div className="prof-ac-top">
          <span className="prof-ac-cat" style={{ background: catColor(photo.category) }}>{photo.category}</span>
          <span className="prof-ac-type">{photo.photographyType}</span>
        </div>
        <div className="prof-ac-bars">
          <MiniBar label="Quality"   value={quality}   />
          <MiniBar label="Aesthetic" value={aesthetic} />
        </div>
        {photo.feedback?.reasons?.length > 0 && (
          <div className="prof-ac-reasons">
            {photo.feedback.reasons.slice(0, 2).map((r, i) => (
              <span key={i} className="prof-ac-reason">✓ {r}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniBar({ label, value }) {
  const v = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div className="prof-mini-bar">
      <div className="prof-mini-bar-top">
        <span className="prof-mini-bar-label">{label}</span>
        <span className="prof-mini-bar-val">{Math.round(v)}</span>
      </div>
      <div className="prof-mini-bar-track">
        <div className="prof-mini-bar-fill" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="prof-loading">
      <div style={{ textAlign: 'center' }}>
        <div className="prof-spinner" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span className="prof-loading-text">Loading</span>
      </div>
    </div>
  );
}