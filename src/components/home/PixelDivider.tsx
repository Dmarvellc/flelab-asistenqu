"use client"

import { useRef, useMemo, useState } from "react"
import { useScroll, useTransform, useMotionValueEvent } from "framer-motion"

function generatePixelRanks(total: number, cols: number, rows: number): number[] {
  const pixels = Array.from({ length: total }, (_, i) => {
    const row = Math.floor(i / cols)
    const x = Math.abs(Math.sin(i * 9301 + 49297) * 233280)
    const randomVal = x % 1
    
    // Bias the score so that higher rows (bottom) get lower scores.
    // Lower scores will be assigned lower ranks, meaning they fill first.
    // This perfectly attaches the pixels to the bottom section seamlessly.
    const bias = 1.2 
    const score = randomVal - (row / rows) * bias
    
    return { index: i, score }
  })
  
  pixels.sort((a, b) => a.score - b.score)
  
  const rankOf = new Array<number>(total)
  pixels.forEach((p, rank) => {
    rankOf[p.index] = rank
  })
  
  return rankOf
}

interface PixelDividerProps {
  fromClassName?: string // Tailwind class for the top section's background, e.g. "bg-white"
  pixelClassName?: string // Tailwind class for the pixels, e.g. "bg-blue-600"
  maxFill?: number
}

function GridRenderer({ 
  cols, 
  rows, 
  fromClassName, 
  pixelClassName, 
  maxFill,
  className 
}: { 
  cols: number; 
  rows: number; 
  fromClassName: string; 
  pixelClassName: string; 
  maxFill: number;
  className?: string;
}) {
  const TOTAL = cols * rows
  const ref = useRef<HTMLDivElement>(null)
  const [fillCount, setFillCount] = useState(0)

  const rankOf = useMemo(() => generatePixelRanks(TOTAL, cols, rows), [TOTAL, cols, rows])

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  // Start filling slightly later and end slightly earlier to make it feel more concentrated
  const fill = useTransform(scrollYProgress, [0.2, 0.8], [0, TOTAL * maxFill])

  useMotionValueEvent(fill, "change", (v) => {
    setFillCount(Math.round(v))
  })

  return (
    <div
      ref={ref}
      aria-hidden="true"
      // Add a slight negative bottom margin and drop "relative" so the subsequent static section paints OVER this 1px gap!
      className={`w-full overflow-hidden -mb-px ${fromClassName} ${className || ""}`}
      style={{
        aspectRatio: `${cols} / ${rows}`,
        width: "100%",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {Array.from({ length: TOTAL }, (_, i) => {
        const isFilled = rankOf[i] < fillCount
        return (
          <div
            key={i}
            className={isFilled ? pixelClassName : "bg-transparent"}
            // Scale slightly to overlap sub-pixel grid gaps (which causes the faint border lines)
            style={isFilled ? { transform: "scale(1.05)" } : undefined}
          />
        )
      })}
    </div>
  )
}

export function PixelDivider({
  fromClassName = "bg-white",
  pixelClassName = "bg-blue-600",
  maxFill = 0.82,
}: PixelDividerProps) {
  return (
    <>
      <GridRenderer
        cols={10}
        rows={3}
        fromClassName={fromClassName}
        pixelClassName={pixelClassName}
        maxFill={maxFill}
        className="grid sm:hidden"
      />
      <GridRenderer
        cols={28}
        rows={5}
        fromClassName={fromClassName}
        pixelClassName={pixelClassName}
        maxFill={maxFill}
        className="hidden sm:grid"
      />
    </>
  )
}
