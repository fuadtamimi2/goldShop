import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getTodayPricing } from "../services/dailyPricing.service";
import { KARAT_RATIO, TROY_OUNCE_TO_GRAM } from "../data/pricing";
import { useCurrency } from "./currency.store";

const DailyPricingCtx = createContext(null);

/** Parse karat string to a numeric factor (0–1). */
function karatFactor(karat) {
    const k = String(karat || "").trim().toUpperCase();
    if (KARAT_RATIO[k] != null) return KARAT_RATIO[k];
    const num = parseFloat(k);
    if (Number.isFinite(num) && num > 0 && num <= 24) return num / 24;
    return 1.0; // fallback to 24K
}

export function DailyPricingProvider({ children, user }) {
    const { setLiveUsdIlsRate } = useCurrency();
    const [todayPricing, setTodayPricingState] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    function setTodayPricing(item) {
        setTodayPricingState(item);
        if (item?.usdIlsExchangeRate) {
            setLiveUsdIlsRate(item.usdIlsExchangeRate);
        }
    }

    const checkTodayPricing = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const { exists, item } = await getTodayPricing();
            if (exists && item) {
                setTodayPricing(item);
                setShowModal(false);
            } else {
                setTodayPricingState(null);
                setShowModal(true);
            }
        } catch {
            // Network error — don't block the app, but keep modal showing
            setTodayPricingState(null);
            setShowModal(true);
        } finally {
            setLoading(false);
        }
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        checkTodayPricing();
    }, [checkTodayPricing]);

    const api = useMemo(() => {
        const pricing = todayPricing || {};

        /**
         * sellBasePricePerGram(karat) =
         *   (globalGoldPricePerOunce + sellOffsetPerOunce) / 31.1035 * karatFactor
         */
        function sellBasePricePerGram(karat) {
            const global = Number(pricing.globalGoldPricePerOunce || 0);
            const sellOffset = Number(pricing.sellOffsetPerOunce || 0);
            return ((global + sellOffset) / TROY_OUNCE_TO_GRAM) * karatFactor(karat);
        }

        /**
         * buyBasePricePerGram(karat) =
         *   (globalGoldPricePerOunce + buyOffsetPerOunce) / 31.1035 * karatFactor
         */
        function buyBasePricePerGram(karat) {
            const global = Number(pricing.globalGoldPricePerOunce || 0);
            const buyOffset = Number(pricing.buyOffsetPerOunce || 0);
            return ((global + buyOffset) / TROY_OUNCE_TO_GRAM) * karatFactor(karat);
        }

        return {
            todayPricing,
            hasTodayPricing: !!todayPricing,
            loading,
            showModal,
            setShowModal,
            setTodayPricing,
            checkTodayPricing,
            // Computed helpers
            sellBasePricePerGram,
            buyBasePricePerGram,
            // Raw snapshot values (0 if not set)
            globalGoldPricePerOunce: Number(pricing.globalGoldPricePerOunce || 0),
            buyOffsetPerOunce: Number(pricing.buyOffsetPerOunce || 0),
            sellOffsetPerOunce: Number(pricing.sellOffsetPerOunce || 0),
            usdIlsExchangeRate: Number(pricing.usdIlsExchangeRate || 0),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todayPricing, loading, showModal]);

    return <DailyPricingCtx.Provider value={api}>{children}</DailyPricingCtx.Provider>;
}

export function useDailyPricing() {
    const ctx = useContext(DailyPricingCtx);
    if (!ctx) throw new Error("useDailyPricing must be used within DailyPricingProvider");
    return ctx;
}
