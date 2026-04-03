import { apiGet, apiPost } from "./apiClient";

/**
 * Check if today's daily pricing has been set for the current store.
 * @returns {{ exists: boolean, item: object|null }}
 */
export async function getTodayPricing() {
    return apiGet("/api/daily-pricing/today");
}

/**
 * Get the most recent daily pricing record (for "Use yesterday values" feature).
 * @returns {{ item: object|null }}
 */
export async function getLatestPricing() {
    return apiGet("/api/daily-pricing/latest");
}

/**
 * Save today's daily pricing.
 * @param {{ globalGoldPricePerOunce, buyOffsetPerOunce, sellOffsetPerOunce, usdIlsExchangeRate, sourceLabel }} payload
 * @returns {{ item: object }}
 */
export async function saveDailyPricing(payload) {
    return apiPost("/api/daily-pricing", payload);
}
