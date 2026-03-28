import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getStoreSettings } from "../services/stores.service";

const SettingsCtx = createContext(null);

const defaultSettings = {
    currency: "ILS",
    defaultKarat: "24K",
    defaultMarkupPerGram: 0,
    lowStockLimit: 2,
    minimumProfitPerGram: 0,
    businessName: "",
    receiptFooter: "",
    notes: "",
};

export function SettingsProvider({ children, user }) {
    const [settings, setSettings] = useState(defaultSettings);
    const [loading, setLoading] = useState(true);

    // Load settings on user change
    useEffect(() => {
        const load = async () => {
            if (!user?.storeId) {
                setSettings(defaultSettings);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const loaded = await getStoreSettings(user.storeId);
                setSettings({ ...defaultSettings, ...loaded });
            } catch (err) {
                console.error("Failed to load settings:", err);
                setSettings(defaultSettings);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [user?.storeId]);

    const api = useMemo(
        () => ({
            settings,
            loading,
            // Refresh settings (called after changes in Settings page)
            refresh: async () => {
                if (!user?.storeId) return;
                try {
                    const loaded = await getStoreSettings(user.storeId);
                    setSettings({ ...defaultSettings, ...loaded });
                } catch (err) {
                    console.error("Failed to refresh settings:", err);
                }
            },
        }),
        [settings, loading, user?.storeId]
    );

    return <SettingsCtx.Provider value={api}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
    const ctx = useContext(SettingsCtx);
    if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
    return ctx;
}
