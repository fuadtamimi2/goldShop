import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Sidebar({ onNavigate }) {
  const { t } = useTranslation();

  const links = [
    { to: "/dashboard", label: t("nav.dashboard") },
    { to: "/inventory", label: t("nav.inventory") },
    { to: "/sales", label: t("nav.sales") },
    { to: "/gold-buying", label: t("nav.goldBuying") },
    { to: "/pricing", label: t("nav.pricing") },
    { to: "/customers", label: t("nav.customers") },
    { to: "/reports", label: t("nav.reports") },
    { to: "/settings", label: t("nav.settings") },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-[var(--line)] bg-[var(--panel)]/95 p-4 backdrop-blur">
      <div className="mb-6 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] p-4">
        <div className="text-xs font-semibold tracking-[0.2em] text-[var(--text-muted)]">
          {t("nav.emiliaGold")}
        </div>
        <div className="mt-1 text-lg font-bold text-[var(--text)]">{t("nav.retailConsole")}</div>
      </div>

      <nav className="grid gap-1.5">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "block rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200",
                isActive
                  ? "bg-[var(--brand-soft)] text-[var(--brand-strong)] shadow-[0_0_0_1px_var(--line-strong)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]",
              ].join(" ")
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
