import { DeveloperClientView } from "./client-view"

export const dynamic = "force-dynamic"

// IMPORTANT: do NOT fetch analytics on the server here.
// Previously this page made an SSR HTTP loopback fetch to /api/developer/analytics
// (12 SQL queries) before flushing any HTML, which blocked First Contentful Paint
// (Lighthouse reported NO_FCP) and left the page blank for several seconds.
// The client view already fetches its own data via /api/developer/analytics
// after mount, so we render the shell immediately with `initialData = null`.
export default function DeveloperDashboardPage() {
  return <DeveloperClientView initialData={null} />
}
