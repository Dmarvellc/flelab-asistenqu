"use client"

import { useEffect, useRef, useState } from "react"

export function AnimatedStep({
  number,
  title,
  desc,
  delay = 0,
}: {
  number: string
  title: string
  desc: string
  delay?: number
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <p
        className="text-[108px] font-black leading-none mb-6 select-none tracking-tighter bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-400 bg-clip-text text-transparent"
      >
        {number}
      </p>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}
