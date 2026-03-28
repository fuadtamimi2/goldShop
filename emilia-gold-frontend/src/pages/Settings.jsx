import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageHeader from "../ui/PageHeader";
import Panel from "../ui/Panel";
import { emitToast } from "../ui/toast";
import { useAuth } from "../store/auth.store.jsx";
import { useCurrency } from "../store/currency.store";
import { useSettings } from "../store/settings.store";
import { getStoreSettings, updateStoreSettings } from "../services/stores.service";

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {children}
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

const defaultSettings = {
  currency: "ILS",
  defaultKarat: "24K",
  defaultMarkupPerGram: 0,
  lowStockLimit: 2,
  minimumProfitPerGram: 0,
  businessName: "",
  receiptFooter: "",
  notes: "",
};

export default function Settings() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { setCurrency } = useCurrency();
  const { refresh: refreshSettings } = useSettings();
  const { t } = useTranslation();

  const [settings, setSettings] = useState(defaultSettings);
  const [initial, setInitial] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.storeId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const loaded = await getStoreSettings(user.storeId);
        const merged = { ...defaultSettings, ...loaded };
        setSettings(merged);
        setInitial(merged);
      } catch (err) {
        emitToast({ type: "error", title: "Failed to load settings", message: err.message });
        setSettings(defaultSettings);
        setInitial(defaultSettings);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.storeId]);

  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(initial);
  }, [settings, initial]);

  const handleSave = async () => {
    if (!user?.storeId) {
      emitToast({ type: "error", title: t("common.error"), message: t("settings.toasts.storeIdMissing") });
      return;
    }

    if (!Number.isFinite(settings.lowStockLimit) || settings.lowStockLimit < 0) {
      emitToast({ type: "error", title: "Invalid", message: t("settings.toasts.invalidLowStock") });
      return;
    }

    try {
      setSaving(true);
      await updateStoreSettings(user.storeId, settings);
      setInitial(settings);
      setCurrency(settings.currency);
      await refreshSettings();
      emitToast({ type: "success", title: t("settings.toasts.savedTitle"), message: t("settings.toasts.savedMsg") });
    } catch (err) {
      emitToast({ type: "error", title: t("settings.toasts.failTitle"), message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSettings(initial);
    emitToast({ type: "warning", title: t("settings.toasts.cancelledTitle"), message: t("settings.toasts.cancelledMsg") });
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      {loading ? (
        <Panel>
          <div className="text-center text-sm text-slate-400">{t("settings.loading")}</div>
        </Panel>
      ) : (
        <>
          <Panel title={t("settings.storeDefaults")} meta={t("settings.usedAcrossApp")}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t("settings.fields.currency")} hint={t("settings.fields.currencyHint")}>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
                >
                  <option value="USD">USD</option>
                  <option value="ILS">ILS</option>
                  <option value="JOD">JOD</option>
                </select>
              </Field>

              <Field label={t("settings.fields.businessName")} hint={t("settings.fields.businessNameHint")}>
                <input
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  disabled={saving}
                  placeholder={t("settings.fields.businessNamePlaceholder")}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
                />
              </Field>

              <Field label={t("settings.fields.defaultKarat")} hint={t("settings.fields.defaultKaratHint")}>
                <select
                  value={settings.defaultKarat}
                  onChange={(e) => setSettings({ ...settings, defaultKarat: e.target.value })}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
                >
                  <option value="24K">24K</option>
                  <option value="22K">22K</option>
                  <option value="21K">21K</option>
                  <option value="18K">18K</option>
                </select>
              </Field>

              <Field label={t("settings.fields.defaultMarkup")} hint={t("settings.fields.defaultMarkupHint")}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.defaultMarkupPerGram}
                  onChange={(e) => setSettings({ ...settings, defaultMarkupPerGram: Number(e.target.value) })}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
                />
              </Field>

              <Field label={t("settings.fields.lowStockLimit")} hint={t("settings.fields.lowStockLimitHint")}>
                <input
                  type="number"
                  min="0"
                  value={settings.lowStockLimit}
                  onChange={(e) => setSettings({ ...settings, lowStockLimit: Number(e.target.value) })}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
                />
              </Field>

              <Field label={t("settings.fields.minProfit")} hint={t("settings.fields.minProfitHint")}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.minimumProfitPerGram}
                  onChange={(e) => setSettings({ ...settings, minimumProfitPerGram: Number(e.target.value) })}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label={t("settings.fields.receiptFooter")} hint={t("settings.fields.receiptFooterHint")}>
                <textarea
                  value={settings.receiptFooter}
                  onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                  disabled={saving}
                  rows={2}
                  placeholder={t("settings.fields.receiptFooterPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50 resize-none"
                />
              </Field>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${isDirty && !saving
                  ? "bg-amber-700 hover:bg-amber-800"
                  : "bg-slate-300 cursor-not-allowed"
                  }`}
              >
                {saving ? t("settings.saving") : t("settings.saveBtn")}
              </button>

              <button
                onClick={handleCancel}
                disabled={!isDirty || saving}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold ${isDirty && !saving
                  ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                  }`}
              >
                {t("settings.cancelBtn")}
              </button>
            </div>
          </Panel>

          <Panel title={t("settings.dangerZone")} meta={t("settings.beCareful")}>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                {t("settings.logoutBtn")}
              </button>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
