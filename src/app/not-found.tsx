"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/home/marketing-layout";
import { ArrowLeft } from "lucide-react";
import { LanguageProvider } from "@/lib/language-context";

export default function NotFound() {
    return (
        <LanguageProvider>
            <MarketingLayout>
                <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] w-full p-6 mb-6 text-center animate-in fade-in duration-500">
                    <div className="relative w-160 h-80 mb-6">
                        <Image
                            src="https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_404.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tXzQwNC5wbmciLCJpYXQiOjE3NzA4ODIzOTksImV4cCI6NDg5Mjk0NjM5OX0.8v0KDeykHJiS3TIceSk8PbM9lA_GvEdsPJG_V2i_wgM"
                            alt="404 Mascot"
                            fill
                            className="object-contain drop-shadow-xl"
                            priority
                        />
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-foreground">Waduh ga dapat apa-apa :(</h1>
                    <p className="text-muted-foreground mb-8 text-lg font-medium">Sepertinya kamu di tempat yang salah</p>

                    <Button asChild size="lg" className="rounded-full px-8 h-12 text-base shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Kembali ke menu utama
                        </Link>
                    </Button>
                </div>
            </MarketingLayout>
        </LanguageProvider>
    );
}
