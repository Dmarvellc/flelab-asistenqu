"use client"

import Link from "next/link"
import { Menu, Globe } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function Navbar() {
    const { t, language, setLanguage } = useLanguage();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black text-white border-b border-white/10 backdrop-blur-sm bg-opacity-90">
            <div className="flex items-center gap-2">
                <Link href="/" className="text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
                    AsistenQu
                </Link>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                <Link href="#features" className="hover:text-gray-300 transition-colors">{t("features")}</Link>
                <Link href="#pricing" className="hover:text-gray-300 transition-colors">{t("pricing")}</Link>
                <Link href="#about" className="hover:text-gray-300 transition-colors">{t("about")}</Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 px-0 text-white hover:text-gray-300">
                            <Globe className="h-4 w-4" />
                            <span className="sr-only">Toggle language</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLanguage("en")}>
                            English {language === "en" && "✓"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("id")}>
                            Indonesia {language === "id" && "✓"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Link href="/register" className="px-4 py-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors font-semibold">
                    {t("start")}
                </Link>
            </div>

            <button className="md:hidden text-white">
                <Menu className="w-6 h-6" />
            </button>
        </nav>
    )
}
