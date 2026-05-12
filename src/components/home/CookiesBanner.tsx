"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export function CookiesBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("aq-cookies")
    if (!stored) {
      const t = setTimeout(() => setShow(true), 1800)
      return () => clearTimeout(t)
    }
  }, [])

  const dismiss = (value: "accepted" | "declined") => {
    localStorage.setItem("aq-cookies", value)
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md animate-slide-up">
        <div className="bg-[#111] border border-white/10 rounded-2xl px-6 py-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-white text-sm font-semibold mb-1">Preferensi kunjungan</p>
              <p className="text-white/35 text-xs leading-relaxed">
                Kami menyimpan pilihan sederhana di perangkat Anda agar pengalaman Anda lebih nyaman.{" "}
                <Link href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Lihat kebijakan
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => dismiss("accepted")}
              className="flex-1 bg-white hover:bg-white/90 text-black text-xs font-bold py-2.5 rounded-xl transition-colors"
            >
              Simpan Preferensi
            </button>
            <button
              onClick={() => dismiss("declined")}
              className="flex-1 bg-white/6 hover:bg-white/10 border border-white/8 text-white/50 hover:text-white/70 text-xs font-medium py-2.5 rounded-xl transition-colors"
            >
              Jangan Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
