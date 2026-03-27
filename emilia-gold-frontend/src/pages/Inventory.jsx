import { useEffect, useMemo, useState } from "react";
import PageHeader from "../ui/PageHeader";
import Panel from "../ui/Panel";
import Table from "../ui/Table";
import StatusPill from "../ui/StatusPill";
import { emitToast } from "../ui/toast";
import { useCurrency } from "../store/currency.store";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "../services/products.service";

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

export default function Inventory() {
  const { formatMoney } = useCurrency();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const LOW_LIMIT = 2;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const emptyDraft = {
    name: "",
    sku: "",
    category: "",
    productType: "",
    karat: "",
    quantity: "",
    totalWeight: "",
    markupPerGram: "",
    baseCostPerGram: "",
    notes: "",
  };
  const [draft, setDraft] = useState(emptyDraft);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setErrorText("");
      const items = await listProducts();
      setProducts(items);
    } catch (err) {
      setErrorText(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((i) => i.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [products]);

  const rows = useMemo(() => {
    return products.filter((item) => {
      const matchText =
        (item.sku || "").toLowerCase().includes(q.toLowerCase()) ||
        (item.name || "").toLowerCase().includes(q.toLowerCase());

      const matchCategory = category === "All" ? true : item.category === category;

      return matchText && matchCategory;
    });
  }, [products, q, category]);

  function openAdd() {
    setDraft(emptyDraft);
    setAddOpen(true);
  }

  function openEdit(id) {
    const item = products.find((p) => p._id === id);
    if (item) {
      setDraft({
        name: item.name || "",
        sku: item.sku || "",
        category: item.category || "",
        productType: item.productType || "",
        karat: item.karat || "",
        quantity: item.quantity || "",
        totalWeight: item.totalWeight || "",
        markupPerGram: item.markupPerGram || "",
        baseCostPerGram: item.baseCostPerGram || "",
        notes: item.notes || "",
      });
      setSelectedId(id);
      setEditOpen(true);
    }
  }

  async function onSaveAdd() {
    setErrorText("");
    try {
      setSaving(true);
      await createProduct({
        name: draft.name,
        sku: draft.sku,
        category: draft.category,
        productType: draft.productType,
        karat: draft.karat,
        quantity: Number(draft.quantity) || 0,
        totalWeight: Number(draft.totalWeight) || 0,
        markupPerGram: Number(draft.markupPerGram) || 0,
        baseCostPerGram: Number(draft.baseCostPerGram) || 0,
        notes: draft.notes,
      });
      setAddOpen(false);
      await loadProducts();
      emitToast({ type: "success", title: "Item added", message: draft.name });
    } catch (err) {
      setErrorText(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit() {
    setErrorText("");
    if (!selectedId) return;
    try {
      setSaving(true);
      await updateProduct(selectedId, {
        name: draft.name,
        sku: draft.sku,
        category: draft.category,
        productType: draft.productType,
        karat: draft.karat,
        quantity: Number(draft.quantity) || 0,
        totalWeight: Number(draft.totalWeight) || 0,
        markupPerGram: Number(draft.markupPerGram) || 0,
        baseCostPerGram: Number(draft.baseCostPerGram) || 0,
        notes: draft.notes,
      });
      setEditOpen(false);
      setSelectedId(null);
      await loadProducts();
      emitToast({ type: "success", title: "Item updated", message: draft.name });
    } catch (err) {
      setErrorText(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item) {
    const ok = confirm(`Delete ${item.name}?`);
    if (!ok) return;

    try {
      setSaving(true);
      await deleteProduct(item._id);
      setProducts((prev) => prev.filter((p) => p._id !== item._id));
      emitToast({ type: "success", title: "Item deleted", message: item.name });
    } catch (err) {
      emitToast({ type: "error", title: "Delete failed", message: err.message });
    } finally {
      setSaving(false);
    }
  }


  const columns = [
    { key: "sku", header: "SKU", render: (r) => r.sku || "—" },
    { key: "name", header: "Product" },
    { key: "category", header: "Category", render: (r) => r.category || "—" },
    { key: "productType", header: "Type", render: (r) => r.productType || "—" },
    { key: "karat", header: "Karat", render: (r) => r.karat || "—" },
    { key: "quantity", header: "Qty", render: (r) => r.quantity || 0 },
    {
      key: "totalWeight",
      header: "Total Weight",
      render: (r) =>
        r.quantity && r.quantity > 0 ? `${Number(r.totalWeight || 0).toFixed(2)} g` : "—",
    },
    {
      key: "weightPerItem",
      header: "Weight/Qty",
      render: (r) => {
        const qty = Number(r.quantity) || 0;
        if (qty <= 0) return "—";
        const avgWeight = Number(r.totalWeight || 0) / qty;
        return `${avgWeight.toFixed(2)} g`;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const qty = Number(r.quantity) || 0;
        if (qty === 0) return <StatusPill value="Out of stock" />;
        if (qty <= LOW_LIMIT) return <StatusPill value="Low stock" />;
        return <StatusPill value="In stock" />;
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <button
            onClick={() => openEdit(r._id)}
            className="roundedlg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(r)}
            className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Grouped gold inventory with total weight tracking per group."
        right={
          <button
            onClick={openAdd}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            + New Item
          </button>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or SKU…"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-slate-500">{rows.length} items</div>
        </div>

        {errorText ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {errorText}
          </div>
        ) : null}

        <div className="mt-4">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              Loading inventory...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
              No items found. Try changing filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table columns={columns} rows={rows} rowKey={(r) => r._id} />
            </div>
          )}
        </div>
      </Panel>

      <Modal title="Add Item" open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
            <Field label="SKU">
              <input
                value={draft.sku}
                onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
            <Field label="Type">
              <input
                value={draft.productType}
                onChange={(e) => setDraft({ ...draft, productType: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Karat">
              <input
                value={draft.karat}
                onChange={(e) => setDraft({ ...draft, karat: e.target.value })}
                placeholder="e.g., 24K, 22K"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
            <Field label="Quantity">
              <input
                type="number"
                min="0"
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Weight (g)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.totalWeight}
                onChange={(e) => setDraft({ ...draft, totalWeight: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
            <Field label="Markup / g">
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.markupPerGram}
                onChange={(e) => setDraft({ ...draft, markupPerGram: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
          </div>

          <Field label="Base Cost / g">
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.baseCostPerGram}
              onChange={(e) => setDraft({ ...draft, baseCostPerGram: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setAddOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={onSaveAdd}
              disabled={saving}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Add Item"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal title="Edit Item" open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
            <Field label="SKU">
              <input
                value={draft.sku}
                onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
            <Field label="Type">
              <input
                value={draft.productType}
                onChange={(e) => setDraft({ ...draft, productType: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Karat">
              <input
                value={draft.karat}
                onChange={(e) => setDraft({ ...draft, karat: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
            <Field label="Quantity">
              <input
                type="number"
                min="0"
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Weight (g)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.totalWeight}
                onChange={(e) => setDraft({ ...draft, totalWeight: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
            <Field label="Markup / g">
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.markupPerGram}
                onChange={(e) => setDraft({ ...draft, markupPerGram: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
          </div>

          <Field label="Base Cost / g">
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.baseCostPerGram}
              onChange={(e) => setDraft({ ...draft, baseCostPerGram: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setEditOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={onSaveEdit}
              disabled={saving}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
