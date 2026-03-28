import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../store/auth.store";
import { emitToast } from "../ui/toast";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!email.includes("@")) return setErr(t("login.errors.invalidEmail"));
    if (password.length < 6) return setErr(t("login.errors.shortPassword"));

    try {
      setBusy(true);
      await login({ email, password });
      emitToast({ type: "success", title: t("login.toasts.welcomeTitle"), message: t("login.toasts.welcomeMsg") });
      nav("/dashboard");
    } catch (ex) {
      setErr(ex?.message || t("login.errors.loginFailed"));
      emitToast({ type: "error", title: t("login.toasts.failTitle"), message: ex?.message || t("login.toasts.failMsg") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("login.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("login.subtitle")}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">{t("login.email")}</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.emailPlaceholder")}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">{t("login.password")}</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.passwordPlaceholder")}
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
            className={`w-full rounded-xl px-4 py-2 font-semibold text-white ${busy ? "bg-slate-400" : "bg-orange-600 hover:bg-orange-700"
              }`}
          >
            {busy ? t("login.signingIn") : t("login.loginBtn")}
          </button>

          <div className="text-xs text-slate-500">
            {t("login.demoTip")}
          </div>
        </form>
      </div>
    </div>
  );
}
