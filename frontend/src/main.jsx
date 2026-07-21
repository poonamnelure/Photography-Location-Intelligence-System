// frontend/src/main.jsx
// ✅ On first load, redirect to /splash so the loader shows first

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'

// On every fresh load (not a navigation), go to /splash first
// This ensures the cinematic loader always shows before login/home
if (window.location.pathname === '/') {
  window.history.replaceState({}, '', '/splash');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
