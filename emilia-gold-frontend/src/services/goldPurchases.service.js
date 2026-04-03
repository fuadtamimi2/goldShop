import { apiGet, apiPost } from "./apiClient";

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeItem(item = {}) {
    const marketPricePerGram = normalizeNumber(
        item.marketPricePerGram ?? item.externalReferenceBuyPricePerGram,
        0
    );
    const boughtPricePerGram = normalizeNumber(
        item.boughtPricePerGram ?? item.purchasePricePerGram,
        0
    );
    const expectedRevenue = normalizeNumber(item.expectedRevenue ?? item.expectedMargin, 0);
    const buyBasePricePerGramSnapshot = normalizeNumber(
        item.buyBasePricePerGramSnapshot ?? marketPricePerGram,
        0
    );

    return {
        ...item,
        weight: normalizeNumber(item.weight, 0),
        marketPricePerGram,
        boughtPricePerGram,
        buyBasePricePerGramSnapshot,
        externalReferenceBuyPricePerGram: marketPricePerGram,
        purchasePricePerGram: boughtPricePerGram,
        estimatedResaleValue: normalizeNumber(item.estimatedResaleValue, 0),
        totalPurchaseAmount: normalizeNumber(item.totalPurchaseAmount, 0),
        expectedRevenue,
        expectedMargin: expectedRevenue,
    };
}

export async function listGoldPurchases() {
    const data = await apiGet("/api/gold-purchases");
    return (data.items || []).map(normalizeItem);
}

export async function createGoldPurchase(payload) {
    const data = await apiPost("/api/gold-purchases", payload);
    return { item: normalizeItem(data.item), receipt: data.receipt || null };
}
