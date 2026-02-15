"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users } from "lucide-react";
import { UserRoleChart } from "./_components/user-role-chart";
import { ClaimsList } from "@/components/dashboard/claims-list";

export default function DeveloperDashboardPage() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    currentMonthUsers: number;
    growthPercentage: string;
    roleStats: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/developer/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Developer Console</h2>
        <p className="text-muted-foreground">
          Real-time system overview and analytics.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Jumlah Pending Account */}
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Jumlah Pending Account
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.pendingUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Menunggu persetujuan
            </p>
          </CardContent>
        </Card>

        {/* Total Users (Analisa) */}
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Active Users
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.activeUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pengguna aktif saat ini
            </p>
          </CardContent>
        </Card>

        {/* Role Analytics Graph */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>User Role Analytics</CardTitle>
            <CardDescription>
              Distribution of users by role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">Loading...</div>
            ) : (
                <UserRoleChart data={stats?.roleStats || {}} />
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6">
        <ClaimsList role="developer" />
      </div>
    </div>
  );
}
