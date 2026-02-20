import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ReferralPageClient from "./client-page";
import { getAgentReferralData } from "@/services/agent-referral";

export default async function ReferralPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_agent_user_id")?.value ?? cookieStore.get("app_user_id")?.value;

    if (!userId || userId.trim() === "") {
        redirect("/agent/login");
    }

    const initialData = await getAgentReferralData(userId).catch(() => null);

    return <ReferralPageClient initialData={initialData as any} />;
}
