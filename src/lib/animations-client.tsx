
"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"

export const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
}

export const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
}

export function FadeInDiv({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <motion.div initial="initial" animate="animate" variants={fadeIn} className={className}>
            {children}
        </motion.div>
    )
}

export function StaggerDiv({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <motion.div initial="initial" animate="animate" variants={staggerContainer} className={className}>
            {children}
        </motion.div>
    )
}

export function FadeInCard({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <motion.div variants={fadeIn}>
            <Card className={className}>
                {children}
            </Card>
        </motion.div>
    )
}
