import { createContext, useContext, useMemo, useState } from "react";
import { USD_TO_ILS, USD_TO_JOD } from "../data/pricing";

const SETTINGS_KEY = "eg_settings";
const CurrencyCtx = createContext(null);

function readInitialCurrency() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const c = parsed?.shop?.currency;
        if (c === "USD" || c === "ILS" || c === "JOD") return c;
    } catch {
        // ignore and fallback
    }

    return "ILS";
}

function toUsd(amount, from) {
    if (from === "USD") return amount;
    if (from === "ILS") return amount / USD_TO_ILS;
    if (from === "JOD") return amount / USD_TO_JOD;
    return amount;
}

function fromUsd(amount, to) {
    if (to === "USD") return amount;
    if (to === "ILS") return amount * USD_TO_ILS;
    if (to === "JOD") return amount * USD_TO_JOD;
    return amount;
}

function symbolFor(currency) {
    if (currency === "USD") return "$";
    if (currency === "JOD") return "JD";
    return "₪";
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

    const setCurrency = (next) => {
        const resolved = next === "USD" || next === "ILS" || next === "JOD" ? next : "ILS";
        setCurrencyState(resolved);
        persistCurrency(resolved);
    };

    const api = useMemo(
        () => ({
            currency,
            setCurrency,
            convertCurrency: (amount, from = "ILS", to = currency) => {
                const value = Number(amount);
                if (!Number.isFinite(value)) return 0;
                return fromUsd(toUsd(value, from), to);
            },
            formatMoney: (amount, from = "ILS") => {
                const converted = fromUsd(toUsd(Number(amount) || 0, from), currency);
                return `${symbolFor(currency)} ${converted.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                })}`;
            },
        }),
        [currency]
    );

    return <CurrencyCtx.Provider value={api}>{children}</CurrencyCtx.Provider>;
}

export function useCurrency() {
    const ctx = useContext(CurrencyCtx);
    if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
    return ctx;
}
