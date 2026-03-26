import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../ui/PageHeader";
import Panel from "../ui/Panel";
import Table from "../ui/Table";
import StatusPill from "../ui/StatusPill";
import { emitToast } from "../ui/toast";
import { useCurrency } from "../store/currency.store";
import { apiGet, apiPost } from "../services/apiClient";

function todayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Modal({ title, open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function nextTxId() { return ""; } // unused — backend generates refs

export default function Sales() {
  const { currency, formatMoney, convertCurrency } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const loadSales = async () => {
    try {
      const data = await apiGet("/api/sales");
      const mapped = (data.items || []).map((s) => ({
        id: s.ref || s._id,
        date: s.date ? s.date.slice(0, 10) : "",
        product: s.items?.[0]?.description || "—",
        amount: s.totalILS,
        method: s.paymentMethod,
        status: s.status,
      }));
      setTransactions(mapped);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emptyDraft = {
    date: todayISODate(),
    product: "",
    amount: "",
    method: "Cash",
    status: "Paid",
  };
  const [draft, setDraft] = useState(emptyDraft);

  const openAdd = () => {
    setDraft({ ...emptyDraft, date: todayISODate() });
    setAddOpen(true);
  };

  const closeAdd = () => {
    setAddOpen(false);

    if (searchParams.get("new") === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  };

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDraft({
        date: todayISODate(),
        product: "",
        amount: "",
        method: "Cash",
        status: "Paid",
      });
      setAddOpen(true);
    }
  }, [searchParams]);

  const onCreateSale = async () => {
    const product = draft.product.trim();
    const amount = Number(draft.amount);

    if (!product) {
      emitToast({ type: "error", title: "Error", message: "Product is required." });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      emitToast({ type: "error", title: "Error", message: "Amount must be greater than 0." });
      return;
    }

    // Always store the authoritative amount in ILS
    const totalILS = Math.round(convertCurrency(amount, currency, "ILS"));

    try {
      const data = await apiPost("/api/sales", {
        items: [{ description: product, qty: 1, unitPrice: totalILS }],
        totalILS,
        paymentMethod: draft.method,
        status: draft.status,
        date: draft.date || todayISODate(),
      });

      const s = data.item;
      setTransactions((prev) => [
        {
          id: s.ref || s._id,
          date: s.date ? s.date.slice(0, 10) : draft.date,
          product,
          amount: s.totalILS,
          method: s.paymentMethod,
          status: s.status,
        },
        ...prev,
      ]);
      closeAdd();
      emitToast({ type: "success", title: "Sale added", message: s.ref || s._id });
    } catch (err) {
      emitToast({ type: "error", title: "Failed to save", message: err.message });
    }
  };

  const rows = useMemo(() => {
    return transactions.filter((r) => {
      const matchText =
        r.id.toLowerCase().includes(q.toLowerCase()) ||
        r.product.toLowerCase().includes(q.toLowerCase());

      const matchStatus = status === "All" ? true : r.status === status;
      return matchText && matchStatus;
    });
  }, [transactions, q, status]);

  const columns = [
    { key: "id", header: "Transaction" },
    { key: "date", header: "Date" },
    { key: "product", header: "Product" },
    { key: "amount", header: "Amount", render: (r) => formatMoney(r.amount) },
    { key: "method", header: "Payment" },
    { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        subtitle="Track transactions, payment status and receipts."
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

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ID or product..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option>All</option>
              <option>Paid</option>
              <option>Pending</option>
              <option>Canceled</option>
            </select>
          </div>

          <div className="text-sm text-slate-500">{rows.length} results</div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">Loading sales...</div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
              No sales found. Try changing filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table columns={columns} rows={rows} rowKey={(r) => r.id} />
            </div>
          )}
        </div>
      </Panel>

      <Modal title="Add Sale" open={addOpen} onClose={closeAdd}>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Date">
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <Field label="Product">
            <input
              value={draft.product}
              onChange={(e) => setDraft({ ...draft, product: e.target.value })}
              placeholder="e.g. Bridal Ring Set 21K"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <Field label={`Amount (${currency})`}>
            <input
              type="number"
              min="1"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Payment Method">
              <select
                value={draft.method}
                onChange={(e) => setDraft({ ...draft, method: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              >
                <option>Cash</option>
                <option>Card</option>
                <option>Transfer</option>
              </select>
            </Field>

            <Field label="Status">
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              >
                <option>Paid</option>
                <option>Pending</option>
                <option>Canceled</option>
              </select>
            </Field>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={closeAdd}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={onCreateSale}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Add
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
