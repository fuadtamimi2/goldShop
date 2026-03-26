import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../ui/PageHeader";
import Panel from "../ui/Panel";
import { emitToast } from "../ui/toast";
import { useCurrency } from "../store/currency.store";
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../services/customers.service";

function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
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

export default function Customers() {
  const { formatMoney } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const emptyDraft = { idNumber: "", name: "", phone: "", city: "", email: "", notes: "" };
  const [draft, setDraft] = useState(emptyDraft);

  // Recomputed each render based on q; OK for demo/localStorage.
  const customers = useMemo(() => listCustomers(q), [q]);
  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) || null,
    [customers, selectedId]
  );

  const openAdd = () => {
    setDraft(emptyDraft);
    setAddOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDraft({ idNumber: "", name: "", phone: "", city: "", email: "", notes: "" });
      setAddOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openEdit = () => {
    if (!selected) return;
    setDraft({
      idNumber: selected.idNumber || "",
      name: selected.name || "",
      phone: selected.phone || "",
      city: selected.city || "",
      email: selected.email || "",
      notes: selected.notes || "",
    });
    setEditOpen(true);
  };

  const onAdd = () => {
    const res = createCustomer(draft);
    if (!res.ok) {
      emitToast({ type: "error", title: "Error", message: res.message });
      return;
    }

    emitToast({
      type: "success",
      title: "Customer added",
      message: res.customer?.name || "Saved",
    });

    setAddOpen(false);
    // optional: auto-select the new customer
    setSelectedId(res.customer?.id || null);
  };

  const onEditSave = () => {
    if (!selected) return;

    const res = updateCustomer(selected.id, draft);
    if (!res.ok) {
      emitToast({ type: "error", title: "Error", message: res.message });
      return;
    }

    emitToast({
      type: "success",
      title: "Customer updated",
      message: res.customer?.id || selected.id,
    });

    setEditOpen(false);
  };

  const onDelete = () => {
    if (!selected) return;

    const ok = confirm(`Delete ${selected.name}?`);
    if (!ok) return;

    const res = deleteCustomer(selected.id);
    if (!res.ok) {
      emitToast({ type: "error", title: "Error", message: res.message });
      return;
    }

    emitToast({
      type: "success",
      title: "Customer deleted",
      message: selected.id,
    });

    setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="View customers, history and contact details."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: list */}
        <div className="lg:col-span-2">
          <Panel
            title="Customers"
            meta={`${customers.length} customers`}
            right={
              <button
                onClick={openAdd}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                + New Customer
              </button>
            }
          >
            <div className="mb-4">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, ID number, phone, city or ID..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div className="overflow-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold">ID Number</th>
                    <th className="px-4 py-3 text-left font-semibold">City</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Total Spent
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Last Purchase
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={6}>
                        No customers match your search.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => {
                      const active = c.id === selectedId;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${active ? "bg-amber-50" : ""
                            }`}
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {c.name}{" "}
                            <span className="ml-2 text-xs text-slate-400">
                              {c.id}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {c.phone || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{c.idNumber || "—"}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {c.city || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {typeof c.totalSpent === "number"
                              ? formatMoney(c.totalSpent)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {c.lastPurchase || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* RIGHT: details */}
        <div className="lg:col-span-1">
          <Panel
            title="Customer Details"
            meta={selected ? selected.id : ""}
            right={
              selected ? (
                <div className="flex gap-2">
                  <button
                    onClick={openEdit}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={onDelete}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
              ) : null
            }
          >
            {!selected ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                Select a customer from the list to view details.
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="text-lg font-semibold text-slate-900">
                  {selected.name}
                </div>
                <div className="text-slate-600">{selected.city || "—"}</div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="text-slate-500">Phone</div>
                  <div className="text-right text-slate-900">
                    {selected.phone || "—"}
                  </div>

                  <div className="text-slate-500">Email</div>
                  <div className="text-right text-slate-900">
                    {selected.email || "—"}
                  </div>

                  <div className="text-slate-500">ID Number</div>
                  <div className="text-right text-slate-900">
                    {selected.idNumber || "—"}
                  </div>

                  <div className="text-slate-500">Total Spent</div>
                  <div className="text-right text-slate-900">
                    {typeof selected.totalSpent === "number"
                      ? formatMoney(selected.totalSpent)
                      : "—"}
                  </div>

                  <div className="text-slate-500">Last Purchase</div>
                  <div className="text-right text-slate-900">
                    {selected.lastPurchase || "—"}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">
                    Notes
                  </div>
                  <div className="mt-1 text-slate-800">
                    {selected.notes || "—"}
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* ADD modal */}
      <Modal
        title="Add Customer"
        open={addOpen}
        onClose={() => setAddOpen(false)}
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label="ID Number">
            <input
              value={draft.idNumber}
              onChange={(e) => setDraft({ ...draft, idNumber: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label="Name">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label="Phone">
            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label="City">
            <input
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label="Email">
            <input
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              rows={3}
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
              onClick={onAdd}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Add
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT modal */}
      <Modal
        title="Edit Customer"
        open={editOpen}
        onClose={() => setEditOpen(false)}
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label="ID Number">
            <input
              value={draft.idNumber}
              onChange={(e) => setDraft({ ...draft, idNumber: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label="Name">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label="Phone">
            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label="City">
            <input
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label="Email">
            <input
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              rows={3}
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
              onClick={onEditSave}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
