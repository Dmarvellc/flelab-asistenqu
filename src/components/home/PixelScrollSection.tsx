"use client"

import { useRef, useMemo, useState, type ReactNode } from "react"
import { useScroll, useTransform, useMotionValueEvent } from "framer-motion"

const COLS = 36
const ROWS = 10
const TOTAL = COLS * ROWS

function seededShuffle(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const x = Math.abs(Math.sin(i * 9301 + 49297) * 233280)
    const j = Math.floor((x % 1) * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function PixelScrollSection({
  children,
  className = "",
  pixelColor = "#2563eb",
  maxFill = 0.78,
  id,
}: {
  children: ReactNode
  className?: string
  pixelColor?: string
  maxFill?: number
  id?: string
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const [fillCount, setFillCount] = useState(0)

  const pixelOrder = useMemo(() => seededShuffle(TOTAL), [])
  const rankOf = useMemo(() => {
    const r = new Array<number>(TOTAL)
    pixelOrder.forEach((cellIdx, rank) => { r[cellIdx] = rank })
    return r
  }, [pixelOrder])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  })

  const fillMotion = useTransform(scrollYProgress, [0, 1], [0, TOTAL * maxFill])

  useMotionValueEvent(fillMotion, "change", (v) => {
    setFillCount(Math.round(v))
  })

  return (
    <section ref={sectionRef} id={id} className={`relative overflow-hidden bg-gray-50 ${className}`}>
      {/* Pixel grid background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {Array.from({ length: TOTAL }, (_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: rankOf[i] < fillCount ? pixelColor : undefined,
              outline: "1px solid rgba(0,0,0,0.045)",
              transition: "background-color 0.18s ease",
            }}
          />
        ))}
      </div>

      {/* Content sits above pixel layer */}
      <div className="relative z-10">{children}</div>
    </section>
  )
}
