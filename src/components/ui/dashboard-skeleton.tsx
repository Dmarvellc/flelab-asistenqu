/**
 * Lightweight, dependency-free skeletons used by route-level loading.tsx files.
 * Each skeleton renders instantly so users see structure while async server
 * components fetch data — eliminating the "blank screen until queries finish"
 * lag that previously affected every dashboard.
 */

function Bar({ w = "100%", h = "0.75rem", className = "" }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={`bg-gray-100 rounded-md animate-pulse ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

function Card({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">{children}</div>
  );
}

export function DashboardSkeleton({ title = "Dashboard" }: { title?: string }) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 max-w-7xl">
      <div className="flex flex-col gap-2">
        <Bar w="9rem" h="0.625rem" />
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
        <Bar w="60%" h="0.75rem" />
      </div>

      {/* KPI grid */}
      <div className="grid gap-3 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <div className="flex flex-col gap-3">
              <Bar w="5rem" h="0.625rem" />
              <Bar w="3.5rem" h="1.5rem" />
              <Bar w="80%" h="0.5rem" />
            </div>
          </Card>
        ))}
      </div>

      {/* Chart + side panel */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Bar w="9rem" h="0.875rem" />
                <Bar w="4rem" h="0.625rem" />
              </div>
              <div className="h-56 bg-gray-50 rounded-lg animate-pulse" />
            </div>
          </Card>
        </div>
        <Card>
          <div className="flex flex-col gap-4">
            <Bar w="7rem" h="0.875rem" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Bar w="60%" h="0.5rem" />
                  <Bar w="40%" h="0.5rem" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="flex flex-col gap-3">
          <Bar w="8rem" h="0.875rem" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-3">
              <Bar w="100%" h="0.625rem" />
              <Bar w="100%" h="0.625rem" />
              <Bar w="100%" h="0.625rem" />
              <Bar w="100%" h="0.625rem" />
              <Bar w="100%" h="0.625rem" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function ListSkeleton({ title = "Loading", rows = 8 }: { title?: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 max-w-7xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
        <Bar w="40%" h="0.625rem" />
      </div>
      <Card>
        <div className="flex flex-col gap-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-3 items-center">
              <Bar w="100%" h="0.625rem" />
              <Bar w="100%" h="0.625rem" />
              <Bar w="100%" h="0.625rem" />
              <Bar w="100%" h="0.625rem" />
              <Bar w="100%" h="0.625rem" />
              <Bar w="100%" h="0.625rem" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
