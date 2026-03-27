import { useState } from "react";
import { apiPost } from "../../services/apiClient";

const INPUT =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none " +
    "focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50";

/**
 * QuickCreateCustomerModal
 *
 * Lightweight inline modal that lets the user create a new customer
 * without leaving the Add Sale flow.
 *
 * Props:
 *   open      — boolean
 *   onClose   — () => void
 *   onCreated — (customer: object) => void  — called after successful creation
 */
export default function QuickCreateCustomerModal({ open, onClose, onCreated }) {
    const empty = { idNumber: "", name: "", phone: "", email: "", notes: "" };
    const [form, setForm] = useState(empty);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    if (!open) return null;

    function set(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function validate() {
        const errs = {};
        const phoneDigits = form.phone.replace(/\D/g, "");
        const idDigits = form.idNumber.replace(/\D/g, "");

        if (!idDigits) errs.idNumber = "ID number is required.";
        if (!form.name.trim()) errs.name = "Full name is required.";
        if (!form.phone.trim()) errs.phone = "Phone number is required.";
        if (form.phone.trim() && !/^(052|059)\d{7}$/.test(phoneDigits)) {
            errs.phone = "Phone must start with 052 or 059 and be 10 digits.";
        }
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            errs.email = "Enter a valid email address.";
        }
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }

        try {
            setSaving(true);
            const data = await apiPost("/api/customers", {
                idNumber: form.idNumber.replace(/\D/g, ""),
                name: form.name.trim(),
                phone: form.phone.replace(/\D/g, ""),
                email: form.email.trim() || undefined,
                notes: form.notes.trim() || undefined,
            });
            const created = data.item;
            setForm(empty);
            setErrors({});
            onCreated(created);
        } catch (err) {
            setErrors({ _global: err.message || "Failed to create customer." });
        } finally {
            setSaving(false);
        }
    }

    function handleClose() {
        setForm(empty);
        setErrors({});
        onClose();
    }

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <div className="text-base font-semibold text-slate-900">New Customer</div>
                        <div className="text-xs text-slate-400">
                            Quick-create and auto-attach to this sale
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    {errors._global && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                            {errors._global}
                        </div>
                    )}

                    {/* Name */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                            ID Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={form.idNumber}
                            onChange={(e) => set("idNumber", e.target.value)}
                            placeholder="e.g. 123456789"
                            inputMode="numeric"
                            className={INPUT}
                            disabled={saving}
                        />
                        {errors.idNumber && (
                            <p className="text-xs text-red-600">{errors.idNumber}</p>
                        )}
                    </div>

                    {/* Name */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                            placeholder="e.g. Sarah Cohen"
                            className={INPUT}
                            disabled={saving}
                        />
                        {errors.name && (
                            <p className="text-xs text-red-600">{errors.name}</p>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                            Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            placeholder="e.g. 0521234567 or 0591234567"
                            type="tel"
                            className={INPUT}
                            disabled={saving}
                        />
                        {errors.phone && (
                            <p className="text-xs text-red-600">{errors.phone}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                            Email{" "}
                            <span className="text-slate-400 font-normal">(optional, needed for receipt)</span>
                        </label>
                        <input
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                            placeholder="email@example.com"
                            type="email"
                            className={INPUT}
                            disabled={saving}
                        />
                        {errors.email && (
                            <p className="text-xs text-red-600">{errors.email}</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Notes (optional)</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => set("notes", e.target.value)}
                            rows={2}
                            placeholder="Any notes about this customer..."
                            className={INPUT + " resize-none"}
                            disabled={saving}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={saving}
                            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                        >
                            {saving ? "Creating…" : "Create & Select"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
