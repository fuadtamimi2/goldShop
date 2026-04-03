import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

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
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const emptyDraft = { idNumber: "", name: "", phone: "", city: "", email: "", notes: "" };
  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true);
        setErrorText("");
        const items = await listCustomers();
        setCustomers(items);
      } catch (err) {
        setErrorText(err.message || "Failed to load customers.");
      } finally {
        setLoading(false);
      }
    }

    loadCustomers();
  }, []);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((c) =>
      [c.name, c.phone, c.city, c._id, c.idNumber, c.email]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(query))
    );
  }, [customers, q]);

  const selected = useMemo(
    () => customers.find((c) => c._id === selectedId) || null,
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
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("new");
      setSearchParams(nextSearchParams, { replace: true });
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

  const onAdd = async () => {
    try {
      setSaving(true);
      setErrorText("");
      const created = await createCustomer(draft);
      setCustomers((prev) => [created, ...prev]);
      emitToast({
        type: "success",
        title: t("customers.toasts.addedTitle"),
        message: created?.name || t("common.save"),
      });
      setAddOpen(false);
      setSelectedId(created?._id || null);
    } catch (err) {
      setErrorText(err.message || "Failed to save customer.");
      emitToast({ type: "error", title: t("common.error"), message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const onEditSave = async () => {
    if (!selected) return;

    try {
      setSaving(true);
      setErrorText("");
      const updated = await updateCustomer(selected._id, draft);
      setCustomers((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      emitToast({
        type: "success",
        title: t("customers.toasts.updatedTitle"),
        message: updated?.name || selected.name,
      });
      setEditOpen(false);
    } catch (err) {
      setErrorText(err.message || "Failed to update customer.");
      emitToast({ type: "error", title: t("common.error"), message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!selected) return;

    const ok = confirm(t("customers.deleteConfirm", { name: selected.name }));
    if (!ok) return;

    try {
      setSaving(true);
      setErrorText("");
      await deleteCustomer(selected._id);
      setCustomers((prev) => prev.filter((c) => c._id !== selected._id));
      emitToast({
        type: "success",
        title: t("customers.toasts.deletedTitle"),
        message: selected.name,
      });
      setSelectedId(null);
    } catch (err) {
      setErrorText(err.message || "Failed to delete customer.");
      emitToast({ type: "error", title: t("common.error"), message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("customers.title")}
        subtitle={t("customers.subtitle")}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: list */}
        <div className="lg:col-span-2">
          <Panel
            title="Customers"
            meta={t("customers.meta", { count: rows.length })}
            right={
              <button
                onClick={openAdd}
                disabled={saving}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                {t("customers.newCustomer")}
              </button>
            }
          >
            <div className="mb-4">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("customers.searchPlaceholder")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>

            {errorText ? (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {errorText}
              </div>
            ) : null}

            <div className="overflow-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("customers.table.customer")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">{t("customers.table.phone")}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t("customers.table.idNumber")}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t("customers.table.city")}</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("customers.table.totalSpent")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("customers.table.lastPurchase")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={6}>
                        {t("common.loading")}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={6}>
                        {t("customers.noCustomers")}
                      </td>
                    </tr>
                  ) : (
                    rows.map((c) => {
                      const active = c._id === selectedId;
                      return (
                        <tr
                          key={c._id}
                          onClick={() => setSelectedId(c._id)}
                          className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${active ? "bg-amber-50" : ""
                            }`}
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {c.name}{" "}
                            <span className="ml-2 text-xs text-slate-400">
                              {c._id}
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
                            {formatDate(c.lastPurchase)}
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
            title={t("customers.profile.title")}
            meta={selected ? selected._id : ""}
            right={
              selected ? (
                <div className="flex gap-2">
                  <button
                    onClick={openEdit}
                    disabled={saving}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    {t("customers.profile.editBtn")}
                  </button>
                  <button
                    onClick={onDelete}
                    disabled={saving}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    {t("customers.profile.deleteBtn")}
                  </button>
                </div>
              ) : null
            }
          >
            {!selected ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                {t("customers.noCustomers")}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="text-lg font-semibold text-slate-900">
                  {selected.name}
                </div>
                <div className="text-slate-600">{selected.city || "—"}</div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="text-slate-500">{t("customers.profile.phone")}</div>
                  <div className="text-right text-slate-900">
                    {selected.phone || "—"}
                  </div>

                  <div className="text-slate-500">{t("customers.profile.email")}</div>
                  <div className="text-right text-slate-900">
                    {selected.email || "—"}
                  </div>

                  <div className="text-slate-500">{t("customers.profile.idNumber")}</div>
                  <div className="text-right text-slate-900">
                    {selected.idNumber || "—"}
                  </div>

                  <div className="text-slate-500">{t("customers.profile.totalSpent")}</div>
                  <div className="text-right text-slate-900">
                    {typeof selected.totalSpent === "number"
                      ? formatMoney(selected.totalSpent)
                      : "—"}
                  </div>

                  <div className="text-slate-500">{t("customers.profile.lastPurchase")}</div>
                  <div className="text-right text-slate-900">
                    {formatDate(selected.lastPurchase)}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">
                    {t("customers.fields.notes")}
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
        title={t("customers.addModal.title")}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label={t("customers.fields.idNumber")}>
            <input
              value={draft.idNumber}
              onChange={(e) => setDraft({ ...draft, idNumber: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label={t("customers.fields.name")}>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label={t("customers.fields.phone")}>
            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label={t("customers.fields.city")}>
            <input
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label={t("customers.fields.email")}>
            <input
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label={t("customers.fields.notes")}>
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
              {t("customers.addModal.cancel")}
            </button>
            <button
              onClick={onAdd}
              disabled={saving}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              {t("customers.addModal.save")}
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT modal */}
      <Modal
        title={t("customers.editModal.title")}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label={t("customers.fields.idNumber")}>
            <input
              value={draft.idNumber}
              onChange={(e) => setDraft({ ...draft, idNumber: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label={t("customers.fields.name")}>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label={t("customers.fields.phone")}>
            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label={t("customers.fields.city")}>
            <input
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label={t("customers.fields.email")}>
            <input
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>
          <Field label={t("customers.fields.notes")}>
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
              {t("customers.editModal.cancel")}
            </button>
            <button
              onClick={onEditSave}
              disabled={saving}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              {t("customers.editModal.save")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
