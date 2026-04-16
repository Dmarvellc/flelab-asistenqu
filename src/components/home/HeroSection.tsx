"use client"

import { motion } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const BANNER_URL =
  "https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/banner.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9iYW5uZXIucG5nIiwiaWF0IjoxNzc1Mjk0NzUxLCJleHAiOjMxNzEwMzc1ODc1MX0.kPrJMHeErVniycoM1Ryhrs4cLajzW2-RnCSchTEhnjg"

const ease = [0.16, 1, 0.3, 1] as const

/* Graph-paper grid pattern for the hero background */
const GRID_BG: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
}

export function HeroSection() {
  return (
    <section
      className="relative sm:min-h-screen flex items-start bg-white overflow-hidden"
      style={GRID_BG}
    >
      {/* Radial fade-out so center stays clean and edges stay gridded */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_40%,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.55)_60%,transparent_100%)] pointer-events-none" />

      {/* Right vignette — blends banner edge into the grid bg */}
      <div className="absolute inset-y-0 right-0 w-[30%] bg-gradient-to-l from-white/60 to-transparent pointer-events-none" />

      {/* Text block */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-48 sm:pt-56 pb-24 sm:pb-28">
        <div className="max-w-full sm:max-w-[52%]">
          <motion.h1
            className="font-black text-gray-900 leading-[0.95] tracking-[-0.03em] mb-6 sm:mb-12"
            style={{ fontSize: "clamp(32px, 8vw, 112px)" }}
            initial={{ opacity: 0, y: 56 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, ease }}
          >
            Satu platform.
            <br />
            <span className="text-blue-600">Seluruh ekosistem.</span>
          </motion.h1>

          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-end gap-6 sm:gap-16"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease, delay: 0.22 }}
          >
            <p className="text-gray-500 text-sm sm:text-base leading-[1.7] sm:leading-[1.8] max-w-[280px] sm:max-w-[260px]">
              Menghubungkan agensi, agen, dan rumah sakit
              dalam satu workspace yang cerdas.
            </p>
            <Link
              href="#contact"
              className="group inline-flex items-center gap-2 text-gray-400 hover:text-gray-800 text-sm font-medium transition-colors duration-300 border-b border-gray-200 hover:border-gray-500 pb-0.5 whitespace-nowrap"
            >
              Hubungi kami
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
