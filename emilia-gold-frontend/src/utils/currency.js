import { USD_TO_ILS, USD_TO_JOD } from "../data/pricing";

export const SUPPORTED_CURRENCIES = ["USD", "ILS", "JOD"];

export function normalizeCurrency(currency, fallback = "ILS") {
    return SUPPORTED_CURRENCIES.includes(currency) ? currency : fallback;
}

export function currencySymbol(currency) {
    if (currency === "USD") return "$";
    if (currency === "JOD") return "JD";
    return "₪";
}

export function toUsd(amount, fromCurrency, liveUsdIlsRate = null) {
    if (fromCurrency === "USD") return amount;
    if (fromCurrency === "ILS") {
        const rate = liveUsdIlsRate != null ? liveUsdIlsRate : USD_TO_ILS;
        return amount / rate;
    }
    if (fromCurrency === "JOD") return amount / USD_TO_JOD;
    return amount;
}

export function fromUsd(amount, toCurrency, liveUsdIlsRate = null) {
    if (toCurrency === "USD") return amount;
    if (toCurrency === "ILS") {
        const rate = liveUsdIlsRate != null ? liveUsdIlsRate : USD_TO_ILS;
        return amount * rate;
    }
    if (toCurrency === "JOD") return amount * USD_TO_JOD;
    return amount;
}

export function convertViaUsd(amount, fromCurrency, toCurrency, liveUsdIlsRate = null) {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) return 0;
    return fromUsd(toUsd(numeric, fromCurrency, liveUsdIlsRate), toCurrency, liveUsdIlsRate);
}

export function formatCurrency(amount, currency, fromCurrency = "ILS", liveUsdIlsRate = null) {
    const normalizedCurrency = normalizeCurrency(currency);
    const normalizedFrom = normalizeCurrency(fromCurrency);
    const converted = convertViaUsd(amount, normalizedFrom, normalizedCurrency, liveUsdIlsRate);

    return `${currencySymbol(normalizedCurrency)} ${converted.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}
