import { KARAT_RATIO, SPOT_USD_PER_OZ, TROY_OUNCE_TO_GRAM } from "../data/pricing";

export function normalizeKarat(karat) {
    const value = String(karat || "").trim().toUpperCase();
    return KARAT_RATIO[value] ? value : "24K";
}

/**
 * Compute the market (sell base) price per gram for a given karat.
 *
 * Prefers the snapshot-based `sellBasePricePerGramFn` from DailyPricingContext when provided.
 * Falls back to static SPOT_USD_PER_OZ and convertCurrency when no live pricing is available.
 *
 * @param {object} opts
 * @param {string} opts.karat
 * @param {function|null} opts.sellBasePricePerGramFn  - From useDailyPricing().sellBasePricePerGram
 * @param {function|null} opts.convertCurrency         - From useCurrency().convertCurrency (fallback)
 */
export function marketPricePerGramByKarat({ karat, sellBasePricePerGramFn, convertCurrency }) {
    const normalizedKarat = normalizeKarat(karat);

    // If daily pricing is loaded, use the authoritative snapshot-based price
    if (typeof sellBasePricePerGramFn === "function") {
        return sellBasePricePerGramFn(normalizedKarat);
    }

    // Fallback: static spot price from data/pricing.js
    const ratio = KARAT_RATIO[normalizedKarat] || 1;
    const price24kUsdPerGram = SPOT_USD_PER_OZ / TROY_OUNCE_TO_GRAM;
    const karatUsdPerGram = price24kUsdPerGram * ratio;

    if (typeof convertCurrency === "function") {
        return convertCurrency(karatUsdPerGram, "USD");
    }

    return karatUsdPerGram;
}
