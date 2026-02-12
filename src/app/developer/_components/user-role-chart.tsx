"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface UserRoleChartProps {
  data: Record<string, number>;
}

export function UserRoleChart({ data }: UserRoleChartProps) {
  // Convert object to array and sort by count descending
  const chartData = useMemo(() => {
    return Object.entries(data)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const maxCount = useMemo(() => {
    return Math.max(...chartData.map((d) => d.count), 1); // Avoid division by zero
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chartData.map((item, index) => (
        <div key={item.role} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium capitalize">{item.role}</span>
            <span className="text-muted-foreground">{item.count} users</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(item.count / maxCount) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
