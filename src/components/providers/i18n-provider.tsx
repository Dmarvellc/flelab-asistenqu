"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { dict, Language } from "@/lib/i18n";

type I18nContextType = {
    lang: Language;
    t: typeof dict.en;
    setLang: (lang: Language) => void;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Language>("en");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("agent_portal_lang") as Language;
        if (saved && (saved === "en" || saved === "id")) {
            setLangState(saved);
        }
        setMounted(true);
    }, []);

    const setLang = (l: Language) => {
        localStorage.setItem("agent_portal_lang", l);
        setLangState(l);
    };

    if (!mounted) {
        // Prevent hydration mismatch by rendering nothing strictly
        return null;
    }

    const value = {
        lang,
        t: dict[lang],
        setLang,
    };

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useTranslation must be used within an I18nProvider");
    }
    return context;
}
