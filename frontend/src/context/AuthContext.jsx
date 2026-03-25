import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../services/authService";
import { normalizeRole } from "../utils/roles";
import { connectRealtime, disconnectRealtime } from "../services/realtimeService";

const AuthContext = createContext(null);

const tokenKey = "bugsense_token";
const userKey = "bugsense_user";

function normalizeUserRole(user) {
  if (!user) return null;
  return { ...user, role: normalizeRole(user.role) };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(tokenKey));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(userKey);
    return saved ? normalizeUserRole(JSON.parse(saved)) : null;
  });

  const persistSession = (data) => {
    const nextUser = normalizeUserRole(data.user);
    setToken(data.token);
    setUser(nextUser);
    localStorage.setItem(tokenKey, data.token);
    localStorage.setItem(userKey, JSON.stringify(nextUser));
    connectRealtime(data.token);
  };

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    persistSession(data);
  };

  const register = async (payload) => {
    const data = await authApi.register(payload);
    persistSession(data);
  };

  const completeSession = (payload) => {
    persistSession(payload);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    disconnectRealtime();
  };

  useEffect(() => {
    if (!token) return undefined;

    connectRealtime(token);
    return undefined;
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      register,
      completeSession,
      logout
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
