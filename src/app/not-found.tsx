"use client";

import Link from "next/link";
import Image from "next/image";
import { LanguageProvider } from "@/lib/language-context";
import { Navbar } from "@/components/home/Navbar";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
    return (
        <LanguageProvider>
            <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
                    <div className="relative w-64 h-52 mb-8 opacity-90">
                        <Image
                            src="https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_404.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tXzQwNC5wbmciLCJpYXQiOjE3NzA4ODIzOTksImV4cCI6NDg5Mjk0NjM5OX0.8v0KDeykHJiS3TIceSk8PbM9lA_GvEdsPJG_V2i_wgM"
                            alt="404"
                            fill
                            className="object-contain drop-shadow-2xl"
                            priority
                        />
                    </div>

                    <p className="text-white/20 text-xs font-bold uppercase tracking-[0.25em] mb-4">404</p>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
                        Waduh, ga ketemu nih.
                    </h1>
                    <p className="text-white/35 mb-10 text-base max-w-sm">
                        Halaman yang kamu cari tidak ada atau sudah dipindahkan.
                    </p>

                    <Link
                        href="/"
                        className="inline-flex items-center gap-2.5 bg-white/8 hover:bg-white/14 border border-white/12 text-white font-semibold px-7 py-3.5 rounded-2xl transition-colors duration-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Kembali ke beranda
                    </Link>
                </div>
            </div>
        </LanguageProvider>
    );
}
