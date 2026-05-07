import { redirect } from "next/navigation"

// The dedicated overseas/Generali directory has been merged into the main
// /agent/network marketplace as the "Generali Network" tab. This route now
// redirects to the unified page.
export default function OverseasRedirect() {
  redirect("/agent/network")
}
