"use client"

/**
 * StickyPixelTransition
 *
 * Creates a sticky panel that sits between two sections.
 * As you scroll through, cells fill pixel-by-pixel from `fromColor` → `toColor`.
 * When pixels are 100% filled, the panel is visually identical to the next
 * section's background → seamless transition into the next section.
 *
 * Place it directly between two sections in the DOM:
 *   <SectionA bg="white" />
 *   <StickyPixelTransition fromColor="#ffffff" toColor="#080808" />
 *   <SectionB bg="#080808" />
 */

import { useRef, useMemo, useState } from "react"
import { useScroll, useTransform, useMotionValueEvent } from "framer-motion"

const COLS = 72
const ROWS = 40
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

export function StickyPixelTransition({
  fromColor = "#ffffff",
  toColor = "#080808",
  scrollHeight = "250vh",
}: {
  /** Background color of the PREVIOUS section */
  fromColor?: string
  /** Background color of the NEXT section (pixel fill color) */
  toColor?: string
  /** Height of the outer scroll container — controls how long the animation lasts */
  scrollHeight?: string
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [fillCount, setFillCount] = useState(0)

  const pixelOrder = useMemo(() => seededShuffle(TOTAL), [])
  const rankOf = useMemo(() => {
    const r = new Array<number>(TOTAL)
    pixelOrder.forEach((idx, rank) => { r[idx] = rank })
    return r
  }, [pixelOrder])

  // Track scroll from when outer div enters viewport to when it exits
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start end", "end start"],
  })

  // Fill pixels from 15% to 80% of the scroll range
  // — this ensures the fill starts after the panel is fully visible
  //   and finishes before it exits, so the transition feels synchronous
  const fillMotion = useTransform(scrollYProgress, [0.15, 0.8], [0, TOTAL])

  useMotionValueEvent(fillMotion, "change", (v) => {
    setFillCount(Math.round(Math.max(0, v)))
  })

  // Determine grid line color based on fromColor luminance
  const isDarkFrom =
    fromColor === "#080808" ||
    fromColor.startsWith("#0") ||
    fromColor.startsWith("#1") ||
    fromColor === "black"
  const gridLineColor = isDarkFrom
    ? "rgba(255,255,255,0.05)"
    : "rgba(0,0,0,0.055)"

  return (
    <div
      ref={outerRef}
      aria-hidden="true"
      style={{ height: scrollHeight, position: "relative" }}
    >
      {/* Sticky viewport-sized panel */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          // Background = fromColor, grid lines visible as background pattern
          backgroundColor: fromColor,
          backgroundImage: [
            `linear-gradient(${gridLineColor} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${gridLineColor} 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: `${(100 / COLS).toFixed(5)}% ${(100 / ROWS).toFixed(5)}%`,
          // Pixel cells as grid children
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {Array.from({ length: TOTAL }, (_, i) => (
          <div
            key={i}
            style={{
              backgroundColor:
                rankOf[i] < fillCount ? toColor : undefined,
              transition: "background-color 0.14s ease",
            }}
          />
        ))}
      </div>
    </div>
  )
}
