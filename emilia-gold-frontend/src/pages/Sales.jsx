import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageHeader from "../ui/PageHeader";
import Panel from "../ui/Panel";
import Table from "../ui/Table";
import StatusPill from "../ui/StatusPill";
import { emitToast } from "../ui/toast";
import { useCurrency } from "../store/currency.store";
import { listProducts } from "../services/products.service";
import { createSale, listSales } from "../services/sales.service";
import { apiGet } from "../services/apiClient";

import QuickCreateCustomerModal from "../components/sales/QuickCreateCustomerModal";
import SaleItemsTable from "../components/sales/SaleItemsTable";
import SaleTotalsCard from "../components/sales/SaleTotalsCard";
import ReceiptPreviewModal from "../components/sales/ReceiptPreviewModal";

function todayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function newLineItem() {
  return {
    _rowId: crypto.randomUUID(),
    productId: "",
    productName: "",
    quantitySold: 1,
    soldWeight: "",
    sellBasePricePerGramSnapshot: 0,
    productExtraPerGram: 0,
    expectedProductPricePerGram: 0,
    actualSoldPricePerGram: "",
    // Legacy compat mirrors
    minimumPricePerGram: 0,
    productExtraProfitPerGram: 0,
    expectedMinimumSellingPricePerGram: 0,
    actualSalePricePerGram: "",
    lineProfit: 0,
    lineTotal: 0,
    isBelowExpected: false,
  };
}

function emptyDraft() {
  return {
    date: todayISODate(),
    customerId: "",
    paymentMethod: "Cash",
    paymentStatus: "Paid",
    notes: "",
    items: [newLineItem()],
  };
}

// ─── inner components ─────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 pb-1 border-b border-slate-100">
      {children}
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

// ─── main component ───────────────────────────────────────────────────────────

export default function Sales() {
  const { currency, formatMoney, convertCurrency } = useCurrency();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── list state
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // ── lookup data
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  // ── add-sale modal
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState(() => emptyDraft());
  const [draftErrors, setDraftErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ── quick create customer modal
  const [qcOpen, setQcOpen] = useState(false);

  // ── receipt modal
  const [receipt, setReceipt] = useState(null);
  const [receiptSaleId, setReceiptSaleId] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // ── expand row to see line items
  const [expandedId, setExpandedId] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────────────────────────────────

  const loadSales = useCallback(async () => {
    try {
      const items = await listSales();
      const mapped = items.map((s) => ({
        _id: s._id,
        id: s.ref || s._id,
        date: s.date ? s.date.slice(0, 10) : "",
        customer: s.customerId?.name || "—",
        itemCount: (s.items || []).length,
        amount: s.finalTotal,
        method: s.paymentMethod,
        status: s.paymentStatus,
        items: s.items || [],
      }));
      setTransactions(mapped);
    } catch (err) {
      setTransactions([]);
      emitToast({ type: "error", title: "Sales unavailable", message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLookups = useCallback(async () => {
    try {
      setLookupsLoading(true);
      const [productItems, customerData] = await Promise.all([
        listProducts(),
        apiGet("/api/customers"),
      ]);
      setProducts(productItems || []);
      setCustomers(customerData.items || []);
    } catch (err) {
      emitToast({ type: "error", title: "Lookup load failed", message: err.message });
    } finally {
      setLookupsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
    loadLookups();
  }, [loadSales, loadLookups]);

  // Open modal when ?new=1 is in URL
  useEffect(() => {
    if (searchParams.get("new") === "1" && !addOpen) {
      setDraft(emptyDraft());
      setDraftErrors({});
      setAddOpen(true);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // Modal handlers
  // ─────────────────────────────────────────────────────────────────────────

  function openAdd() {
    setDraft(emptyDraft());
    setDraftErrors({});
    setAddOpen(true);
  }

  function closeAdd() {
    setAddOpen(false);
    if (searchParams.get("new") === "1") {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("new");
      setSearchParams(nextSearchParams, { replace: true });
    }
  }

  function setDraftField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setDraftErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────

  function validate() {
    const errs = {};

    if (!draft.customerId) {
      errs.customerId = "Please select or create a customer.";
    }

    if (!draft.items.length) {
      errs.items = "Add at least one item.";
      return errs;
    }

    const aggregateByProduct = new Map();

    for (const item of draft.items) {
      if (!item.productId) {
        errs.items = "All items must have an inventory group selected.";
        return errs;
      }

      const quantitySold = Number(item.quantitySold) || 0;
      const soldWeight = Number(item.soldWeight) || 0;
      const actualPrice = Number(item.actualSoldPricePerGram ?? item.actualSalePricePerGram);

      if (!Number.isInteger(quantitySold) || quantitySold < 1) {
        errs.items = "Each line must have quantity sold of at least 1.";
        return errs;
      }

      if (!Number.isFinite(soldWeight) || soldWeight <= 0) {
        errs.items = "Each line must have exact sold weight greater than 0.";
        return errs;
      }

      if (!Number.isFinite(actualPrice) || actualPrice < 0) {
        errs.items = "Each line must have a valid actual sold price per gram.";
        return errs;
      }

      const current = aggregateByProduct.get(item.productId) || { quantitySold: 0, soldWeight: 0 };
      current.quantitySold += quantitySold;
      current.soldWeight += soldWeight;
      aggregateByProduct.set(item.productId, current);
    }

    for (const [productId, aggregate] of aggregateByProduct.entries()) {
      const product = products.find((p) => p._id === productId);
      if (!product) {
        errs.items = "One or more selected inventory groups no longer exist.";
        return errs;
      }

      if (aggregate.quantitySold > Number(product.quantity || 0)) {
        errs.items = `Insufficient quantity for "${product.name}". Available ${product.quantity}.`;
        return errs;
      }

      if (aggregate.soldWeight > Number(product.totalWeight || 0)) {
        errs.items = `Insufficient total weight for "${product.name}". Available ${Number(product.totalWeight || 0).toFixed(2)} g.`;
        return errs;
      }
    }

    return errs;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────────────────

  async function onCreateSale() {
    const errs = validate();
    if (Object.keys(errs).length) {
      setDraftErrors(errs);
      return;
    }

    const payload = {
      customerId: draft.customerId,
      date: draft.date || todayISODate(),
      items: draft.items.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        quantitySold: Number(r.quantitySold),
        soldWeight: Number(r.soldWeight),
        // Send new canonical fields; backend will also accept legacy names
        actualSoldPricePerGram: Number(r.actualSoldPricePerGram ?? r.actualSalePricePerGram),
        productExtraPerGram: Number(r.productExtraPerGram ?? r.productExtraProfitPerGram ?? 0),
      })),
      paymentMethod: draft.paymentMethod,
      paymentStatus: draft.paymentStatus,
      notes: draft.notes,
    };

    try {
      setSaving(true);
      const { item: sale, receipt: rec } = await createSale(payload);

      setTransactions((prev) => [
        {
          _id: sale._id,
          id: sale.ref || sale._id,
          date: sale.date ? sale.date.slice(0, 10) : draft.date,
          customer: sale.customerId?.name || "—",
          itemCount: (sale.items || []).length,
          amount: sale.finalTotal,
          method: sale.paymentMethod,
          status: sale.paymentStatus,
          items: sale.items || [],
        },
        ...prev,
      ]);

      setProducts((prev) =>
        prev.map((p) => {
          const deduction = draft.items.find((item) => item.productId === p._id);
          if (!deduction) return p;
          return {
            ...p,
            quantity: Math.max(0, p.quantity - Number(deduction.quantitySold)),
            totalWeight: Math.max(0, p.totalWeight - Number(deduction.soldWeight)),
          };
        })
      );

      setReceipt(rec);
      setReceiptSaleId(sale._id);
      closeAdd();
      await Promise.all([loadSales(), loadLookups()]);
      setReceiptOpen(true);
      emitToast({ type: "success", title: "Sale created", message: sale.ref || sale._id });
    } catch (err) {
      emitToast({ type: "error", title: "Failed to save sale", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────────────────────

  const rows = useMemo(
    () =>
      transactions.filter((r) => {
        const matchText =
          r.id.toLowerCase().includes(q.toLowerCase()) ||
          r.customer.toLowerCase().includes(q.toLowerCase());
        const matchStatus = statusFilter === "All" || r.status === statusFilter;
        return matchText && matchStatus;
      }),
    [transactions, q, statusFilter]
  );

  const selectedCustomer = customers.find((c) => c._id === draft.customerId) || null;

  const canSubmit = useMemo(() => {
    if (!draft.customerId || !draft.items.length) return false;
    return draft.items.every(
      (r) =>
        r.productId &&
        Number(r.quantitySold) >= 1 &&
        Number(r.soldWeight) > 0 &&
        Number.isFinite(Number(r.actualSoldPricePerGram ?? r.actualSalePricePerGram))
    );
  }, [draft]);

  const inputCls =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none " +
    "focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50 disabled:text-slate-400";

  // ─────────────────────────────────────────────────────────────────────────
  // Columns
  // ─────────────────────────────────────────────────────────────────────────

  const columns = [
    { key: "id", header: t("sales.table.invoice") },
    { key: "date", header: t("sales.table.date") },
    { key: "customer", header: t("sales.table.customer") },
    {
      key: "itemCount",
      header: t("sales.table.items"),
      render: (r) => (
        <button
          onClick={() => setExpandedId((prev) => (prev === r._id ? null : r._id))}
          className="text-amber-700 underline text-xs font-medium hover:text-amber-900"
        >
          {r.itemCount} item{r.itemCount !== 1 ? "s" : ""}
        </button>
      ),
    },
    { key: "amount", header: t("sales.table.amount"), render: (r) => formatMoney(r.amount, "USD") },
    { key: "method", header: t("sales.table.method") },
    { key: "status", header: t("sales.table.status"), render: (r) => <StatusPill value={r.status} /> },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("sales.title")}
        subtitle={t("sales.subtitle")}
        right={
          <>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              {t("sales.export")}
            </button>
            <button
              onClick={openAdd}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              {t("sales.newSale")}
            </button>
          </>
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 min-w-[260px] items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("sales.search")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="All">{t("sales.status.all")}</option>
              <option value="Paid">{t("sales.status.paid")}</option>
              <option value="Pending">{t("sales.status.pending")}</option>
              <option value="Refunded">{t("sales.status.refunded")}</option>
            </select>
          </div>
          <div className="text-sm text-slate-500">{t("sales.results", { count: rows.length })}</div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">{t("sales.loading")}</div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
              {t("sales.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {rows.map((row) => (
                <div key={row._id}>
                  <Table columns={columns} rows={[row]} rowKey={(r) => r._id} />
                  {expandedId === row._id && (
                    <div className="mb-2 rounded-b-xl border border-t-0 border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t("sales.table.lineItems")}
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400">
                            <th className="pb-1 text-left font-normal">{t("sales.table.product")}</th>
                            <th className="pb-1 text-center font-normal">{t("sales.table.qty")}</th>
                            <th className="pb-1 text-center font-normal">{t("sales.table.weight")}</th>
                            <th className="pb-1 text-center font-normal">{t("sales.table.pricePerG")}</th>
                            <th className="pb-1 text-right font-normal">{t("sales.table.lineTotal")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.items.map((item, i) => (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="py-1">{item.productName || "—"}</td>
                              <td className="py-1 text-center">{item.quantitySold}</td>
                              <td className="py-1 text-center">{Number(item.soldWeight || 0).toFixed(2)}g</td>
                              <td className="py-1 text-center">
                                {formatMoney(item.actualSalePricePerGram ?? item.finalPricePerGram ?? 0, "USD")}
                              </td>
                              <td className="py-1 text-right font-semibold">{formatMoney(item.lineTotal || 0, "USD")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {addOpen && (
        <>
          <div className="fixed inset-0 z-[999] bg-black/40" onClick={closeAdd} />
          <div className="fixed inset-0 z-[1000] overflow-y-auto p-4" onClick={closeAdd}>
            <div
              className="relative mx-auto my-8 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <div className="text-lg font-bold text-slate-900">{t("sales.modal.title")}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{t("sales.modal.subtitle")}</div>
                </div>
                <button
                  onClick={closeAdd}
                  className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6 p-6">
                <div className="space-y-3">
                  <SectionLabel>{t("sales.modal.customer")}</SectionLabel>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Field label={t("sales.modal.customer")} required>
                        <select
                          value={draft.customerId}
                          onChange={(e) => setDraftField("customerId", e.target.value)}
                          disabled={saving || lookupsLoading}
                          className={inputCls + (draftErrors.customerId ? " border-red-400" : "")}
                        >
                          <option value="">
                            {lookupsLoading ? t("common.loading") : t("sales.modal.chooseCustomer")}
                          </option>
                          {customers.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                              {c.phone ? ` · ${c.phone}` : ""}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {draftErrors.customerId && (
                        <p className="mt-1 text-xs text-red-600">{draftErrors.customerId}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setQcOpen(true)}
                      disabled={saving}
                      className="shrink-0 rounded-lg border border-dashed border-amber-400 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      {t("sales.modal.quickCreate")}
                    </button>
                  </div>
                  {selectedCustomer && (
                    <div className="flex flex-wrap gap-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <span>👤 {selectedCustomer.name}</span>
                      {selectedCustomer.phone && <span>📞 {selectedCustomer.phone}</span>}
                      {selectedCustomer.email && <span>✉ {selectedCustomer.email}</span>}
                    </div>
                  )}
                </div>

                <div>
                  <Field label={t("sales.modal.saleDate")} required>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(e) => setDraftField("date", e.target.value)}
                      disabled={saving}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="space-y-3">
                  <SectionLabel>{t("sales.modal.items")}</SectionLabel>
                  {draftErrors.items && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {draftErrors.items}
                    </div>
                  )}
                  <SaleItemsTable
                    items={draft.items}
                    products={products}
                    onChange={(updated) => {
                      setDraft((prev) => ({ ...prev, items: updated }));
                      setDraftErrors((prev) => ({ ...prev, items: undefined }));
                    }}
                    currency={{ currency, formatMoney, convertCurrency }}
                    disabled={saving || lookupsLoading}
                  />
                </div>

                <div className="space-y-2">
                  <SectionLabel>{t("sales.modal.totals")}</SectionLabel>
                  <SaleTotalsCard items={draft.items} currency={{ formatMoney }} />
                </div>

                <div className="space-y-3">
                  <SectionLabel>{t("sales.modal.payment")}</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t("sales.modal.paymentMethod")}>
                      <select
                        value={draft.paymentMethod}
                        onChange={(e) => setDraftField("paymentMethod", e.target.value)}
                        disabled={saving}
                        className={inputCls}
                      >
                        <option>Cash</option>
                        <option>Card</option>
                        <option>Transfer</option>
                        <option>Other</option>
                      </select>
                    </Field>
                    <Field label={t("sales.modal.paymentStatus")}>
                      <select
                        value={draft.paymentStatus}
                        onChange={(e) => setDraftField("paymentStatus", e.target.value)}
                        disabled={saving}
                        className={inputCls}
                      >
                        <option>Paid</option>
                        <option>Pending</option>
                        <option>Refunded</option>
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="space-y-2">
                  <SectionLabel>{t("sales.modal.notes")}</SectionLabel>
                  <textarea
                    value={draft.notes}
                    onChange={(e) => setDraftField("notes", e.target.value)}
                    rows={2}
                    placeholder={t("sales.modal.notesPlaceholder")}
                    disabled={saving}
                    className={inputCls + " resize-none"}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={closeAdd}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={onCreateSale}
                  disabled={saving || !canSubmit}
                  className="rounded-xl bg-amber-700 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  {saving ? t("sales.modal.submitting") : t("sales.modal.saveSale")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <QuickCreateCustomerModal
        open={qcOpen}
        onClose={() => setQcOpen(false)}
        onCreated={(newCustomer) => {
          setCustomers((prev) => [newCustomer, ...prev]);
          setDraftField("customerId", newCustomer._id);
          setQcOpen(false);
          emitToast({ type: "success", title: "Customer added", message: newCustomer.name });
        }}
      />

      <ReceiptPreviewModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        receipt={receipt}
        saleId={receiptSaleId}
      />
    </div>
  );
}
