// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { getUser, getToken, logout as apiLogout } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(getUser);
  const [token, setToken] = useState(getToken);

  const onLoginSuccess = useCallback((userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn: !!token, onLoginSuccess, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
