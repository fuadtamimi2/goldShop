/**
 * receipt.service.js
 *
 * Builds structured receipt/invoice objects from saved Mongoose documents.
 * Returns plain JSON so the frontend can render (modal preview, PDF, print, email).
 *
 * IMPORTANT: Both builders strip all internal margin/profit/cost data.
 * Only customer-facing information is included.
 */

/**
 * Build a sales receipt/invoice for the customer.
 * Shows: items sold, prices, totals, payment — NO internal cost/profit data.
 *
 * @param {object} options
 * @param {object} options.sale     - Populated Mongoose Sale doc
 * @param {object|null} options.customer
 * @param {object|null} options.store
 */
function buildReceipt({ sale, customer, store }) {
    const items = (sale.items || []).map((item) => ({
        productName: item.productName || item.description || "—",
        quantitySold: item.quantitySold ?? item.qty ?? 1,
        soldWeight: item.soldWeight ?? item.grams ?? 0,
        salePricePerGram: item.actualSalePricePerGram ?? item.finalPricePerGram ?? item.pricePerGram ?? 0,
        lineTotal: item.lineTotal ?? 0,
    }));

    const totalQuantity = sale.totalQuantity ?? 0;
    const totalWeight = sale.totalWeight ?? 0;
    const subtotal = sale.subtotal ?? sale.finalTotal ?? sale.totalILS ?? 0;
    const finalTotal = sale.finalTotal ?? sale.totalILS ?? 0;

    const customerData = customer
        ? { name: customer.name || "—", phone: customer.phone || "—", email: customer.email || null }
        : { name: "—", phone: "—", email: null };

    const storeData = store
        ? { name: store.name || "Emilia Gold", phone: store.phone || "", email: store.email || "" }
        : { name: "Emilia Gold", phone: "", email: "" };

    return {
        type: "sale",
        invoiceNumber: sale.ref,
        date: sale.date ? new Date(sale.date).toISOString() : new Date().toISOString(),
        store: storeData,
        customer: customerData,
        items,
        totalQuantity,
        totalWeight,
        subtotal,
        finalTotal,
        paymentMethod: sale.paymentMethod || "Cash",
        paymentStatus: sale.paymentStatus || sale.status || "Paid",
        notes: sale.notes || "",
    };
}

/**
 * Build a gold-buying receipt for the seller/customer who sold gold to the shop.
 * Shows: transaction details, karat, weight, price paid, total — NO internal revenue/margin data.
 *
 * @param {object} options
 * @param {object} options.purchase - Populated Mongoose GoldPurchase doc
 * @param {object|null} options.customer
 * @param {object|null} options.store
 */
function buildGoldPurchaseReceipt({ purchase, customer, store }) {
    const customerData = customer
        ? { name: customer.name || "—", phone: customer.phone || "—", email: customer.email || null }
        : { name: "—", phone: "—", email: null };

    const storeData = store
        ? { name: store.name || "Emilia Gold", phone: store.phone || "", email: store.email || "" }
        : { name: "Emilia Gold", phone: "", email: "" };

    return {
        type: "goldPurchase",
        receiptNumber: purchase.ref,
        date: purchase.date ? new Date(purchase.date).toISOString() : new Date().toISOString(),
        store: storeData,
        customer: customerData,
        karat: purchase.karat || "—",
        weight: purchase.weight ?? 0,
        // Market context — transparent to customer, no internal margin shown
        globalGoldPricePerOunce: purchase.globalGoldPricePerOunceSnapshot ?? 0,
        buyOffsetPerOunce: purchase.buyOffsetPerOunceSnapshot ?? 0,
        usdIlsExchangeRate: purchase.usdIlsExchangeRateSnapshot ?? 0,
        // What the customer received
        boughtPricePerGram: purchase.boughtPricePerGram ?? purchase.purchasePricePerGram ?? 0,
        totalPaid: purchase.totalPurchaseAmount ?? 0,
        paymentMethod: purchase.paymentMethod || "Cash",
        notes: purchase.notes || "",
    };
}

module.exports = { buildReceipt, buildGoldPurchaseReceipt };
