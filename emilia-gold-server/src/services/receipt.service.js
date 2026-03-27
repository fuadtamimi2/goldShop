/**
 * receipt.service.js
 *
 * Builds a structured receipt/invoice object from a saved Sale document.
 * This receipt object is returned with every POST /api/sales response and
 * can be retrieved later via GET /api/sales/:id/receipt.
 *
 * The object is intentionally plain JSON so the frontend can render it
 * however it needs (modal preview, PDF, print, email template, etc.).
 */

/**
 * @param {object} options
 * @param {import('../models/Sale')} options.sale     - Populated Mongoose Sale doc
 * @param {object|null}              options.customer - Populated customer subdoc
 * @param {object|null}              options.store    - Store doc (name, phone, email)
 * @returns {object}                                   Plain receipt object
 */
function buildReceipt({ sale, customer, store }) {
    const items = (sale.items || []).map((item) => ({
        productName: item.productName || item.description || "—",
        quantitySold: item.quantitySold ?? item.qty ?? 1,
        soldWeight: item.soldWeight ?? item.grams ?? 0,
        baseGoldPricePerGram: item.baseGoldPricePerGram ?? 0,
        markupPerGram: item.markupPerGram ?? 0,
        extraProfitPerGram: item.extraProfitPerGram ?? 0,
        finalPricePerGram: item.finalPricePerGram ?? item.pricePerGram ?? 0,
        minimumPricePerGram: item.minimumPricePerGram ?? 0,
        baseValue: item.baseValue ?? 0,
        markupValue: item.markupValue ?? 0,
        profitValue: item.profitValue ?? 0,
        lineTotal: item.lineTotal ?? 0,
        isBelowMinimum: item.isBelowMinimum ?? false,
    }));

    const totalQuantity = sale.totalQuantity ?? 0;
    const totalWeight = sale.totalWeight ?? 0;
    const subtotal = sale.subtotal ?? sale.finalTotal ?? sale.totalILS ?? 0;
    const totalBaseValue = sale.totalBaseValue ?? 0;
    const totalMarkupValue = sale.totalMarkupValue ?? 0;
    const totalProfitValue = sale.totalProfitValue ?? 0;
    const expectedMargin = sale.expectedMargin ?? totalProfitValue;
    const finalTotal = sale.finalTotal ?? sale.totalILS ?? 0;

    const customerData = customer
        ? {
            name: customer.name || "—",
            phone: customer.phone || "—",
            email: customer.email || null,
        }
        : { name: "—", phone: "—", email: null };

    const storeData = store
        ? {
            name: store.name || "Emilia Gold",
            phone: store.phone || "",
            email: store.email || "",
        }
        : { name: "Emilia Gold", phone: "", email: "" };

    return {
        invoiceNumber: sale.ref,
        date: sale.date ? new Date(sale.date).toISOString() : new Date().toISOString(),
        store: storeData,
        customer: customerData,
        items,
        totalQuantity,
        totalWeight,
        subtotal,
        totalBaseValue,
        totalMarkupValue,
        totalProfitValue,
        expectedMargin,
        finalTotal,
        paymentMethod: sale.paymentMethod || "Cash",
        paymentStatus: sale.paymentStatus || sale.status || "Paid",
        notes: sale.notes || "",
    };
}

module.exports = { buildReceipt };
