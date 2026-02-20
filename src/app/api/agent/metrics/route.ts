import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAgentMetrics } from "@/services/agent-metrics";

export async function GET() {
  const cookieStore = await cookies();
  const userId =
    cookieStore.get("session_agent_user_id")?.value ??
    cookieStore.get("app_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const metrics = await getAgentMetrics(userId);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Fetch metrics failed", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
