"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export function Footer() {
    const { t } = useLanguage();

    return (
        <footer className="bg-black text-white/80 py-16 px-6 border-t border-white/10">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">AsistenQu</h3>
                    <p className="text-sm max-w-sm">
                        {t("solution")}
                    </p>
                </div>

                <div>
                    <h4 className="font-semibold text-white mb-4">{t("product")}</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="#" className="hover:text-white transition-colors">{t("features")}</Link></li>
                        <li><Link href="#" className="hover:text-white transition-colors">{t("pricing")}</Link></li>
                        <li><Link href="#" className="hover:text-white transition-colors">{t("integrations")}</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-white mb-4">{t("resources")}</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="#" className="hover:text-white transition-colors">{t("blog")}</Link></li>
                        <li><Link href="#" className="hover:text-white transition-colors">{t("help")}</Link></li>
                        <li><Link href="#" className="hover:text-white transition-colors">{t("status")}</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-white mb-4">{t("legal")}</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="#" className="hover:text-white transition-colors">{t("privacy")}</Link></li>
                        <li><Link href="#" className="hover:text-white transition-colors">{t("terms")}</Link></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 text-center text-sm text-white/50">
                © {new Date().getFullYear()} AsistenQu. {t("copyright")}
            </div>
        </footer>
    )
}
