"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { MarketingLayout } from "@/components/home/marketing-layout";

function NotFoundContent() {
    const router = useRouter();
    const { t } = useLanguage();

    return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-background text-foreground p-4 min-h-[60vh]">
            <div className="relative flex max-w-md flex-col items-center justify-center space-y-6 text-center">
                {/* Abstract Background Element */}
                <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-5 blur-3xl pointer-events-none">
                    <div className="h-64 w-64 rounded-full bg-primary/50" />
                </div>

                {/* Text Content */}
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards">
                    <div className="space-y-2 relative z-10">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            {t("notFoundTitle")}
                        </h2>
                        <p className="text-muted-foreground text-base leading-relaxed max-w-[360px] mx-auto">
                            {t("notFoundDesc")}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col w-full gap-3 sm:flex-row sm:justify-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-backwards">
                    <Button asChild size="lg" className="w-full sm:w-auto font-medium transition-all active:scale-95 shadow-md hover:shadow-lg">
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            {t("backHome")}
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => router.back()}
                        className="w-full sm:w-auto font-medium transition-all active:scale-95 hover:bg-muted/80"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("backPrev")}
                    </Button>
                </div>
            </div>

            {/* Footer text */}
            <div className="mt-12 text-[10px] text-muted-foreground/40 font-mono tracking-widest uppercase">
                Error Code: 404_PAGE_NOT_FOUND
            </div>
        </div>
    );
}

export default function NotFound() {
    return (
        <LanguageProvider>
            <MarketingLayout>
                <NotFoundContent />
            </MarketingLayout>
        </LanguageProvider>
    );
}
