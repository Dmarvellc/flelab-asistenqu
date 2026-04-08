"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DoctorsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/agent/network")
  }, [router])
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
    </div>
  )
}
