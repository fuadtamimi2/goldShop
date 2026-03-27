import { createContext, useContext, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.VITE_API_URL || "";
const AuthCtx = createContext(null);

function buildBaseCandidates(base) {
  const out = [base];

  if (!base) {
    return out;
  }

  if (base.includes("localhost")) {
    out.push(base.replace("localhost", "127.0.0.1"));
  }

  if (base.includes("127.0.0.1")) {
    out.push(base.replace("127.0.0.1", "localhost"));
  }

  return [...new Set(out)];
}

async function postJson(path, payload) {
  const bases = buildBaseCandidates(BASE);
  let lastNetworkErr = null;

  for (const base of bases) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      return res;
    } catch (err) {
      lastNetworkErr = err;
    } finally {
      clearTimeout(timeout);
    }
  }

  const reason = lastNetworkErr?.name === "AbortError"
    ? "Request timed out"
    : "Cannot reach backend server";

  throw new Error(`${reason}. Tried: ${bases.map((b) => b || "same-origin /api proxy").join(", ")}`);
}

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

      const res = await postJson("/api/auth/login", { email, password });

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

