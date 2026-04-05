"use client"

import { motion } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const BANNER_URL =
  "https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/banner.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9iYW5uZXIucG5nIiwiaWF0IjoxNzc1Mjk0NzUxLCJleHAiOjMxNzEwMzc1ODc1MX0.kPrJMHeErVniycoM1Ryhrs4cLajzW2-RnCSchTEhnjg"

const ease = [0.16, 1, 0.3, 1] as const

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-start bg-[#080808] overflow-hidden">

      {/* Banner — fills the right side, larger */}
      <motion.div
        className="absolute right-0 inset-y-0 w-[72%] pointer-events-none select-none"
        initial={{ opacity: 0, x: 48, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 1.2, ease, delay: 0.1 }}
      >
        <Image
          src={BANNER_URL}
          alt="AsistenQu"
          fill
          className="object-contain object-right-center"
          priority
        />
      </motion.div>

      {/* Left vignette */}
      <div className="absolute inset-y-0 left-0 w-[52%] bg-gradient-to-r from-[#080808] via-[#080808]/90 to-transparent pointer-events-none" />

      {/* Text block — explicit top padding for clear navbar gap */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-52 pb-28">
        <div className="max-w-[50%]">

          <motion.h1
            className="font-black text-white leading-[0.92] tracking-[-0.04em] mb-12"
            style={{ fontSize: "clamp(54px, 7.8vw, 112px)" }}
            initial={{ opacity: 0, y: 56 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, ease }}
          >
            Satu platform.
            <br />
            <span className="text-blue-400">Seluruh ekosistem.</span>
          </motion.h1>

          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-end gap-10 sm:gap-16"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease, delay: 0.22 }}
          >
            <p className="text-white/35 text-base leading-[1.8] max-w-[260px]">
              Menghubungkan agensi, agen, dan rumah sakit
              dalam satu workspace yang cerdas.
            </p>
            <Link
              href="#contact"
              className="group inline-flex items-center gap-2 text-white/50 hover:text-white/90 text-sm font-medium transition-colors duration-300 border-b border-white/15 hover:border-white/40 pb-0.5 whitespace-nowrap"
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
