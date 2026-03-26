import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.store";
import { emitToast } from "../ui/toast";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!email.includes("@")) return setErr("Enter a valid email.");
    if (password.length < 6) return setErr("Password must be at least 6 chars.");

    try {
      setBusy(true);
      await login({ email, password });
      emitToast({ type: "success", title: "Welcome", message: "Logged in successfully." });
      nav("/dashboard");
    } catch (ex) {
      setErr(ex?.message || "Login failed");
      emitToast({ type: "error", title: "Login failed", message: ex?.message || "Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Login</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to manage Emilia Gold.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
            />
          </div>

          {err ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {err}
            </div>
          ) : null}

          <button
            disabled={busy}
            className={`w-full rounded-xl px-4 py-2 font-semibold text-white ${
              busy ? "bg-slate-400" : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {busy ? "Signing in..." : "Login"}
          </button>

          <div className="text-xs text-slate-500">
            Demo tip: use any email + password length 6+
          </div>
        </form>
      </div>
    </div>
  );
}
