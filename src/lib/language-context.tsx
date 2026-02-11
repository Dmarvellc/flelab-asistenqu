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
        notFoundTitle: "Page Not Found",
        notFoundDesc: "Sorry, the page you are looking for could not be found or has been moved.",
        backHome: "Back to Home",
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

        // Not Found - keeping the simple message requested
        notFoundTitle: "Halaman Tidak Ditemukan",
        notFoundDesc: "Maaf, halaman yang Anda cari tidak dapat ditemukan atau telah dipindahkan.",
        backHome: "Kembali ke Beranda",
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
