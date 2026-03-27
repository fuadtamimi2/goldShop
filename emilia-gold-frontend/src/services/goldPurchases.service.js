import { apiGet, apiPost } from "./apiClient";

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeItem(item = {}) {
    return {
        ...item,
        weight: normalizeNumber(item.weight, 0),
        externalReferenceBuyPricePerGram: normalizeNumber(item.externalReferenceBuyPricePerGram, 0),
        purchasePricePerGram: normalizeNumber(item.purchasePricePerGram, 0),
        estimatedResaleValue: normalizeNumber(item.estimatedResaleValue, 0),
        totalPurchaseAmount: normalizeNumber(item.totalPurchaseAmount, 0),
        expectedMargin: normalizeNumber(item.expectedMargin, 0),
    };
}

export async function listGoldPurchases() {
    const data = await apiGet("/api/gold-purchases");
    return (data.items || []).map(normalizeItem);
}

export async function createGoldPurchase(payload) {
    const data = await apiPost("/api/gold-purchases", payload);
    return normalizeItem(data.item);
}