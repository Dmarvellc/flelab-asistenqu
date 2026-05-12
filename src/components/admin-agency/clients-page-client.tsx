"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, UserX, Upload, UserPlus } from "lucide-react";
import { AgencyClient, AgencyAgent } from "@/services/admin-agency";
import { ClientsTable } from "@/components/admin/clients-table";
import { ClientImportPanel } from "@/components/admin-agency/client-import-panel";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard, StatsGrid, PageShell, PageHeader } from "@/components/dashboard/page-shell";

type Tab = "all" | "unassigned" | "import";

interface Props {
  allClients: AgencyClient[];
  unassignedClients: AgencyClient[];
  agents: AgencyAgent[];
}

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType; countKey?: keyof Props }> = [
  { id: "all",        label: "Semua Klien",      icon: Users,  countKey: "allClients" },
  { id: "unassigned", label: "Belum Ditugaskan", icon: UserX,  countKey: "unassignedClients" },
  { id: "import",     label: "Import CSV",       icon: Upload },
];

export function ClientsPageClient({ allClients, unassignedClients, agents }: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const router = useRouter();

  const onImportSuccess = useCallback(() => {
    setTab("unassigned");
    router.refresh();
  }, [router]);

  const counts: Record<string, number | undefined> = {
    allClients: allClients.length,
    unassignedClients: unassignedClients.length,
  };

  return (
    <PageShell>
      <PageHeader
        title="Manajemen Klien"
        description="Kelola, impor, dan distribusikan klien ke agen agensi Anda."
        actions={
          <>
            {unassignedClients.length > 0 && (
              <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5">
                <UserX className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {unassignedClients.length} belum ditugaskan
                </span>
              </div>
            )}
            <Link
              href="/agent/clients/new"
              className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Tambah Klien
            </Link>
          </>
        }
      />

      <StatsGrid cols={3}>
        <StatCard label="Total Klien" value={counts.allClients ?? 0} icon={Users} />
        <StatCard label="Belum Ditugaskan" value={counts.unassignedClients ?? 0} icon={UserX} />
        <StatCard label="Total Agen" value={agents.length} icon={Users} />
      </StatsGrid>

      <Tabs defaultValue="all" className="w-full mt-6" onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="bg-transparent border-b border-gray-200 w-full justify-start rounded-none p-0 h-auto space-x-6 mb-6">
          {TABS.map((t) => {
            const count = t.countKey ? counts[t.countKey] : undefined;
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black text-gray-500 bg-transparent px-2 py-3 shadow-none data-[state=active]:shadow-none font-semibold flex items-center gap-2"
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                {count !== undefined && count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <ClientsTable clients={allClients} agents={agents} baseUrl="/admin-agency/clients" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="unassigned" className="mt-0">
          <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <ClientsTable
                clients={unassignedClients}
                agents={agents}
                showBulkAssign
                baseUrl="/admin-agency/clients"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="import" className="mt-0">
          <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
            <div className="px-8 py-8">
              <div className="max-w-xl">
                <p className="text-lg font-bold text-black mb-2">Import Data Klien (CSV)</p>
                <p className="text-sm text-gray-500 mb-8">
                  Upload file CSV untuk mengimpor data klien secara massal.
                  Klien tanpa kolom <code className="bg-gray-100 px-1 rounded text-black font-medium">agent_email</code> akan masuk
                  ke tab "Belum Ditugaskan" dan bisa di-assign setelah import.
                </p>
                <ClientImportPanel onSuccess={onImportSuccess} />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
