import { DeveloperClientView } from "./client-view"
import { headers } from "next/headers"

export const dynamic = "force-dynamic"

export default async function DeveloperDashboardPage() {
  const headersList = await headers()
  const host = headersList.get("host") || "localhost:3000"
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
  const cookieHeader = headersList.get("cookie") || ""
  
  let initialData = null
  try {
    const res = await fetch(`${protocol}://${host}/api/developer/analytics`, { 
      cache: "no-store", 
      headers: { cookie: cookieHeader } 
    })
    if (res.ok) initialData = await res.json()
  } catch(e) {}

  return <DeveloperClientView initialData={initialData} />
}
