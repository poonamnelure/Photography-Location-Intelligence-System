// frontend/src/services/authService.js
// ✅ Uses VITE_API_URL env variable — works both locally AND in deployment

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getToken   = ()  => localStorage.getItem('accessToken');
export const setToken   = (t) => localStorage.setItem('accessToken', t);
export const getUser    = ()  => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } };
export const setUser    = (u) => localStorage.setItem('user', JSON.stringify(u));
export const clearAuth  = ()  => { localStorage.removeItem('accessToken'); localStorage.removeItem('user'); };
export const isLoggedIn = ()  => !!getToken();

// Add this after your existing imports
let isLoggingOut = false;
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401 && !isLoggingOut && !args[0].includes('/api/auth/logout')) {
    isLoggingOut = true;
    clearAuth();
    window.location.href = '/login';
  }
  return response;
};

const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });
const jsonHeader = () => ({ 'Content-Type': 'application/json', ...authHeader() });

async function api(path, opts = {}) {
  const res  = await fetch(`${BASE}${path}`, { credentials: 'include', ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const register = async ({ name, email, password }) => {
  const data = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  setToken(data.accessToken);
  setUser(data.user);
  return data;
};

export const login = async ({ email, password }) => {
  const data = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  setToken(data.accessToken);
  setUser(data.user);
  return data;
};

export const logout = async () => {
  try {
    await fetch(`${BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (_) { /* ignore */ }
  clearAuth();
};

export const getMyProfile  = ()        => api('/api/auth/me',      { headers: jsonHeader() }).then(d => d.user);
export const updateProfile = async (payload) => {
  const data = await api('/api/auth/profile', {
    method: 'PUT',
    headers: jsonHeader(),
    body: JSON.stringify(payload),
  });
  setUser(data.user);
  return data.user;
};

export const uploadPhotos = async (files, photographyType) => {
  const fd = new FormData();
  files.forEach(f => fd.append('photos', f));
  fd.append('photographyType', photographyType);
  return api('/api/photos/upload', {
    method: 'POST',
    headers: authHeader(),
    body: fd,
  });
};

export const getJobStatus  = (jobId) => api(`/api/jobs/${jobId}/status`,    { headers: jsonHeader() });
export const getJobResults = (jobId) => api(`/api/photos/results/${jobId}`, { headers: jsonHeader() });
export const getBestPhotos = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api(`/api/photos/best${q ? '?' + q : ''}`, { headers: jsonHeader() });

};
