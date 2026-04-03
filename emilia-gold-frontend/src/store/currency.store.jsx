import { createContext, useContext, useMemo, useState } from "react";
import { convertViaUsd, formatCurrency, normalizeCurrency } from "../utils/currency";

const SETTINGS_KEY = "eg_settings";
const CurrencyCtx = createContext(null);

function readInitialCurrency() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const c = parsed?.shop?.currency;
        return normalizeCurrency(c, "ILS");
    } catch {
        // ignore and fallback
    }

    return "ILS";
}

function persistCurrency(currency) {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const next = {
            ...parsed,
            shop: {
                ...(parsed?.shop || {}),
                currency,
            },
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
        // no-op
    }
}

export function CurrencyProvider({ children }) {
    const [currency, setCurrencyState] = useState(readInitialCurrency);
    // Optional live exchange rate from daily pricing (overrides static rate)
    const [liveUsdIlsRate, setLiveUsdIlsRate] = useState(null);

    const setCurrency = (next) => {
        const resolved = normalizeCurrency(next, "ILS");
        setCurrencyState(resolved);
        persistCurrency(resolved);
    };

    const api = useMemo(
        () => ({
            currency,
            setCurrency,
            // Expose rate setter so DailyPricingProvider can inject today's rate
            setLiveUsdIlsRate,
            convertCurrency: (amount, from = "ILS", to = currency) => {
                return convertViaUsd(
                    amount,
                    normalizeCurrency(from, "ILS"),
                    normalizeCurrency(to, currency),
                    liveUsdIlsRate
                );
            },
            formatMoney: (amount, from = "ILS") => {
                return formatCurrency(amount, currency, normalizeCurrency(from, "ILS"), liveUsdIlsRate);
            },
        }),
        [currency, liveUsdIlsRate]
    );

    return <CurrencyCtx.Provider value={api}>{children}</CurrencyCtx.Provider>;
}

export function useCurrency() {
    const ctx = useContext(CurrencyCtx);
    if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
    return ctx;
}
