/**
 * Page-accurate skeletons for admin-agency route loading.tsx files.
 * Each skeleton mirrors the real page structure so the layout shift on
 * hydration is imperceptible — no generic placeholders.
 */

function Bar({ w = "100%", h = "0.75rem", className = "" }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={`bg-gray-100 rounded-md animate-pulse ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

function Card({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function Badge() {
  return <div className="h-5 w-16 rounded-full bg-gray-100 animate-pulse" />;
}

/* ─── Dashboard (/) ─────────────────────────────────────────────── */
export function AgencyDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
        <div className="flex flex-col gap-3">
          <Bar w="14rem" h="2rem" />
          <Bar w="26rem" h="0.75rem" />
        </div>
        <div className="flex gap-3">
          <div className="h-11 w-32 rounded-xl bg-gray-900/10 animate-pulse" />
          <div className="h-11 w-36 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div className="h-14 w-14 rounded-2xl bg-gray-100 animate-pulse" />
            </div>
            <div className="flex flex-col gap-3">
              <Bar w="3rem" h="2.5rem" />
              <Bar w="6rem" h="0.75rem" />
            </div>
          </Card>
        ))}
      </div>

      {/* 2 action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div className="h-14 w-14 rounded-2xl bg-gray-100 animate-pulse" />
            </div>
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-3">
                <Bar w="3rem" h="2.5rem" />
                <Bar w="10rem" h="0.75rem" />
              </div>
              <Bar w="6rem" h="0.75rem" />
            </div>
          </Card>
        ))}
      </div>

      {/* Claims list card */}
      <Card>
        <div className="px-8 py-8 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-200 animate-pulse" />
            <Bar w="10rem" h="0.875rem" />
          </div>
          <Bar w="5rem" h="0.75rem" />
        </div>
        <div className="p-6 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 items-center py-1">
              <Bar h="0.625rem" />
              <Bar h="0.625rem" />
              <Bar h="0.625rem" />
              <Bar h="0.625rem" />
              <div className="flex justify-end"><Badge /></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Agents (/agents) ──────────────────────────────────────────── */
export function AgentsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-6 border-b border-gray-100">
        <Bar w="12rem" h="1.75rem" />
        <Bar w="28rem" h="0.75rem" />
      </div>

      {/* Invite panel placeholder */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse" />
            <div className="flex flex-col gap-2">
              <Bar w="8rem" h="0.75rem" />
              <Bar w="12rem" h="0.625rem" />
            </div>
          </div>
          <div className="h-9 w-28 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </Card>

      {/* Table card */}
      <Card>
        <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Bar w="8rem" h="0.875rem" />
            <Bar w="14rem" h="0.625rem" />
          </div>
        </div>
        {/* Column headers */}
        <div className="grid grid-cols-6 gap-4 px-6 py-3 border-b border-gray-50 bg-gray-50/50">
          {["7rem","8rem","5rem","6rem","8rem","4rem"].map((w, i) => (
            <Bar key={i} w={w} h="0.5rem" />
          ))}
        </div>
        {/* Rows */}
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 items-center px-6 py-4">
              <Bar w="80%" h="0.625rem" />
              <div className="flex flex-col gap-1.5">
                <Bar h="0.5rem" />
                <Bar w="70%" h="0.5rem" />
              </div>
              <Badge />
              <Bar w="5rem" h="0.5rem" />
              <div className="flex gap-2">
                <Bar w="3.5rem" h="0.5rem" />
                <Bar w="3.5rem" h="0.5rem" />
              </div>
              <div className="flex justify-end">
                <div className="h-7 w-16 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Claims (/claims) ──────────────────────────────────────────── */
export function ClaimsPageSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Bar w="10rem" h="1.75rem" />
        <Bar w="24rem" h="0.75rem" />
      </div>

      {/* Table card */}
      <Card>
        <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
          <div className="flex flex-col gap-2">
            <Bar w="8rem" h="0.875rem" />
            <Bar w="10rem" h="0.5rem" />
          </div>
        </div>
        <div className="p-6 flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 items-center py-1.5">
              <Bar h="0.625rem" />
              <Bar h="0.625rem" />
              <Bar h="0.625rem" />
              <Badge />
              <div className="flex justify-end"><div className="h-7 w-16 rounded-lg bg-gray-100 animate-pulse" /></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Clients (/clients) ────────────────────────────────────────── */
export function ClientsPageSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Bar w="11rem" h="1.75rem" />
        <Bar w="26rem" h="0.75rem" />
      </div>

      {/* Table card */}
      <Card>
        <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Bar w="8rem" h="0.875rem" />
            <Bar w="16rem" h="0.5rem" />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 items-center px-6 py-4">
              <div className="flex flex-col gap-1.5">
                <Bar h="0.625rem" />
                <Bar w="70%" h="0.5rem" />
              </div>
              <Bar h="0.5rem" />
              <Bar h="0.5rem" />
              <Badge />
              <div className="flex justify-end">
                <div className="h-7 w-20 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Transfers (/transfers) ────────────────────────────────────── */
export function TransfersPageSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Bar w="10rem" h="1.75rem" />
        <Bar w="24rem" h="0.75rem" />
      </div>

      {/* Table card */}
      <Card>
        <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Bar w="14rem" h="0.875rem" />
            <Bar w="16rem" h="0.5rem" />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 items-center px-6 py-4">
              <div className="flex flex-col gap-1.5">
                <Bar h="0.625rem" />
                <Bar w="60%" h="0.5rem" />
              </div>
              <Bar h="0.5rem" />
              <Bar h="0.5rem" />
              <Badge />
              <div className="flex justify-end gap-2">
                <div className="h-7 w-16 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-7 w-16 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Performance (/performance) ────────────────────────────────── */
export function PerformancePageSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Bar w="12rem" h="1.75rem" />
        <Bar w="22rem" h="0.75rem" />
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse" />
              <Bar w="6rem" h="0.625rem" />
            </div>
            <Bar w="4rem" h="1.75rem" />
          </Card>
        ))}
      </div>

      {/* Agent leaderboard table */}
      <Card>
        <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30">
          <Bar w="10rem" h="0.875rem" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Bar w="1.5rem" h="0.625rem" className="shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Bar w="60%" h="0.625rem" />
                <Bar w="40%" h="0.5rem" />
              </div>
              <Badge />
              <Bar w="3.5rem" h="0.5rem" />
              <Bar w="3.5rem" h="0.5rem" />
              <div className="h-6 w-6 rounded-full bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Team (/team) — used in-page for client-side loading ───────── */
export function TeamPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-300 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex flex-col gap-3">
          <Bar w="18rem" h="1.75rem" />
          <Bar w="28rem" h="0.75rem" />
          <Bar w="20rem" h="0.75rem" />
        </div>
        <div className="h-11 w-36 rounded-xl bg-gray-900/10 animate-pulse shrink-0" />
      </div>

      {/* 3 role stat badges */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
            <div className="h-10 w-10 rounded-xl bg-gray-100 animate-pulse" />
            <div className="flex flex-col gap-2">
              <Bar w="1.5rem" h="1.25rem" />
              <Bar w="4rem" h="0.5rem" />
            </div>
          </div>
        ))}
      </div>

      {/* Staff list card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-50 bg-gray-50/30">
          <Bar w="8rem" h="0.75rem" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-4">
              <div className="h-10 w-10 rounded-xl bg-gray-100 animate-pulse shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <Bar w="55%" h="0.625rem" />
                <Bar w="40%" h="0.5rem" />
              </div>
              <Badge />
              <Badge />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Claims Detail (/claims/[id]) ──────────────────────────────── */
export function ClaimDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Back + header */}
      <div className="flex flex-col gap-4 pb-6 border-b border-gray-100">
        <Bar w="5rem" h="0.625rem" />
        <div className="flex flex-col gap-3">
          <Bar w="16rem" h="1.75rem" />
          <Bar w="20rem" h="0.75rem" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Bar w="8rem" h="0.875rem" className="mb-5" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="flex flex-col gap-2">
                    <Bar w="5rem" h="0.5rem" />
                    <Bar h="0.75rem" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          <Card className="p-6">
            <Bar w="7rem" h="0.875rem" className="mb-4" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Bar w="60%" h="0.5rem" />
                    <Bar w="40%" h="0.5rem" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <Bar w="6rem" h="0.875rem" className="mb-4" />
            <div className="flex gap-3">
              <div className="h-10 flex-1 rounded-xl bg-gray-100 animate-pulse" />
              <div className="h-10 flex-1 rounded-xl bg-gray-900/10 animate-pulse" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Legacy exports — kept for any external references ─────────── */
export function DashboardSkeleton({ title = "Dashboard" }: { title?: string }) {
  void title;
  return <AgencyDashboardSkeleton />;
}

export function ListSkeleton({ title = "Loading", rows = 8 }: { title?: string; rows?: number }) {
  void title; void rows;
  return <ClaimsPageSkeleton />;
}
