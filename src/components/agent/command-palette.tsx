"use client";

import React, { useEffect, useState } from "react";
import { Search, LayoutDashboard, FileText, Users, CalendarCheck, ClipboardList, Stethoscope, Gift, Settings, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "../providers/i18n-provider";

export function CommandPalette({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: React.Dispatch<React.SetStateAction<boolean>> }) {
    const [query, setQuery] = useState("");
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [setIsOpen]);

    if (!isOpen) return null;

    const navItems = [
        { type: "page" as const, name: t.dashboard, href: "/agent", icon: LayoutDashboard, keywords: ["home", "beranda", "dasbor", "dashboard", "awal", "main"] },
        { type: "page" as const, name: t.clients, href: "/agent/clients", icon: Users, keywords: ["klien", "clients", "nasabah", "pasien", "customer", "orang", "people"] },
        { type: "page" as const, name: t.claims, href: "/agent/claims", icon: FileText, keywords: ["klaim", "claims", "asuransi", "insurance", "pengajuan"] },
        { type: "page" as const, name: t.appointments, href: "/agent/appointments", icon: CalendarCheck, keywords: ["jadwal", "dokter", "appointments", "schedule", "janji temu", "pertemuan"] },
        { type: "page" as const, name: t.requests, href: "/agent/requests", icon: ClipboardList, keywords: ["permintaan", "requests", "dokumen", "berkas", "file", "upload"] },
        { type: "page" as const, name: t.doctors, href: "/agent/doctors", icon: Stethoscope, keywords: ["dokter", "doctors", "medis", "medical", "rs", "rumah sakit", "hospital", "spesialis"] },
        { type: "page" as const, name: t.referral, href: "/agent/referral", icon: Gift, keywords: ["referral", "reward", "poin", "points", "invite", "undang", "hadiah", "tarik poin", "withdraw"] },
        { type: "page" as const, name: t.settings, href: "/agent/settings", icon: Settings, keywords: ["pengaturan", "settings", "profil", "profile", "akun", "account", "biodata", "ubah data"] },
        { type: "action" as const, name: t.newClaim || "Klaim Baru", href: "/agent/claims/new", icon: Plus, keywords: ["tambah klaim", "add claim", "buat klaim", "new claim", "create claim", "klaim baru", "+ klaim", "+ claim"] },
        { type: "action" as const, name: (t.addClient || "Tambah Klien").replace("+ ", ""), href: "/agent/clients/new", icon: Plus, keywords: ["tambah klien", "add client", "buat klien", "new client", "create client", "tambah nasabah", "+ klien", "+ client"] },
    ];

    const filteredItems = navItems.filter((item) => {
        const lowerQuery = query.toLowerCase();
        return item.name.toLowerCase().includes(lowerQuery) ||
            item.keywords.some(kw => kw.includes(lowerQuery));
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={() => setIsOpen(false)}
            />

            <div className="relative w-full max-w-xl animate-in fade-in zoom-in-95 bg-white shadow-2xl rounded-xl border border-gray-100 overflow-hidden ring-1 ring-black/5 mt-4 sm:mt-0 mx-4">
                <div className="flex items-center border-b border-gray-100 px-4">
                    <Search className="h-5 w-5 text-gray-400 shrink-0" />
                    <input
                        autoFocus
                        className="w-full flex-1 bg-transparent px-4 py-4 outline-none text-gray-900 placeholder:text-gray-400 text-base font-inter"
                        placeholder={t.searchPlaceholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <kbd className="hidden sm:inline-block rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-400">
                        ESC
                    </kbd>
                </div>

                <div className="max-h-[60vh] overflow-y-auto py-2">
                    {filteredItems.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                            {t.noResults}
                        </div>
                    ) : (
                        <div className="px-2">
                            <div className="text-xs font-semibold text-gray-400 mb-2 px-2 mt-2 uppercase tracking-wider">
                                {t.goToAction}
                            </div>
                            {filteredItems.map((page, idx) => (
                                <button
                                    key={page.href + idx}
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors group focus:bg-gray-50 focus:outline-none"
                                    onClick={() => {
                                        router.push(page.href);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className={page.type === "action" ? "bg-black p-2 rounded-md group-hover:shadow-sm transition-all text-white" : "bg-gray-100 p-2 rounded-md group-hover:bg-white group-hover:shadow-sm transition-all text-gray-500 group-hover:text-black"}>
                                        <page.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{page.name}</span>
                                        {page.type === "action" && <span className="text-[10px] text-gray-400 uppercase tracking-widest leading-tight">Aksi Cepat</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
