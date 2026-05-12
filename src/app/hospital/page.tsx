import { getSession } from "@/lib/auth";
import { ClaimsList } from "@/components/dashboard/claims-list"
import { redirect } from "next/navigation"
import { getHospitalClaims, getHospitalIdByUserId } from "@/services/claims"
import { dbPool } from "@/lib/db"
import { CalendarCheck, FileText, Activity } from "lucide-react";
import Link from "next/link";
import { PageShell, PageHeader, StatCard, StatsGrid, CardShell, CardHeader } from "@/components/dashboard/page-shell";
import { Claim } from "@/lib/claims-data";
import {
  claimShowsHospitalVerificationActions,
  HOSPITAL_REVIEW_FLOW_STAGES,
} from "@/lib/hospital-claim-review";

interface HospitalStats {
  activeClaimsCount: number;
  totalClaimsCount: number;
  approvedClaimsCount: number;
}

async function getHospitalStats(hospitalId: string | null): Promise<HospitalStats> {
  if (!hospitalId) return { activeClaimsCount: 0, totalClaimsCount: 0, approvedClaimsCount: 0 };
  const client = await dbPool.connect();
  try {
    const hospitalReviewStages = Array.from(HOSPITAL_REVIEW_FLOW_STAGES);
    const [activeRes, totalRes, approvedRes] = await Promise.all([
      client.query(
        `SELECT COUNT(*)::int AS count FROM public.claim
         WHERE hospital_id = $1 AND status != 'DRAFT'
         AND (
           status IN ('SUBMITTED', 'INFO_REQUESTED', 'INFO_SUBMITTED')
           OR (
             status = 'IN_PROGRESS'
             AND stage = ANY($2::text[])
           )
         )`,
        [hospitalId, hospitalReviewStages]
      ),
      client.query(
        "SELECT COUNT(*)::int AS count FROM public.claim WHERE hospital_id = $1 AND status != 'DRAFT'",
        [hospitalId]
      ),
      client.query(
        "SELECT COUNT(*)::int AS count FROM public.claim WHERE hospital_id = $1 AND status = 'APPROVED'",
        [hospitalId]
      ),
    ]);
    return {
      activeClaimsCount: activeRes.rows[0].count ?? 0,
      totalClaimsCount: totalRes.rows[0].count ?? 0,
      approvedClaimsCount: approvedRes.rows[0].count ?? 0,
    };
  } finally {
    client.release();
  }
}

export default async function HospitalDashboardPage() {
  const session = await getSession({ portal: "hospital" });
  if (!session) redirect("/hospital/login");

  const userId = session.userId;
  const hospitalId = await getHospitalIdByUserId(userId);

  const [stats, allClaims] = await Promise.all([
    getHospitalStats(hospitalId),
    getHospitalClaims(hospitalId),
  ]);

  const { activeClaimsCount, totalClaimsCount, approvedClaimsCount } = stats;

  const activeClaims = (allClaims as Claim[]).filter((c) =>
    claimShowsHospitalVerificationActions({ status: c.status, stage: c.stage ?? null })
  );

  return (
    <PageShell>
      <PageHeader
        title="Dasbor Rumah Sakit"
        description="Pantau status klaim asuransi dan jadwal pasien Anda."
        actions={
          <Link href="/hospital/appointments">
            <button className="bg-black hover:bg-black text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors inline-flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Jadwal
            </button>
          </Link>
        }
      />

      <StatsGrid cols={3}>
        <StatCard
          label="Klaim Aktif"
          value={activeClaimsCount}
          icon={FileText}
          description="Perlu ditindaklanjuti"
          href="/hospital/claims"
        />
        <StatCard
          label="Total Klaim"
          value={totalClaimsCount}
          icon={Activity}
          description="Sepanjang waktu"
          href="/hospital/claims"
        />
        <StatCard
          label="Klaim Disetujui"
          value={approvedClaimsCount}
          icon={CalendarCheck}
          description="Selesai diproses"
          href="/hospital/claims"
        />
      </StatsGrid>

      <CardShell>
        <CardHeader
          title="Klaim Aktif"
          description={`${activeClaimsCount} klaim sedang dalam proses`}
        />
        <ClaimsList role="hospital" claims={activeClaims} />
      </CardShell>
    </PageShell>
  );
}
