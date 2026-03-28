import { createContext, useCallback, useContext, useEffect, useState } from "react";
import i18n from "../i18n";

const LanguageCtx = createContext(null);

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(() => localStorage.getItem("eg_lang") || "en");

    const setLang = useCallback((newLang) => {
        localStorage.setItem("eg_lang", newLang);
        i18n.changeLanguage(newLang);
        setLangState(newLang);
    }, []);

    // Apply dir attribute and font whenever language changes
    useEffect(() => {
        const isRtl = lang === "ar";
        document.documentElement.dir = isRtl ? "rtl" : "ltr";
        document.documentElement.lang = lang;
    }, [lang]);

    return (
        <LanguageCtx.Provider value={{ lang, setLang, isRtl: lang === "ar" }}>
            {children}
        </LanguageCtx.Provider>
    );
}

export function useLanguage() {
    const ctx = useContext(LanguageCtx);
    if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
    return ctx;
}
