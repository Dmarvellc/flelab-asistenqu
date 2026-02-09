import "server-only";
import { dbPool } from "@/lib/db";

export type AdminSummary = {
  agentCount: number;
  hospitalCount: number;
  insuranceCount: number;
  claimCount: number;
  openClaimCount: number;
};

export async function getAdminSummary(): Promise<AdminSummary | null> {
  try {
    const agentCount = await dbPool.query(
      "select count(*)::int as count from public.agent"
    );
    const hospitalCount = await dbPool.query(
      "select count(*)::int as count from public.hospital"
    );
    const insuranceCount = await dbPool.query(
      "select count(*)::int as count from public.insurance"
    );
    const claimCount = await dbPool.query(
      "select count(*)::int as count from public.claim"
    );
    const openClaimCount = await dbPool.query(
      "select count(*)::int as count from public.claim where status::text != 'APPROVED'"
    );

    return {
      agentCount: agentCount.rows[0]?.count ?? 0,
      hospitalCount: hospitalCount.rows[0]?.count ?? 0,
      insuranceCount: insuranceCount.rows[0]?.count ?? 0,
      claimCount: claimCount.rows[0]?.count ?? 0,
      openClaimCount: openClaimCount.rows[0]?.count ?? 0,
    };
  } catch (error) {
    console.error("Failed to load admin summary", error);
    return null;
  }
}
