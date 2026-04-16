import { redirect } from "next/navigation";
import ReferralPageClient from "./client-page";
import { getAgentReferralData } from "@/services/agent-referral";
import { getSession } from "@/lib/auth";

export default async function ReferralPage() {
    const session = await getSession();
    if (!session) {
        redirect("/agent/login");
    }
    const userId = session.userId;

    const initialData = await getAgentReferralData(userId).catch(() => null);

    return <ReferralPageClient initialData={initialData as any} />;
}
