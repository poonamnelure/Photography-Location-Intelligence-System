// frontend/src/App.jsx
// No splash – loads directly into login or home

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Your existing pages
import Home        from './pages/Home';
import Finder      from './pages/Finder';
import Results     from './pages/Results';
import GalleryPage from './pages/GalleryPage';


// Auth pages
import LoginPage   from './pages/LoginPage';
import SignupPage  from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';

// New location detail page (if you have it)
import LocationDetailPage from './pages/LocationDetailPage';

import Navbar from './components/Navbar';

// ── Protected route wrapper ───────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

// ── App shell (inside BrowserRouter + AuthProvider) ──────────────────────────
function AppShell() {
  return (
    <Routes>
      {/* Auth pages – NO navbar */}
      <Route path="/login"  element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected pages – with navbar */}
      <Route path="/*" element={
        <>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/finder" element={<Finder />} />
            <Route path="/results" element={<Results />} />
            <Route path="/gallery" element={<ProtectedRoute><GalleryPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/location-detail" element={<ProtectedRoute><LocationDetailPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}