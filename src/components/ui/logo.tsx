import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  height?: number
  className?: string
  light?: boolean
  priority?: boolean
}

export function Logo({ height = 32, className, light = false, priority = false }: LogoProps) {
  const width = Math.round(height * (243 / 176))
  return (
    <Image
      src="/m_logotext.png"
      alt="AsistenQu"
      width={width}
      height={height}
      className={cn("object-contain", light && "invert", className)}
      priority={priority}
    />
  )
}
