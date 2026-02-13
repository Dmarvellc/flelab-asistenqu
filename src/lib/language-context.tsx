"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "id";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations = {
    en: {
        // Navbar
        features: "Features",
        pricing: "Pricing",
        about: "About",
        start: "Get Started",

        // Footer
        product: "Product",
        resources: "Resources",
        legal: "Legal",
        blog: "Blog",
        help: "Help Center",
        status: "Status",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
        integrations: "Integrations",
        copyright: "All rights reserved.",
        solution: "Empowering operations and analytics with a premium, multi-dashboard workspace.",

        // Not Found
        notFoundTitle: "Ouch, found nothing :(",
        notFoundDesc: "Looks like you're in the wrong place",
        backHome: "Back to main menu",
        backPrev: "Previous Page"
    },
    id: {
        // Navbar
        features: "Fitur",
        pricing: "Harga",
        about: "Tentang",
        start: "Mulai Sekarang",

        // Footer
        product: "Produk",
        resources: "Sumber Daya",
        legal: "Legal",
        blog: "Blog",
        help: "Pusat Bantuan",
        status: "Status",
        privacy: "Kebijakan Privasi",
        terms: "Syarat dan Ketentuan",
        integrations: "Integrasi",
        copyright: "Hak cipta dilindungi undang-undang.",
        solution: "Memberdayakan operasi dan analitik dengan ruang kerja multi-dashboard premium.",

        // Not Found
        notFoundTitle: "Waduh ga dapat apa-apa :(",
        notFoundDesc: "Sepertinya kamu ketempat yang salah",
        backHome: "Kembali ke menu utama",
        backPrev: "Halaman Sebelumnya"
    }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>("en");

    const t = (key: string) => {
        // @ts-ignore
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
