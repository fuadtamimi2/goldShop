import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("eg_user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const api = useMemo(() => ({
    user,
    isAuthed: !!user,
    login: async ({ email, password }) => {
      // UI-only mock for now; replace with real API later
      if (!email || !password) throw new Error("Missing credentials");
      if (password.length < 6) throw new Error("Password too short");
      const fake = { id: "u1", name: "Fuad", email, role: "manager", token: "demo-token" };
      localStorage.setItem("eg_user", JSON.stringify(fake));
      setUser(fake);
      return fake;
    },
    logout: () => {
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
