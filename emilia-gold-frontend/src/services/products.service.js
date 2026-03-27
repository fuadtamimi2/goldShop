import { apiDelete, apiGet, apiPost, apiPut } from "./apiClient";

function normalizeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function normalizePayload(payload) {
    return {
        name: String(payload?.name || "").trim(),
        sku: String(payload?.sku || "").trim(),
        category: String(payload?.category || "").trim(),
        productType: String(payload?.productType || "").trim(),
        karat: String(payload?.karat || "").trim(),
        quantity: normalizeNumber(payload?.quantity ?? payload?.qty, 0),
        totalWeight: normalizeNumber(payload?.totalWeight ?? payload?.grams, 0),
        markupPerGram: normalizeNumber(payload?.markupPerGram, 0),
        baseCostPerGram: normalizeNumber(payload?.baseCostPerGram ?? payload?.costPrice, 0),
        notes: String(payload?.notes || "").trim(),
        isActive: payload?.isActive !== false,
    };
}

function normalizeProduct(item = {}) {
    const quantity = normalizeNumber(item.quantity ?? item.qty, 0);
    const totalWeight = normalizeNumber(item.totalWeight ?? item.grams, 0);
    const baseCostPerGram = normalizeNumber(item.baseCostPerGram ?? item.costPrice, 0);
    const markupPerGram = normalizeNumber(item.markupPerGram, 0);

    return {
        ...item,
        quantity,
        totalWeight,
        markupPerGram,
        baseCostPerGram,
        qty: quantity,
        grams: totalWeight,
        costPrice: baseCostPerGram,
        productType: item.productType || "",
        karat: item.karat || "",
        averageWeightPerPiece: quantity > 0 ? totalWeight / quantity : 0,
    };
}

export async function listProducts(query = "") {
    const q = query.trim();
    const data = await apiGet(`/api/products${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    return (data.items || []).map(normalizeProduct);
}

export async function createProduct(payload) {
    const data = await apiPost("/api/products", normalizePayload(payload));
    return normalizeProduct(data.item);
}

export async function updateProduct(id, payload) {
    const data = await apiPut(`/api/products/${id}`, normalizePayload(payload));
    return normalizeProduct(data.item);
}

export async function deleteProduct(id) {
    return apiDelete(`/api/products/${id}`);
}