import { emailReceipt } from "../../services/sales.service";
import { emitToast } from "../../ui/toast";
import { useState } from "react";

export default function ReceiptPreviewModal({ open, onClose, receipt, saleId }) {
    const [emailing, setEmailing] = useState(false);

    if (!open || !receipt) return null;

    const date = receipt.date
        ? new Date(receipt.date).toLocaleDateString(undefined, {
            year: "numeric", month: "long", day: "numeric",
        })
        : "—";

    async function handleEmailReceipt() {
        try {
            setEmailing(true);
            const result = await emailReceipt(saleId);
            if (result.sent) {
                emitToast({ type: "success", title: "Receipt sent", message: result.message });
            } else {
                emitToast({ type: "warning", title: "Not sent", message: result.message });
            }
        } catch (err) {
            emitToast({ type: "error", title: "Email failed", message: err.message });
        } finally {
            setEmailing(false);
        }
    }

    function handlePrint() {
        window.print();
    }

    const divider = <div className="border-t border-slate-200 my-3" />;

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">

                {/* Header buttons */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 print:hidden">
                    <div className="text-sm font-semibold text-slate-700">Receipt / Invoice</div>
                    <div className="flex items-center gap-2">
                        {receipt.customer?.email && (
                            <button
                                onClick={handleEmailReceipt}
                                disabled={emailing}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                {emailing ? "Sending..." : "Email Receipt"}
                            </button>
                        )}
                        <button
                            onClick={handlePrint}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Print
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Receipt body */}
                <div className="px-6 py-5 space-y-4 text-sm text-slate-800">

                    {/* Store header */}
                    <div className="text-center space-y-0.5">
                        <div className="text-lg font-bold text-amber-700">
                            {receipt.store?.name || "Emilia Gold"}
                        </div>
                        {receipt.store?.phone && (
                            <div className="text-xs text-slate-500">{receipt.store.phone}</div>
                        )}
                        {receipt.store?.email && (
                            <div className="text-xs text-slate-500">{receipt.store.email}</div>
                        )}
                    </div>

                    {divider}

                    {/* Invoice meta */}
                    <div className="flex justify-between">
                        <div>
                            <div className="text-xs text-slate-400">Invoice #</div>
                            <div className="font-semibold">{receipt.invoiceNumber}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-400">Date</div>
                            <div className="font-medium">{date}</div>
                        </div>
                    </div>

                    {divider}

                    {/* Customer */}
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                            Customer
                        </div>
                        <div className="font-medium">{receipt.customer?.name || "—"}</div>
                        {receipt.customer?.phone && (
                            <div className="text-xs text-slate-500">{receipt.customer.phone}</div>
                        )}
                        {receipt.customer?.email && (
                            <div className="text-xs text-slate-500">{receipt.customer.email}</div>
                        )}
                    </div>

                    {divider}

                    {/* Items */}
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                            Items
                        </div>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-400">
                                    <th className="pb-1 text-left font-normal">Product</th>
                                    <th className="pb-1 text-center font-normal">Qty</th>
                                    <th className="pb-1 text-center font-normal">Weight</th>
                                    <th className="pb-1 text-center font-normal">Base/g</th>
                                    <th className="pb-1 text-center font-normal">Markup/g</th>
                                    <th className="pb-1 text-center font-normal">Extra/g</th>
                                    <th className="pb-1 text-center font-normal">Final/g</th>
                                    <th className="pb-1 text-right font-normal">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(receipt.items || []).map((item, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-1.5 font-medium">{item.productName}</td>
                                        <td className="py-1.5 text-center">{item.quantitySold}</td>
                                        <td className="py-1.5 text-center">{Number(item.soldWeight).toFixed(2)}g</td>
                                        <td className="py-1.5 text-center">₪{Number(item.baseGoldPricePerGram).toFixed(2)}</td>
                                        <td className="py-1.5 text-center">₪{Number(item.markupPerGram).toFixed(2)}</td>
                                        <td className="py-1.5 text-center">₪{Number(item.extraProfitPerGram).toFixed(2)}</td>
                                        <td className="py-1.5 text-center">₪{Number(item.finalPricePerGram).toFixed(2)}</td>
                                        <td className="py-1.5 text-right font-semibold">
                                            ₪{Number(item.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {divider}

                    {/* Totals */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Total quantity</span>
                            <span>{Number(receipt.totalQuantity || 0)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Total weight</span>
                            <span>{Number(receipt.totalWeight || 0).toFixed(2)} g</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Base value</span>
                            <span>₪{Number(receipt.totalBaseValue || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Markup value</span>
                            <span>₪{Number(receipt.totalMarkupValue || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Extra profit value</span>
                            <span>₪{Number(receipt.totalProfitValue || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Subtotal</span>
                            <span>
                                ₪{Number(receipt.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2">
                            <span className="font-semibold">Total</span>
                            <span className="text-base font-bold text-amber-700">
                                ₪{Number(receipt.finalTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {divider}

                    {/* Payment */}
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Payment method</span>
                        <span className="font-medium">{receipt.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Status</span>
                        <span className={
                            "font-medium " +
                            (receipt.paymentStatus === "Paid" ? "text-emerald-600" :
                                receipt.paymentStatus === "Pending" ? "text-amber-600" :
                                    "text-red-500")
                        }>
                            {receipt.paymentStatus}
                        </span>
                    </div>

                    {receipt.notes && (
                        <>
                            {divider}
                            <div className="text-xs text-slate-500 italic">{receipt.notes}</div>
                        </>
                    )}

                    {/* WhatsApp/SMS placeholder note */}
                    {!receipt.customer?.email && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 mt-2">
                            WhatsApp/SMS delivery placeholder is ready for future integration. Add customer email to enable email receipts.
                        </div>
                    )}

                    <div className="pt-2 text-center text-xs text-slate-300">
                        Thank you for your purchase.
                    </div>
                </div>

                {/* Close button */}
                <div className="border-t border-slate-100 px-5 py-4 print:hidden">
                    <button
                        onClick={onClose}
                        className="w-full rounded-xl bg-amber-700 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
