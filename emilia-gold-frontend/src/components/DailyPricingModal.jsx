import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getLatestPricing, saveDailyPricing } from "../services/dailyPricing.service";
import { emitToast } from "../ui/toast";
import { useDailyPricing } from "../store/dailyPricing.store";
import { useSettings } from "../store/settings.store";

function Field({ label, hint, required, error, children }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
                {label}
                {required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
            {children}
            {hint && !error && <div className="text-xs text-slate-400">{hint}</div>}
            {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
    );
}

const emptyForm = {
    globalGoldPricePerOunce: "",
    buyOffsetPerOunce: "",
    sellOffsetPerOunce: "",
    usdIlsExchangeRate: "",
};

export default function DailyPricingModal() {
    const { t } = useTranslation();
    const { showModal, setShowModal, setTodayPricing, todayPricing } = useDailyPricing();
    const { settings } = useSettings();

    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loadingYesterday, setLoadingYesterday] = useState(false);
    const [confirmOverwrite, setConfirmOverwrite] = useState(false);

    // Prefill form from settings defaults when modal opens.
    useEffect(() => {
        if (showModal) {
            setForm({
                globalGoldPricePerOunce: "",
                buyOffsetPerOunce: String(settings?.defaultBuyOffsetPerOunce ?? 0),
                sellOffsetPerOunce: String(settings?.defaultSellOffsetPerOunce ?? 0),
                usdIlsExchangeRate: String(settings?.defaultUsdIlsExchangeRate ?? ""),
            });
            setErrors({});
            setConfirmOverwrite(false);
        }
    }, [showModal, settings]);

    function setField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    async function useYesterdayValues() {
        try {
            setLoadingYesterday(true);
            const { item } = await getLatestPricing();
            if (!item) {
                emitToast({ type: "warning", title: t("dailyPricing.noYesterday"), message: "" });
                return;
            }
            setForm({
                globalGoldPricePerOunce: String(item.globalGoldPricePerOunce ?? ""),
                buyOffsetPerOunce: String(item.buyOffsetPerOunce ?? ""),
                sellOffsetPerOunce: String(item.sellOffsetPerOunce ?? ""),
                usdIlsExchangeRate: String(item.usdIlsExchangeRate ?? ""),
            });
            setErrors({});
        } catch (err) {
            emitToast({ type: "error", title: t("common.error"), message: err.message });
        } finally {
            setLoadingYesterday(false);
        }
    }

    function validate() {
        const errs = {};
        const gold = Number(form.globalGoldPricePerOunce);
        const rate = Number(form.usdIlsExchangeRate);

        if (!Number.isFinite(gold) || gold <= 0) {
            errs.globalGoldPricePerOunce = t("dailyPricing.errors.goldPriceRequired");
        }
        if (!Number.isFinite(rate) || rate <= 0) {
            errs.usdIlsExchangeRate = t("dailyPricing.errors.exchangeRateRequired");
        }
        return errs;
    }

    async function handleSave() {
        const errs = validate();
        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }

        if (todayPricing?._id && !confirmOverwrite) {
            emitToast({
                type: "warning",
                title: t("dailyPricing.confirmOverwriteTitle"),
                message: t("dailyPricing.confirmOverwriteMsg"),
            });
            return;
        }

        try {
            setSaving(true);
            const { item } = await saveDailyPricing({
                globalGoldPricePerOunce: Number(form.globalGoldPricePerOunce),
                buyOffsetPerOunce: Number(form.buyOffsetPerOunce || 0),
                sellOffsetPerOunce: Number(form.sellOffsetPerOunce || 0),
                usdIlsExchangeRate: Number(form.usdIlsExchangeRate),
            });
            setTodayPricing(item);
            setShowModal(false);
            emitToast({ type: "success", title: t("dailyPricing.savedTitle"), message: t("dailyPricing.savedMsg") });
        } catch (err) {
            emitToast({ type: "error", title: t("common.error"), message: err.message });
        } finally {
            setSaving(false);
        }
    }

    if (!showModal) return null;

    const inputCls =
        "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none " +
        "focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50";

    return (
        /* Full-screen overlay — intentionally not dismissible because pricing is required */
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-black/50" />

            <div className="relative w-full max-w-md rounded-2xl border border-amber-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="rounded-t-2xl bg-amber-700 px-6 py-5 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-lg font-bold">{t("dailyPricing.title")}</div>
                            <div className="mt-0.5 text-sm text-amber-100">{t("dailyPricing.subtitle")}</div>
                        </div>
                        <div className="mt-1 rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold">
                            {t("dailyPricing.required")}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="space-y-4 p-6">
                    <p className="text-sm text-slate-500">{t("dailyPricing.description")}</p>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        {t("dailyPricing.prefillFromDefaults")}
                    </div>

                    {todayPricing?._id && (
                        <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <input
                                type="checkbox"
                                checked={confirmOverwrite}
                                onChange={(e) => setConfirmOverwrite(e.target.checked)}
                                disabled={saving}
                                className="mt-0.5"
                            />
                            <span>{t("dailyPricing.confirmOverwriteCheckbox")}</span>
                        </label>
                    )}

                    <Field
                        label={t("dailyPricing.fields.globalGoldPrice")}
                        hint={t("dailyPricing.fields.globalGoldPriceHint")}
                        required
                        error={errors.globalGoldPricePerOunce}
                    >
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.globalGoldPricePerOunce}
                                onChange={(e) => setField("globalGoldPricePerOunce", e.target.value)}
                                disabled={saving}
                                placeholder="e.g. 3200"
                                className={inputCls + (errors.globalGoldPricePerOunce ? " border-red-400" : "")}
                            />
                            <span className="shrink-0 text-xs text-slate-400">USD / oz</span>
                        </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field
                            label={t("dailyPricing.fields.buyOffset")}
                            hint={t("dailyPricing.fields.buyOffsetHint")}
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={form.buyOffsetPerOunce}
                                    onChange={(e) => setField("buyOffsetPerOunce", e.target.value)}
                                    disabled={saving}
                                    placeholder="0"
                                    className={inputCls}
                                />
                                <span className="shrink-0 text-xs text-slate-400">USD</span>
                            </div>
                        </Field>

                        <Field
                            label={t("dailyPricing.fields.sellOffset")}
                            hint={t("dailyPricing.fields.sellOffsetHint")}
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={form.sellOffsetPerOunce}
                                    onChange={(e) => setField("sellOffsetPerOunce", e.target.value)}
                                    disabled={saving}
                                    placeholder="0"
                                    className={inputCls}
                                />
                                <span className="shrink-0 text-xs text-slate-400">USD</span>
                            </div>
                        </Field>
                    </div>

                    <Field
                        label={t("dailyPricing.fields.exchangeRate")}
                        hint={t("dailyPricing.fields.exchangeRateHint")}
                        required
                        error={errors.usdIlsExchangeRate}
                    >
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={form.usdIlsExchangeRate}
                                onChange={(e) => setField("usdIlsExchangeRate", e.target.value)}
                                disabled={saving}
                                placeholder="e.g. 3.69"
                                className={inputCls + (errors.usdIlsExchangeRate ? " border-red-400" : "")}
                            />
                            <span className="shrink-0 text-xs text-slate-400">USD → ILS</span>
                        </div>
                    </Field>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                    <button
                        type="button"
                        onClick={useYesterdayValues}
                        disabled={saving || loadingYesterday}
                        className="text-sm text-amber-700 hover:underline disabled:opacity-40"
                    >
                        {loadingYesterday ? t("common.loading") : t("dailyPricing.useYesterday")}
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || (todayPricing?._id && !confirmOverwrite)}
                        className="rounded-lg bg-amber-700 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                    >
                        {saving
                            ? t("dailyPricing.saving")
                            : todayPricing?._id
                                ? t("dailyPricing.updateTodayBtn")
                                : t("dailyPricing.saveBtn")}
                    </button>
                </div>
            </div>
        </div>
    );
}
