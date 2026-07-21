// frontend/src/services/api.js
// Centralised fetch wrapper — add shared API utilities here as needed.
// All auth-related API calls live in authService.js

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Generic authenticated fetch helper.
 * Usage: apiRequest('/api/some-endpoint', { method: 'POST', body: JSON.stringify(data) })
 */
export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
