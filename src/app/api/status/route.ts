import { NextResponse } from "next/server"
import { runStatusChecks } from "@/lib/status-checks"

export { type ServiceStatus, type HistoryPoint, type ServiceCheck } from "@/lib/status-checks"
export type { StatusResult as StatusResponse } from "@/lib/status-checks"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const data = await runStatusChecks()
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, no-cache" },
  })
}
