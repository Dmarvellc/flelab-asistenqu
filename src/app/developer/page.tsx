import { getAllClaims } from "@/services/claims"
import { DeveloperClientView } from "./client-view"

export default async function DeveloperDashboardPage() {
    const claims = await getAllClaims()

  return (
    <DeveloperClientView claims={claims} />
  )
}
