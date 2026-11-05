import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('onetap_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('onetap_admin_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('onetap_admin_user', JSON.stringify(res.data.user));
        } catch {
          setUser(null);
          localStorage.removeItem('onetap_admin_token');
          localStorage.removeItem('onetap_admin_user');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (phone, password) => {
    const res = await api.post('/auth/login-password', { phone, password });
    const { token, user: loggedUser } = res.data;

    // Check staff roles (PRD Section 04)
    const allowed = loggedUser.roles.some((r) =>
      ['admin', 'moderator', 'manager', 'finance', 'support'].includes(r)
    );

    if (!allowed) {
      throw new Error('Access denied: Staff or Administrator permissions required.');
    }

    localStorage.setItem('onetap_admin_token', token);
    localStorage.setItem('onetap_admin_user', JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = () => {
    localStorage.removeItem('onetap_admin_token');
    localStorage.removeItem('onetap_admin_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

