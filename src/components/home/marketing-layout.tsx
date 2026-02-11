"use client";

import { useLanguage } from "@/lib/language-context";
import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import React from "react";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
    // Using useLanguage hook here just to ensure context is available 
    // if we needed to pass props, but Navbar and Footer consume it directly.
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Navbar />
            <main className="flex-1 pt-24 bg-white">
                {children}
            </main>
            <Footer />
        </div>
    );
}
