import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dbPool } from "@/lib/db";
import {
  getAgencyClients,
  getAgencyAgents,
  getUnassignedClients,
} from "@/services/admin-agency";
import { ClientsPageClient } from "@/components/admin-agency/clients-page-client";

async function getAgencyId(userId: string): Promise<string | null> {
  const client = await dbPool.connect();
  try {
    const res = await client.query(
      "SELECT agency_id FROM public.app_user WHERE user_id = $1",
      [userId],
    );
    return res.rows[0]?.agency_id ?? null;
  } finally {
    client.release();
  }
}

export default async function AdminClientsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const agencyId = session.agencyId ?? (await getAgencyId(session.userId));
  if (!agencyId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Tidak Terotorisasi</h1>
        <p className="text-gray-500 mt-1">Akun tidak terhubung ke agensi.</p>
      </div>
    );
  }

  const [allClients, agents, unassigned] = await Promise.all([
    getAgencyClients(agencyId),
    getAgencyAgents(agencyId),
    getUnassignedClients(agencyId),
  ]);

  return (
    <ClientsPageClient
      allClients={allClients}
      unassignedClients={unassigned}
      agents={agents}
    />
  );
}
