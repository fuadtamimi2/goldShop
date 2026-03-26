import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../ui/PageHeader";
import Panel from "../ui/Panel";
import { emitToast } from "../ui/toast";
import { useAuth } from "../store/auth.store.jsx";
import { useCurrency } from "../store/currency.store";

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {children}
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

const LS_KEY = "eg_settings";

const defaultState = {
  profile: { name: "Fuad", phone: "059-000-0000", role: "Manager" },
  shop: { currency: "ILS", defaultKarat: "21K", lowStockLimit: 2 },
};

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const [profile, setProfile] = useState(defaultState.profile);
  const [shop, setShop] = useState(defaultState.shop);

  // Keep a snapshot for "Cancel"
  const [initial, setInitial] = useState({ profile: defaultState.profile, shop: defaultState.shop });

  useEffect(() => {
    // Load saved settings if exist
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        const next = { profile: defaultState.profile, shop: { ...defaultState.shop, currency } };
        setProfile(next.profile);
        setShop(next.shop);
        setInitial(next);
        return;
      }
      const parsed = JSON.parse(raw);
      const nextProfile = parsed?.profile ? { ...defaultState.profile, ...parsed.profile } : defaultState.profile;
      const nextShop = parsed?.shop ? { ...defaultState.shop, ...parsed.shop } : defaultState.shop;
      if (!nextShop.currency) nextShop.currency = currency;

      setProfile(nextProfile);
      setShop(nextShop);
      setInitial({ profile: nextProfile, shop: nextShop });
    } catch {
      // If corrupted, reset
      localStorage.removeItem(LS_KEY);
      const next = { profile: defaultState.profile, shop: { ...defaultState.shop, currency } };
      setProfile(next.profile);
      setShop(next.shop);
      setInitial(next);
    }
  }, []);

  const isDirty = useMemo(() => {
    return JSON.stringify({ profile, shop }) !== JSON.stringify(initial);
  }, [profile, shop, initial]);

  const handleSave = () => {
    // Basic validation
    if (!profile.name.trim()) {
      emitToast({ type: "error", title: "Missing", message: "Name is required." });
      return;
    }
    if (!profile.phone.trim()) {
      emitToast({ type: "error", title: "Missing", message: "Phone is required." });
      return;
    }
    if (!Number.isFinite(shop.lowStockLimit) || shop.lowStockLimit < 0) {
      emitToast({ type: "error", title: "Invalid", message: "Low stock limit must be 0 or more." });
      return;
    }

    const payload = { profile, shop };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    setInitial(payload);
    setCurrency(shop.currency);

    emitToast({ type: "success", title: "Saved", message: "Settings updated (UI)." });
  };

  const handleCancel = () => {
    setProfile(initial.profile);
    setShop(initial.shop);
    emitToast({ type: "warning", title: "Cancelled", message: "Reverted unsaved changes." });
  };

  const handleLogout = () => {
    logout(); // clears eg_user too
    navigate("/login", { replace: true });
  };

  const handleResetDemo = () => {
    localStorage.removeItem(LS_KEY);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure profile, shop defaults and security actions." />

      <Panel title="Profile" meta="UI only (mock)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Name">
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <Field label="Phone">
            <input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <Field label="Role" hint="Managed by backend later">
            <input
              value={profile.role}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              title="Role will be managed by backend"
            />
          </Field>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          These fields are local UI state for now. Later we’ll save them via API.
        </div>
      </Panel>

      <Panel title="Shop Defaults" meta="Used across pricing & inventory">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Currency" hint="Controls currency display across the app">
            <select
              value={shop.currency}
              onChange={(e) => setShop({ ...shop, currency: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="USD">USD</option>
              <option value="ILS">ILS</option>
              <option value="JOD">JOD</option>
            </select>
          </Field>

          <Field label="Default Karat" hint="Preselect karat in new sale flow">
            <select
              value={shop.defaultKarat}
              onChange={(e) => setShop({ ...shop, defaultKarat: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="24K">24K</option>
              <option value="22K">22K</option>
              <option value="21K">21K</option>
              <option value="18K">18K</option>
            </select>
          </Field>

          <Field label="Low Stock Limit" hint="Inventory marks low stock at or below this">
            <input
              type="number"
              min={0}
              value={shop.lowStockLimit}
              onChange={(e) => setShop({ ...shop, lowStockLimit: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${isDirty ? "bg-amber-700 hover:bg-amber-800" : "bg-slate-300 cursor-not-allowed"
              }`}
          >
            Save (UI)
          </button>

          <button
            onClick={handleCancel}
            disabled={!isDirty}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${isDirty
                ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
              }`}
          >
            Cancel
          </button>
        </div>
      </Panel>

      <Panel title="Danger Zone" meta="Be careful">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Logout
          </button>

          <button
            onClick={handleResetDemo}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Reset Demo (Logout + Clear Token)
          </button>
        </div>

        <div className="mt-3 text-sm text-slate-500">
          This only affects local demo state. Real reset will be handled by backend later.
        </div>
      </Panel>
    </div>
  );
}
