import { NextResponse } from "next/server";
import {
  activityFeed,
  budgetTargets,
  growthSignals,
  metrics,
  revenueByRegion,
  tasks,
  transactions,
} from "@/lib/dashboard-data";

export function GET() {
  return NextResponse.json({
    metrics,
    revenueByRegion,
    growthSignals,
    activityFeed,
    tasks,
    transactions,
    budgetTargets,
    generatedAt: new Date().toISOString(),
  });
}
