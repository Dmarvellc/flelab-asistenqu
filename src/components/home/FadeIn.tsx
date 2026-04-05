"use client"

import { motion } from "motion/react"
import type { ReactNode } from "react"

const ease = [0.16, 1, 0.3, 1] as const

interface FadeInProps {
  children: ReactNode
  className?: string
  delay?: number
  /** slide distance in px (default 28) */
  y?: number
  /** use x slide instead of y (for horizontal reveal) */
  x?: number
}

/** Single element fade-in on scroll */
export function FadeIn({ children, className, delay = 0, y = 28, x = 0 }: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.75, ease, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Stagger children with sequential delays */
export function StaggerFadeIn({
  children,
  className,
  stagger = 0.1,
  initialDelay = 0,
}: {
  children: ReactNode[]
  className?: string
  stagger?: number
  initialDelay?: number
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.65, ease, delay: initialDelay + i * stagger }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

/** Heading + sub-text reveal (heading first, then sub with slight delay) */
export function FadeInHeading({
  heading,
  sub,
  headingClass = "",
  subClass = "",
}: {
  heading: ReactNode
  sub?: ReactNode
  headingClass?: string
  subClass?: string
}) {
  return (
    <>
      <motion.div
        className={headingClass}
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease }}
      >
        {heading}
      </motion.div>
      {sub && (
        <motion.div
          className={subClass}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
        >
          {sub}
        </motion.div>
      )}
    </>
  )
}
