import { createContext, useContext, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5060";
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("eg_user");
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { /* ignore corrupt data */ }
    }
  }, []);

  const api = useMemo(() => ({
    user,
    isAuthed: !!user,
    login: async ({ email, password }) => {
      if (!email || !password) throw new Error("Missing credentials");

      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let body;
      try { body = await res.json(); } catch { body = {}; }

      if (!res.ok) throw new Error(body.message || "Login failed");

      const { token, user: u } = body;
      localStorage.setItem("eg_token", token);
      localStorage.setItem("eg_user", JSON.stringify(u));
      setUser(u);
      return u;
    },
    logout: () => {
      localStorage.removeItem("eg_token");
      localStorage.removeItem("eg_user");
      setUser(null);
    },
  }), [user]);

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

