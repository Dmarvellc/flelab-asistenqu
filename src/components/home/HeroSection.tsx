"use client"

import { motion, useMotionValue, useSpring, useTransform } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useRef, useCallback } from "react"

const BANNER_URL =
  "https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/banner.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9iYW5uZXIucG5nIiwiaWF0IjoxNzc1Mjk0NzUxLCJleHAiOjMxNzEwMzc1ODc1MX0.kPrJMHeErVniycoM1Ryhrs4cLajzW2-RnCSchTEhnjg"

const ease = [0.16, 1, 0.3, 1] as const

/* Graph-paper grid pattern for the hero background */
const GRID_BG: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
}

function StatsCard() {
  const cardRef = useRef<HTMLDivElement>(null)

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  const rotateX = useSpring(rawX, { stiffness: 180, damping: 22 })
  const rotateY = useSpring(rawY, { stiffness: 180, damping: 22 })

  // glare position follows cursor
  const glareX = useTransform(rotateY, [-15, 15], ["0%", "100%"])
  const glareY = useTransform(rotateX, [12, -12], ["0%", "100%"])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const cx = (e.clientX - left) / width  - 0.5   // -0.5 → 0.5
    const cy = (e.clientY - top)  / height - 0.5
    rawY.set(cx * 28)   // left/right tilt
    rawX.set(-cy * 20)  // up/down tilt
  }, [rawX, rawY])

  const handleMouseLeave = useCallback(() => {
    rawX.set(0)
    rawY.set(0)
  }, [rawX, rawY])

  return (
    <motion.div
      ref={cardRef}
      className="hidden lg:block"
      style={{ perspective: "900px" }}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.965 }}
    >
      <motion.div
        className="flex flex-col gap-0 border border-blue-100/80 bg-white/60 backdrop-blur-sm relative overflow-hidden"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          boxShadow: "0 24px 60px -12px rgba(37,99,235,0.18), 0 8px 20px -6px rgba(0,0,0,0.08)",
        }}
      >
        {/* Moving glare overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: useTransform(
              [glareX, glareY],
              ([gx, gy]) =>
                `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.22) 0%, transparent 65%)`
            ),
          }}
        />

        {/* #1 hero row */}
        <div className="px-8 py-7 border-b border-blue-100/60 bg-blue-600 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <p className="relative text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200 mb-1">Platform Asuransi</p>
          <div className="relative flex items-end gap-3">
            <span className="font-black text-white leading-none tracking-tight" style={{ fontSize: "clamp(56px, 8vw, 88px)" }}>
              #1
            </span>
            <span className="text-blue-200 text-sm font-medium mb-3 leading-snug max-w-[140px]">
              di Indonesia untuk ekosistem asuransi digital
            </span>
          </div>
        </div>

        {/* Stat rows */}
        {[
          { value: "10.000+", label: "Agen Aktif",        sub: "di seluruh Indonesia" },
          { value: "350+",    label: "Rumah Sakit Mitra", sub: "jaringan klaim terintegrasi" },
          { value: "2 Juta+", label: "Klaim Diproses",    sub: "akurasi 98,6%" },
        ].map((s, i, arr) => (
          <div
            key={s.label}
            className={`flex items-center gap-5 px-8 py-5 ${i < arr.length - 1 ? "border-b border-blue-100/60" : ""} group hover:bg-blue-50/40 transition-colors duration-200`}
          >
            <div className="w-1 self-stretch bg-blue-600 shrink-0 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">{s.label}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
            <p className="font-black text-blue-600 tracking-tight tabular-nums shrink-0" style={{ fontSize: "clamp(22px, 3vw, 30px)" }}>
              {s.value}
            </p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

export function HeroSection() {
  return (
    <section
      className="relative sm:min-h-screen flex items-start bg-white overflow-hidden"
      style={GRID_BG}
    >
      {/* Radial fade-out so center stays clean and edges stay gridded */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_40%,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.55)_60%,transparent_100%)] pointer-events-none" />

      {/* Text + right panel */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-48 sm:pt-56 pb-24 sm:pb-28 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left: headline */}
        <div>
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

        {/* Right: 3D stats card */}
        <StatsCard />

      </div>
    </section>
  )
}
