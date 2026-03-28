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
    externalReferenceBuyPricePerGram: "",
    purchasePricePerGram: "",
    paymentMethod: "Cash",
    notes: "",
};

export default function GoldBuying() {
    const { formatMoney } = useCurrency();
    const { t } = useTranslation();

    const [q, setQ] = useState("");
    const [items, setItems] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lookupsLoading, setLookupsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [draft, setDraft] = useState(emptyDraft);
    const [errors, setErrors] = useState({});

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
        const external = toNumber(draft.externalReferenceBuyPricePerGram, 0);
        const purchase = toNumber(draft.purchasePricePerGram, 0);
        const estimatedResaleValue = weight * external;
        const totalPurchaseAmount = weight * purchase;
        const expectedMargin = estimatedResaleValue - totalPurchaseAmount;
        return { estimatedResaleValue, totalPurchaseAmount, expectedMargin };
    }, [draft]);

    function setField(field, value) {
        setDraft((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function openAdd() {
        setDraft(emptyDraft);
        setErrors({});
        setAddOpen(true);
    }

    function validate() {
        const next = {};
        if (!draft.customerId) next.customerId = "Seller/Customer is required.";
        if (toNumber(draft.weight, 0) <= 0) next.weight = "Weight must be greater than 0.";
        if (toNumber(draft.externalReferenceBuyPricePerGram, -1) < 0) {
            next.externalReferenceBuyPricePerGram = "External reference price must be 0 or more.";
        }
        if (toNumber(draft.purchasePricePerGram, -1) < 0) {
            next.purchasePricePerGram = "Our purchase price must be 0 or more.";
        }
        return next;
    }

    async function onCreate() {
        const nextErrors = validate();
        if (Object.keys(nextErrors).length) {
            setErrors(nextErrors);
            return;
        }

        try {
            setSaving(true);
            const newPurchase = await createGoldPurchase({
                customerId: draft.customerId,
                date: draft.date,
                karat: draft.karat,
                weight: Number(draft.weight),
                externalReferenceBuyPricePerGram: Number(draft.externalReferenceBuyPricePerGram || 0),
                purchasePricePerGram: Number(draft.purchasePricePerGram || 0),
                paymentMethod: draft.paymentMethod,
                notes: draft.notes,
            });

            // Prepend new item to list for immediate UI update
            setItems((prev) => [newPurchase, ...prev]);
            setAddOpen(false);
            setDraft(emptyDraft);
            setErrors({});
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
            key: "external",
            header: t("goldBuying.table.refBuyPerG"),
            render: (r) => formatMoney(r.externalReferenceBuyPricePerGram || 0),
        },
        {
            key: "purchase",
            header: t("goldBuying.table.ourBuyPerG"),
            render: (r) => formatMoney(r.purchasePricePerGram || 0),
        },
        {
            key: "total",
            header: t("goldBuying.table.purchaseTotal"),
            render: (r) => formatMoney(r.totalPurchaseAmount || 0),
        },
        {
            key: "margin",
            header: t("goldBuying.table.expectedMargin"),
            render: (r) => {
                const margin = Number(r.expectedMargin || 0);
                const cls = margin >= 0 ? "text-emerald-700" : "text-rose-700";
                return <span className={cls}>{formatMoney(margin)}</span>;
            },
        },
        { key: "paymentMethod", header: t("goldBuying.table.payment") },
    ];

    const inputCls =
        "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200";

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

            {addOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setAddOpen(false)} />
                    <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
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

                        <div className="grid grid-cols-1 gap-4 p-6">
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
                                    <input
                                        value={draft.karat}
                                        onChange={(e) => setField("karat", e.target.value)}
                                        disabled={saving}
                                        placeholder={t("goldBuying.modal.karatPlaceholder")}
                                        className={inputCls}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                                <Field label={t("goldBuying.modal.externalRef")} required>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={draft.externalReferenceBuyPricePerGram}
                                        onChange={(e) => setField("externalReferenceBuyPricePerGram", e.target.value)}
                                        disabled={saving}
                                        className={inputCls + (errors.externalReferenceBuyPricePerGram ? " border-red-400" : "")}
                                    />
                                    {errors.externalReferenceBuyPricePerGram && (
                                        <p className="mt-1 text-xs text-red-600">{errors.externalReferenceBuyPricePerGram}</p>
                                    )}
                                </Field>
                                <Field label={t("goldBuying.modal.ourPrice")} required>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={draft.purchasePricePerGram}
                                        onChange={(e) => setField("purchasePricePerGram", e.target.value)}
                                        disabled={saving}
                                        className={inputCls + (errors.purchasePricePerGram ? " border-red-400" : "")}
                                    />
                                    {errors.purchasePricePerGram && (
                                        <p className="mt-1 text-xs text-red-600">{errors.purchasePricePerGram}</p>
                                    )}
                                </Field>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("goldBuying.modal.metrics")}</div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <span>{t("goldBuying.modal.resaleValue")}</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(metrics.estimatedResaleValue)}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-slate-600">
                                    <span>{t("goldBuying.modal.totalPurchase")}</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(metrics.totalPurchaseAmount)}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between">
                                    <span className="text-slate-600">{t("goldBuying.modal.expectedMargin")}</span>
                                    <span className={"font-semibold " + (metrics.expectedMargin >= 0 ? "text-emerald-700" : "text-rose-700")}>
                                        {formatMoney(metrics.expectedMargin)}
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

                            <div className="mt-2 flex justify-end gap-2">
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
            )}
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
