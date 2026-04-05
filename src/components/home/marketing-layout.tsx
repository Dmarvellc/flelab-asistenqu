"use client";

import { useLanguage } from "@/lib/language-context";
import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { CookiesBanner } from "@/components/home/CookiesBanner";
import React from "react";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
    useLanguage();
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Navbar />
            <main className="flex-1 bg-white">
                {children}
            </main>
            <Footer />
            <CookiesBanner />
        </div>
    );
}
