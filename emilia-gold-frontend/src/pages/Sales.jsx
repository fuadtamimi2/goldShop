import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
    baseGoldPricePerGram: "",
    markupPerGram: "",
    extraProfitPerGram: "",
    minimumPricePerGram: 0,
    finalPricePerGram: 0,
    baseValue: 0,
    markupValue: 0,
    profitValue: 0,
    lineTotal: 0,
    isBelowMinimum: false,
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
  const { formatMoney } = useCurrency();
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
  const [draft, setDraft] = useState(emptyDraft());
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
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
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
      const base = Number(item.baseGoldPricePerGram) || -1;
      const markup = Number(item.markupPerGram) || -1;
      const extra = Number(item.extraProfitPerGram) || NaN;

      if (!Number.isInteger(quantitySold) || quantitySold < 1) {
        errs.items = "Each line must have quantity sold of at least 1.";
        return errs;
      }

      if (!Number.isFinite(soldWeight) || soldWeight <= 0) {
        errs.items = "Each line must have exact sold weight greater than 0.";
        return errs;
      }

      if (!Number.isFinite(base) || base < 0) {
        errs.items = "Each line must have a valid base gold price per gram.";
        return errs;
      }

      if (!Number.isFinite(markup) || markup < 0) {
        errs.items = "Each line must have a valid markup per gram.";
        return errs;
      }

      if (!Number.isFinite(extra)) {
        errs.items = "Each line must have a valid extra profit adjustment.";
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

      // Check against grouped inventory fields (quantity and totalWeight)
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

    // FIXED: Send correct field names to backend
    const payload = {
      customerId: draft.customerId,
      date: draft.date || todayISODate(),
      items: draft.items.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        quantitySold: Number(r.quantitySold),
        soldWeight: Number(r.soldWeight),
        baseGoldPricePerGram: Number(r.baseGoldPricePerGram),
        markupPerGram: Number(r.markupPerGram),
        extraProfitPerGram: Number(r.extraProfitPerGram),
      })),
      paymentMethod: draft.paymentMethod,
      paymentStatus: draft.paymentStatus,
      notes: draft.notes,
    };

    try {
      setSaving(true);
      const { item: sale, receipt: rec } = await createSale(payload);

      // Update sales list
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

      // Update inventory to reflect deductions
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
        Number(r.baseGoldPricePerGram) >= 0 &&
        Number(r.markupPerGram) >= 0 &&
        Number.isFinite(Number(r.extraProfitPerGram))
    );
  }, [draft]);

  const inputCls =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none " +
    "focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50 disabled:text-slate-400";

  // ─────────────────────────────────────────────────────────────────────────
  // Columns
  // ─────────────────────────────────────────────────────────────────────────

  const columns = [
    { key: "id", header: "Invoice #" },
    { key: "date", header: "Date" },
    { key: "customer", header: "Customer" },
    {
      key: "itemCount",
      header: "Items",
      render: (r) => (
        <button
          onClick={() => setExpandedId((prev) => (prev === r._id ? null : r._id))}
          className="text-amber-700 underline text-xs font-medium hover:text-amber-900"
        >
          {r.itemCount} item{r.itemCount !== 1 ? "s" : ""}
        </button>
      ),
    },
    { key: "amount", header: "Total", render: (r) => formatMoney(r.amount) },
    { key: "method", header: "Payment" },
    { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        subtitle="Track transactions, payment statuses and receipts."
        right={
          <>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Export
            </button>
            <button
              onClick={openAdd}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              + New Sale
            </button>
          </>
        }
      />

      {/* Sales list */}
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by invoice # or customer…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option>All</option>
              <option>Paid</option>
              <option>Pending</option>
              <option>Refunded</option>
            </select>
          </div>
          <div className="text-sm text-slate-500">{rows.length} results</div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">Loading sales…</div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
              No sales found. Try changing filters or create a new sale.
            </div>
          ) : (
            <div className="overflow-x-auto">
              {rows.map((row) => (
                <div key={row._id}>
                  <Table columns={columns} rows={[row]} rowKey={(r) => r._id} />
                  {expandedId === row._id && (
                    <div className="mb-2 rounded-b-xl border border-t-0 border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Line Items
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400">
                            <th className="pb-1 text-left font-normal">Product</th>
                            <th className="pb-1 text-center font-normal">Qty</th>
                            <th className="pb-1 text-center font-normal">Weight</th>
                            <th className="pb-1 text-center font-normal">Price/g</th>
                            <th className="pb-1 text-right font-normal">Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.items.map((item, i) => (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="py-1">{item.productName || "—"}</td>
                              <td className="py-1 text-center">{item.quantitySold}</td>
                              <td className="py-1 text-center">{Number(item.soldWeight || 0).toFixed(2)}g</td>
                              <td className="py-1 text-center">₪{Number(item.finalPricePerGram || 0).toFixed(2)}</td>
                              <td className="py-1 text-right font-semibold">{formatMoney(item.lineTotal || 0)}</td>
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

      {/* Add Sale Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeAdd} />
          <div className="relative my-8 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <div className="text-lg font-bold text-slate-900">New Sale</div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Fill in customer, items and payment details
                </div>
              </div>
              <button
                onClick={closeAdd}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 p-6">

              {/* 1. Customer */}
              <div className="space-y-3">
                <SectionLabel>Customer</SectionLabel>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label="Select customer" required>
                      <select
                        value={draft.customerId}
                        onChange={(e) => setDraftField("customerId", e.target.value)}
                        disabled={saving || lookupsLoading}
                        className={inputCls + (draftErrors.customerId ? " border-red-400" : "")}
                      >
                        <option value="">
                          {lookupsLoading ? "Loading…" : "— Choose customer —"}
                        </option>
                        {customers.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}{c.phone ? ` · ${c.phone}` : ""}
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
                    + New Customer
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

              {/* 2. Date */}
              <div>
                <Field label="Sale date" required>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraftField("date", e.target.value)}
                    disabled={saving}
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* 3. Items */}
              <div className="space-y-3">
                <SectionLabel>Sale Items</SectionLabel>
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
                  currency={{ formatMoney }}
                  disabled={saving || lookupsLoading}
                />
              </div>

              {/* 4. Totals */}
              <div className="space-y-2">
                <SectionLabel>Totals</SectionLabel>
                <SaleTotalsCard items={draft.items} currency={{ formatMoney }} />
              </div>

              {/* 5. Payment */}
              <div className="space-y-3">
                <SectionLabel>Payment</SectionLabel>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Payment method">
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
                  <Field label="Status">
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

              {/* 6. Notes */}
              <div className="space-y-2">
                <SectionLabel>Notes</SectionLabel>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraftField("notes", e.target.value)}
                  rows={2}
                  placeholder="Optional sale notes…"
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
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreateSale}
                disabled={saving || !canSubmit}
                className="rounded-xl bg-amber-700 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Customer Modal */}
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

      {/* Receipt Modal */}
      <ReceiptPreviewModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        receipt={receipt}
        saleId={receiptSaleId}
      />
    </div>
  );
}
