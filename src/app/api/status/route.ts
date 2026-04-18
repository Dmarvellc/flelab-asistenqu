import { NextResponse } from "next/server"
import { runStatusChecks } from "@/lib/status-checks"
import { logError } from "@/lib/logger"

export { type ServiceStatus, type HistoryPoint, type ServiceCheck } from "@/lib/status-checks"
export type { StatusResult as StatusResponse } from "@/lib/status-checks"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const data = await runStatusChecks()
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache" },
    })
  } catch (error) {
    logError("api.status", error, {
      requestPath: "/api/status",
      requestMethod: "GET",
      isPublicFacing: true,
    })
    return NextResponse.json({ error: "Status check failed" }, { status: 500 })
  }
}
