import { NextResponse } from "next/server";
import { getAgentMetrics } from "@/services/agent-metrics";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.userId;

  try {
    const metrics = await getAgentMetrics(userId);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Fetch metrics failed", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
