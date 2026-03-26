import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/inventory", label: "Inventory" },
  { to: "/sales", label: "Sales" },
  { to: "/pricing", label: "Pricing" },
  { to: "/customers", label: "Customers" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
];

export default function Sidebar({ onNavigate }) {
  return (
    <aside className="w-64 shrink-0 border-r border-[var(--line)] bg-[var(--panel)]/95 p-4 backdrop-blur">
      <div className="mb-6 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] p-4">
        <div className="text-xs font-semibold tracking-[0.2em] text-[var(--text-muted)]">
          EMILIA GOLD
        </div>
        <div className="mt-1 text-lg font-bold text-[var(--text)]">Retail Console</div>
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
