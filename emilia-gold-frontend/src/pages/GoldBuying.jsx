import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import PageHeader from "../ui/PageHeader";
import Panel from "../ui/Panel";
import Table from "../ui/Table";
import { emitToast } from "../ui/toast";
import { useCurrency } from "../store/currency.store";
import { apiGet } from "../services/apiClient";
import {
    createGoldPurchase,
    listGoldPurchases,
} from "../services/goldPurchases.service";
import { useDailyPricing } from "../store/dailyPricing.store";
import ReceiptPreviewModal from "../components/sales/ReceiptPreviewModal";

function todayISODate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const emptyDraft = {
    customerId: "",
    date: todayISODate(),
    karat: "",
    weight: "",
    boughtPricePerGram: "",
    paymentMethod: "Cash",
    notes: "",
};

export default function GoldBuying() {
    const { currency, formatMoney, convertCurrency } = useCurrency();
    const { t } = useTranslation();
    const { buyBasePricePerGram, globalGoldPricePerOunce, buyOffsetPerOunce, usdIlsExchangeRate } = useDailyPricing();

    const [q, setQ] = useState("");
    const [items, setItems] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lookupsLoading, setLookupsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [draft, setDraft] = useState({ ...emptyDraft });
    const [errors, setErrors] = useState({});
    const [receipt, setReceipt] = useState(null);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [receiptPurchaseId, setReceiptPurchaseId] = useState(null);

    const loadItems = useCallback(async () => {
        try {
            setLoading(true);
            const rows = await listGoldPurchases();
            setItems(rows);
        } catch (err) {
            setItems([]);
            emitToast({ type: "error", title: "Failed", message: err.message });
        } finally {
            setLoading(false);
        }
    }, []);

    const loadCustomers = useCallback(async () => {
        try {
            setLookupsLoading(true);
            const data = await apiGet("/api/customers");
            setCustomers(data.items || []);
        } catch (err) {
            emitToast({ type: "error", title: "Customers unavailable", message: err.message });
        } finally {
            setLookupsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadItems();
        loadCustomers();
    }, [loadItems, loadCustomers]);

    const rows = useMemo(() => {
        const query = q.toLowerCase();
        return items.filter((item) => {
            const ref = String(item.ref || "").toLowerCase();
            const customer = String(item.customerId?.name || "").toLowerCase();
            const karat = String(item.karat || "").toLowerCase();
            return ref.includes(query) || customer.includes(query) || karat.includes(query);
        });
    }, [items, q]);

    const metrics = useMemo(() => {
        const weight = toNumber(draft.weight, 0);
        const boughtPerGramUsd = toNumber(draft.boughtPricePerGram, 0);
        const buyBase = buyBasePricePerGram(draft.karat);
        const estimatedResaleValue = weight * buyBase;
        const totalPurchaseAmount = weight * boughtPerGramUsd;
        const expectedRevenue = estimatedResaleValue - totalPurchaseAmount;
        return { buyBase, boughtPerGramUsd, estimatedResaleValue, totalPurchaseAmount, expectedRevenue };
    }, [draft, buyBasePricePerGram]);

    function setField(field, value) {
        setDraft((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function openAdd() {
        setDraft({ ...emptyDraft });
        setErrors({});
        setAddOpen(true);
    }

    function validate() {
        const validationErrors = {};
        if (!draft.customerId) validationErrors.customerId = "Seller/Customer is required.";
        if (toNumber(draft.weight, 0) <= 0) validationErrors.weight = "Weight must be greater than 0.";
        if (toNumber(draft.boughtPricePerGram, -1) < 0) {
            validationErrors.boughtPricePerGram = "Bought price must be 0 or more.";
        }
        return validationErrors;
    }

    async function onCreate() {
        const nextErrors = validate();
        if (Object.keys(nextErrors).length) {
            setErrors(nextErrors);
            return;
        }

        try {
            setSaving(true);
            const { item: newPurchase, receipt: rec } = await createGoldPurchase({
                customerId: draft.customerId,
                date: draft.date,
                karat: draft.karat,
                weight: Number(draft.weight),
                // Backend stores canonical USD values.
                boughtPricePerGram: Number(draft.boughtPricePerGram || 0),
                paymentMethod: draft.paymentMethod,
                notes: draft.notes,
            });

            setItems((prev) => [newPurchase, ...prev]);
            await loadItems();
            setAddOpen(false);
            setDraft({ ...emptyDraft });
            setErrors({});
            if (rec) {
                setReceipt(rec);
                setReceiptPurchaseId(newPurchase._id);
                setReceiptOpen(true);
            }
            emitToast({ type: "success", title: "Saved", message: "Gold purchase recorded." });
        } catch (err) {
            emitToast({ type: "error", title: "Failed", message: err.message });
        } finally {
            setSaving(false);
        }
    }

    const columns = [
        { key: "ref", header: t("goldBuying.table.ref") },
        {
            key: "date",
            header: t("goldBuying.table.date"),
            render: (r) => (r.date ? String(r.date).slice(0, 10) : "—"),
        },
        {
            key: "customer",
            header: t("goldBuying.table.seller"),
            render: (r) => r.customerId?.name || "—",
        },
        { key: "karat", header: t("goldBuying.table.karat"), render: (r) => r.karat || "—" },
        {
            key: "weight",
            header: t("goldBuying.table.weight"),
            render: (r) => `${Number(r.weight || 0).toFixed(2)} g`,
        },
        {
            key: "buyBase",
            header: t("goldBuying.table.buyBasePerG"),
            render: (r) => formatMoney(r.buyBasePricePerGramSnapshot || r.marketPricePerGram || 0, "USD"),
        },
        {
            key: "purchase",
            header: t("goldBuying.table.boughtPerG"),
            render: (r) => formatMoney(r.boughtPricePerGram || 0, "USD"),
        },
        {
            key: "total",
            header: t("goldBuying.table.purchaseTotal"),
            render: (r) => formatMoney(r.totalPurchaseAmount || 0, "USD"),
        },
        {
            key: "margin",
            header: t("goldBuying.table.expectedRevenue"),
            render: (r) => {
                const revenue = Number(r.expectedRevenue || r.expectedMargin || 0);
                const cls = revenue >= 0 ? "text-emerald-700" : "text-rose-700";
                return <span className={cls}>{formatMoney(revenue, "USD")}</span>;
            },
        },
        { key: "paymentMethod", header: t("goldBuying.table.payment") },
    ];

    const inputCls =
        "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200";

    const boughtPricePerGramDisplay = convertCurrency(
        toNumber(draft.boughtPricePerGram, 0),
        "USD",
        currency
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("goldBuying.title")}
                subtitle={t("goldBuying.subtitle")}
                right={
                    <button
                        onClick={openAdd}
                        className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                    >
                        {t("goldBuying.newPurchase")}
                    </button>
                }
            />

            <Panel>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={t("goldBuying.searchPlaceholder")}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                    />
                    <div className="text-sm text-slate-500">{rows.length} records</div>
                </div>

                <div className="mt-4">
                    {loading ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                            {t("goldBuying.loading")}
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                            {t("goldBuying.empty")}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table columns={columns} rows={rows} rowKey={(r) => r._id} />
                        </div>
                    )}
                </div>
            </Panel>

            {/* Add Gold Purchase Modal */}
            {addOpen && (
                <>
                    <div className="fixed inset-0 z-[999] bg-black/40" onClick={() => setAddOpen(false)} />
                    <div className="fixed inset-0 z-[1000] overflow-y-auto p-4" onClick={() => setAddOpen(false)}>
                        <div
                            className="relative mx-auto my-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                                <div>
                                    <div className="text-lg font-bold text-slate-900">{t("goldBuying.modal.title")}</div>
                                    <div className="text-xs text-slate-400">{t("goldBuying.modal.subtitle")}</div>
                                </div>
                                <button
                                    onClick={() => setAddOpen(false)}
                                    className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4 p-6">
                                {/* Daily pricing info */}
                                {globalGoldPricePerOunce > 0 && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 space-y-1">
                                        <div className="font-semibold text-amber-800 mb-1">{t("goldBuying.modal.dailySnapshot")}</div>
                                        <div className="flex justify-between">
                                            <span>{t("goldBuying.modal.globalGoldPrice")}</span>
                                            <span className="font-medium">${Number(globalGoldPricePerOunce).toFixed(2)} / oz</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{t("goldBuying.modal.buyOffset")}</span>
                                            <span className="font-medium">${Number(buyOffsetPerOunce).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{t("goldBuying.modal.exchangeRate")}</span>
                                            <span className="font-medium">1 USD = {Number(usdIlsExchangeRate).toFixed(4)} ILS</span>
                                        </div>
                                        {draft.karat && (
                                            <div className="flex justify-between border-t border-amber-200 pt-1">
                                                <span>{t("goldBuying.modal.buyBasePerG")} ({draft.karat})</span>
                                                <span className="font-semibold text-amber-800">{formatMoney(metrics.buyBase, "USD")}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <Field label={t("goldBuying.modal.seller")} required>
                                    <select
                                        value={draft.customerId}
                                        onChange={(e) => setField("customerId", e.target.value)}
                                        disabled={saving || lookupsLoading}
                                        className={inputCls + (errors.customerId ? " border-red-400" : "")}
                                    >
                                        <option value="">{lookupsLoading ? t("common.loading") : t("common.selectPlaceholder")}</option>
                                        {customers.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.name}{c.phone ? ` · ${c.phone}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.customerId && <p className="mt-1 text-xs text-red-600">{errors.customerId}</p>}
                                </Field>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label={t("goldBuying.modal.date")}>
                                        <input
                                            type="date"
                                            value={draft.date}
                                            onChange={(e) => setField("date", e.target.value)}
                                            disabled={saving}
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label={t("goldBuying.modal.karat")}>
                                        <select
                                            value={draft.karat}
                                            onChange={(e) => setField("karat", e.target.value)}
                                            disabled={saving}
                                            className={inputCls}
                                        >
                                            <option value="">{t("common.selectPlaceholder")}</option>
                                            <option value="24K">24K</option>
                                            <option value="22K">22K</option>
                                            <option value="21K">21K</option>
                                            <option value="18K">18K</option>
                                        </select>
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label={t("goldBuying.modal.weight")} required>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={draft.weight}
                                            onChange={(e) => setField("weight", e.target.value)}
                                            disabled={saving}
                                            className={inputCls + (errors.weight ? " border-red-400" : "")}
                                        />
                                        {errors.weight && <p className="mt-1 text-xs text-red-600">{errors.weight}</p>}
                                    </Field>
                                    <Field label={t("goldBuying.modal.boughtPrice")} required>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={Number.isFinite(boughtPricePerGramDisplay) ? boughtPricePerGramDisplay : ""}
                                            onChange={(e) => {
                                                const enteredDisplay = toNumber(e.target.value, 0);
                                                const enteredUsd = convertCurrency(enteredDisplay, currency, "USD");
                                                setField("boughtPricePerGram", enteredUsd);
                                            }}
                                            disabled={saving}
                                            className={inputCls + (errors.boughtPricePerGram ? " border-red-400" : "")}
                                        />
                                        {errors.boughtPricePerGram && (
                                            <p className="mt-1 text-xs text-red-600">{errors.boughtPricePerGram}</p>
                                        )}
                                    </Field>
                                </div>

                                {/* Live metrics */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("goldBuying.modal.metrics")}</div>
                                    <div className="flex items-center justify-between text-xs text-slate-600">
                                        <span>{t("goldBuying.modal.buyBasePerG")}</span>
                                        <span className="font-semibold text-slate-800">{formatMoney(metrics.buyBase, "USD")}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-600">
                                        <span>{t("goldBuying.modal.resaleValue")}</span>
                                        <span className="font-semibold text-slate-800">{formatMoney(metrics.estimatedResaleValue, "USD")}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-600">
                                        <span>{t("goldBuying.modal.totalPurchase")}</span>
                                        <span className="font-semibold text-slate-800">{formatMoney(metrics.totalPurchaseAmount, "USD")}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-1.5">
                                        <span className="text-slate-600">{t("goldBuying.modal.expectedRevenue")}</span>
                                        <span className={"font-semibold " + (metrics.expectedRevenue >= 0 ? "text-emerald-700" : "text-rose-700")}>
                                            {formatMoney(metrics.expectedRevenue, "USD")}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label={t("goldBuying.modal.payment")}>
                                        <select
                                            value={draft.paymentMethod}
                                            onChange={(e) => setField("paymentMethod", e.target.value)}
                                            disabled={saving}
                                            className={inputCls}
                                        >
                                            <option>Cash</option>
                                            <option>Card</option>
                                            <option>Transfer</option>
                                            <option>Other</option>
                                        </select>
                                    </Field>
                                    <Field label={t("goldBuying.modal.notes")}>
                                        <input
                                            value={draft.notes}
                                            onChange={(e) => setField("notes", e.target.value)}
                                            disabled={saving}
                                            className={inputCls}
                                        />
                                    </Field>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={() => setAddOpen(false)}
                                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                    <button
                                        onClick={onCreate}
                                        disabled={saving}
                                        className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
                                    >
                                        {saving ? t("goldBuying.modal.saving") : t("goldBuying.modal.save")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Gold Purchase Receipt */}
            <ReceiptPreviewModal
                open={receiptOpen}
                onClose={() => setReceiptOpen(false)}
                receipt={receipt}
                purchaseId={receiptPurchaseId}
            />
        </div>
    );
}

function Field({ label, required, children }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
                {label}
                {required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
            {children}
        </div>
    );
}
