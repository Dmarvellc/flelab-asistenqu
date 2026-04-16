"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Menu, X, Globe, ChevronDown } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Navbar() {
    const { t, language, setLanguage } = useLanguage();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const navLinks = [
        { label: "Solusi", href: "#solutions" },
        { label: "Fitur", href: "#features" },
        { label: "Cara Kerja", href: "#how" },
    ];

    const portalLinks = [
        { label: "Portal Agen", href: "/agent/login", color: "text-blue-600" },
        { label: "Portal Agensi", href: "/admin-agency/login", color: "text-violet-600" },
        { label: "Portal Rumah Sakit", href: "/hospital/login", color: "text-emerald-600" },
    ];

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
            scrolled
                ? "bg-black/90 backdrop-blur-xl border-b border-white/8"
                : "bg-transparent"
        )}>
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="text-xl font-extrabold tracking-tighter text-white hover:opacity-80 transition-opacity">
                    AsistenQu
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                    {navLinks.map(link => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}

                    {/* Masuk dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 text-white/70 hover:text-white transition-colors">
                                Masuk <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            {portalLinks.map(p => (
                                <DropdownMenuItem key={p.label} asChild>
                                    <Link href={p.href} className={cn("font-medium", p.color)}>
                                        {p.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Language */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 px-0 text-white/50 hover:text-white">
                                <Globe className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLanguage("id")}>
                                Indonesia {language === "id" && "✓"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLanguage("en")}>
                                English {language === "en" && "✓"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Mobile toggle */}
                <button
                    className="md:hidden text-white p-1"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden bg-black/98 border-t border-white/10 px-6 py-6 space-y-4">
                    {navLinks.map(link => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="block text-white/70 hover:text-white font-medium py-1"
                            onClick={() => setMobileOpen(false)}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div className="border-t border-white/10 pt-4 space-y-2">
                        {portalLinks.map(p => (
                            <Link
                                key={p.label}
                                href={p.href}
                                className={cn("block font-semibold py-1", p.color)}
                                onClick={() => setMobileOpen(false)}
                            >
                                {p.label}
                            </Link>
                        ))}
                    </div>
                    <Link
                        href="#contact"
                        className="block w-full text-center px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold transition-colors mt-2"
                        onClick={() => setMobileOpen(false)}
                    >
                        Hubungi Kami
                    </Link>
                </div>
            )}
        </nav>
    )
}
