import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [member, setMember] = useState(null);
  const [status, setStatus] = useState('loading');

  // Restore the session from the httpOnly cookie before any routing decision.
  useEffect(() => {
    let active = true;
    api
      .session()
      .then((current) => {
        if (!active) return;
        setMember(current?.authenticated ? current.member : null);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setMember(null);
        setStatus('ready');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setMember(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const current = await api.login(email, password);
    setMember(current);
    setStatus('ready');
    return current;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setMember(null);
      setStatus('ready');
    }
  }, []);

  const updateMember = useCallback((next) => setMember(next), []);

  const value = useMemo(
    () => ({ member, status, login, logout, updateMember }),
    [member, status, login, logout, updateMember],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
