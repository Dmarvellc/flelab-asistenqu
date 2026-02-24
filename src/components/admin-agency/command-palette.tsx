"use client";

import React, { useEffect, useState } from "react";
import { Search, LayoutDashboard, Users, FileText, GitPullRequest, Trophy, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export function CommandPalette({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: React.Dispatch<React.SetStateAction<boolean>> }) {
    const [query, setQuery] = useState("");
    const router = useRouter();

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
        { type: "page", name: "Dashboard", href: "/admin-agency", icon: LayoutDashboard, keywords: ["home", "beranda", "dasbor", "dashboard", "awal", "main"] },
        { type: "page", name: "Agents", href: "/admin-agency/agents", icon: Users, keywords: ["agen", "agents", "pengguna", "orang", "people"] },
        { type: "page", name: "Clients", href: "/admin-agency/clients", icon: Users, keywords: ["klien", "clients", "nasabah", "pasien", "customer"] },
        { type: "page", name: "Claims", href: "/admin-agency/claims", icon: FileText, keywords: ["klaim", "claims", "asuransi", "insurance", "pengajuan"] },
        { type: "page", name: "Transfer Requests", href: "/admin-agency/transfers", icon: GitPullRequest, keywords: ["transfer", "pindah", "pindah agen", "request"] },
        { type: "page", name: "Performa Agen", href: "/admin-agency/performance", icon: Trophy, keywords: ["performa", "performance", "kinerja", "prestasi", "agen"] },
        { type: "page", name: "Settings", href: "/admin-agency/settings", icon: Settings, keywords: ["pengaturan", "settings", "profil", "profile", "akun", "account"] },
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
                        placeholder="Ketik perintah atau cari..."
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
                            Tidak ada hasil yang ditemukan untuk {query}.
                        </div>
                    ) : (
                        <div className="px-2">
                            <div className="text-xs font-semibold text-gray-400 mb-2 px-2 mt-2 uppercase tracking-wider">
                                PERGI KE HALAMAN
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
