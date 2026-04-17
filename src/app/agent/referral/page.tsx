import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ReferralPageClient from "./client-page";
import { getAgentReferralData } from "@/services/agent-referral";

import { getAgentUserIdFromCookies } from "@/lib/auth-cookies";

export default async function ReferralPage() {
    const userId = await getAgentUserIdFromCookies();

    if (!userId || userId.trim() === "") {
        redirect("/agent/login");
    }

    const initialData = await getAgentReferralData(userId).catch(() => null);

    return <ReferralPageClient initialData={initialData as any} />;
}
