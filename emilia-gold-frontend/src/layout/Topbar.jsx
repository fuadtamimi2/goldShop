import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../store/currency.store";
import { useAuth } from "../store/auth.store";
import { useLanguage } from "../store/language.store";

export default function Topbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currency, setCurrency } = useCurrency();
  const { logout } = useAuth();
  const { lang, setLang } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleNewSale = () => {
    navigate("/sales?new=1");
  };

  const handleNewCustomer = () => {
    navigate("/customers?new=1");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--panel)]/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        className="mr-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--text)] lg:hidden"
        onClick={onMenuClick}
      >
        ☰
      </button>

      <div>
        <div className="text-xs tracking-[0.16em] text-[var(--text-muted)]">{t("topbar.today")}</div>
        <span className="text-sm text-[var(--text-muted)]">
          {t("topbar.welcomeBack")} <strong className="text-[var(--text)]">Fuad</strong>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--text)] outline-none"
          title={t("topbar.displayCurrency")}
        >
          <option value="USD">USD</option>
          <option value="ILS">ILS</option>
          <option value="JOD">JOD</option>
        </select>

        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
          title={t("language.toggle")}
        >
          {t("language.toggle")}
        </button>

        <button
          onClick={handleNewSale}
          className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
        >
          {t("topbar.newSale")}
        </button>

        <button
          onClick={handleNewCustomer}
          className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
        >
          {t("topbar.newCustomer")}
        </button>

        <button
          onClick={handleLogout}
          className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
        >
          {t("topbar.logout")}
        </button>
      </div>
    </header>
  );
}
