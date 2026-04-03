import { apiGet, apiPost, apiPatch } from "./apiClient";

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSaleItem(item = {}) {
    const minimumPricePerGram = normalizeNumber(item.minimumPricePerGram ?? item.baseGoldPricePerGram, 0);
    const productExtraProfitPerGram = normalizeNumber(
        item.productExtraProfitPerGram ?? item.markupPerGram,
        0
    );
    const expectedMinimumSellingPricePerGram = normalizeNumber(
        item.expectedMinimumSellingPricePerGram ?? (minimumPricePerGram + productExtraProfitPerGram),
        0
    );
    const actualSalePricePerGram = normalizeNumber(
        item.actualSalePricePerGram ?? item.salePricePerGram ?? item.finalPricePerGram ?? item.pricePerGram,
        0
    );

    return {
        ...item,
        quantitySold: normalizeNumber(item.quantitySold ?? item.qty, 0),
        soldWeight: normalizeNumber(item.soldWeight ?? item.grams ?? item.weightInGrams, 0),
        minimumPricePerGram,
        productExtraProfitPerGram,
        expectedMinimumSellingPricePerGram,
        actualSalePricePerGram,
        lineRevenue: normalizeNumber(
            item.lineRevenue,
            (actualSalePricePerGram - minimumPricePerGram) * normalizeNumber(item.soldWeight ?? item.grams ?? item.weightInGrams, 0)
        ),
        finalPricePerGram: actualSalePricePerGram,
        baseValue: normalizeNumber(item.baseValue, minimumPricePerGram * normalizeNumber(item.soldWeight ?? item.grams ?? item.weightInGrams, 0)),
        markupValue: normalizeNumber(item.markupValue, productExtraProfitPerGram * normalizeNumber(item.soldWeight ?? item.grams ?? item.weightInGrams, 0)),
        profitValue: normalizeNumber(item.profitValue, (actualSalePricePerGram - minimumPricePerGram) * normalizeNumber(item.soldWeight ?? item.grams ?? item.weightInGrams, 0)),
        lineTotal: normalizeNumber(item.lineTotal, 0),
        isBelowMinimum: Boolean(
            item.isBelowMinimum ?? (actualSalePricePerGram < expectedMinimumSellingPricePerGram)
        ),
    };
}

function normalizeSale(item = {}) {
    return {
        ...item,
        items: (item.items || []).map(normalizeSaleItem),
        totalQuantity: normalizeNumber(item.totalQuantity, 0),
        totalWeight: normalizeNumber(item.totalWeight, 0),
        totalBaseValue: normalizeNumber(item.totalBaseValue, 0),
        totalMarkupValue: normalizeNumber(item.totalMarkupValue, 0),
        totalProfitValue: normalizeNumber(item.totalProfitValue, 0),
        totalLineRevenue: normalizeNumber(item.totalLineRevenue, 0),
        expectedMinimumTotal: normalizeNumber(item.expectedMinimumTotal, 0),
        subtotal: normalizeNumber(item.subtotal, 0),
        finalTotal: normalizeNumber(item.finalTotal ?? item.totalILS, 0),
        paymentStatus: item.paymentStatus || item.status || "Paid",
    };
}

function normalizeReceipt(receipt = {}) {
    return {
        ...receipt,
        items: (receipt.items || []).map(normalizeSaleItem),
        totalQuantity: normalizeNumber(receipt.totalQuantity, 0),
        totalWeight: normalizeNumber(receipt.totalWeight, 0),
        subtotal: normalizeNumber(receipt.subtotal, 0),
        finalTotal: normalizeNumber(receipt.finalTotal ?? receipt.totalAmount, 0),
        paymentStatus: receipt.paymentStatus || "Paid",
    };
}

/**
 * Create a new multi-item sale.
 *
 * @param {object} payload
 * @param {string}   payload.customerId
 * @param {Array}    payload.items         - array of line items
 * @param {number}   [payload.discount]
 * @param {string}   [payload.paymentMethod]
 * @param {string}   [payload.status]
 * @param {string}   [payload.date]        - ISO date string
 * @param {string}   [payload.notes]
 * @returns {Promise<{ item: object, receipt: object }>}
 */
export async function createSale(payload) {
    const data = await apiPost("/api/sales", payload);
    return { item: normalizeSale(data.item), receipt: normalizeReceipt(data.receipt) };
}

/**
 * Fetch all sales for the current store.
 * @param {object} [filters] - optional { status, customerId, from, to }
 * @returns {Promise<object[]>}
 */
export async function listSales(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.customerId) params.set("customerId", filters.customerId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    const qs = params.toString();
    const data = await apiGet(`/api/sales${qs ? `?${qs}` : ""}`);
    return (data.items || []).map(normalizeSale);
}

/**
 * Fetch a single sale by ID.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getSale(id) {
    const data = await apiGet(`/api/sales/${id}`);
    return normalizeSale(data.item);
}

/**
 * Fetch the receipt object for a sale.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getSaleReceipt(id) {
    const data = await apiGet(`/api/sales/${id}/receipt`);
    return normalizeReceipt(data.receipt);
}

/**
 * Send receipt to customer's email.
 * @param {string} saleId
 * @returns {Promise<{ sent: boolean, message: string }>}
 */
export async function emailReceipt(saleId) {
    return apiPost(`/api/sales/${saleId}/receipt/email`, {});
}

/**
 * Update a sale's payment status.
 * @param {string} saleId
 * @param {string} status  - "Paid" | "Pending" | "Refunded"
 */
export async function updateSaleStatus(saleId, status) {
    const data = await apiPatch(`/api/sales/${saleId}/status`, { status });
    return normalizeSale(data.item);
}
