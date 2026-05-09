"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users, UserX, Upload } from "lucide-react";
import { AgencyClient, AgencyAgent } from "@/services/admin-agency";
import { ClientsTable } from "@/components/admin/clients-table";
import { ClientImportPanel } from "@/components/admin-agency/client-import-panel";
import { cn } from "@/lib/utils";

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
    // Setelah import berhasil, switch ke tab unassigned dan refresh data
    setTab("unassigned");
    router.refresh();
  }, [router]);

  const counts: Record<string, number | undefined> = {
    allClients: allClients.length,
    unassignedClients: unassignedClients.length,
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Manajemen Klien
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Kelola, impor, dan distribusikan klien ke agen agensi Anda.
          </p>
        </div>

        {/* Badge unassigned */}
        {unassignedClients.length > 0 && (
          <div className="shrink-0 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <UserX className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              {unassignedClients.length} klien belum ditugaskan
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl w-fit">
        {TABS.map((t) => {
          const count = t.countKey ? counts[t.countKey] : undefined;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                    t.id === "unassigned"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-200 text-gray-600",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {tab === "all" && (
          <>
            <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30">
              <h2 className="text-base font-bold text-gray-900">Direktori Klien</h2>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                Total {allClients.length} klien di bawah agensi ini.
              </p>
            </div>
            <div className="overflow-x-auto">
              <ClientsTable clients={allClients} agents={agents} />
            </div>
          </>
        )}

        {tab === "unassigned" && (
          <>
            <div className="px-6 py-5 border-b border-gray-50 bg-amber-50/30">
              <h2 className="text-base font-bold text-gray-900">Klien Belum Ditugaskan</h2>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                {unassignedClients.length === 0
                  ? "Semua klien sudah ditugaskan ke agen."
                  : `${unassignedClients.length} klien menunggu assignment ke agen.`}
              </p>
            </div>
            <div className="overflow-x-auto">
              <ClientsTable
                clients={unassignedClients}
                agents={agents}
                showBulkAssign
              />
            </div>
          </>
        )}

        {tab === "import" && (
          <div className="px-6 py-6">
            <div className="max-w-xl">
              <h2 className="text-base font-bold text-gray-900 mb-1">Import Data Klien (CSV)</h2>
              <p className="text-xs text-gray-500 mb-6">
                Upload file CSV untuk mengimpor data klien secara massal.
                Klien tanpa kolom <code className="bg-gray-100 px-1 rounded">agent_email</code> akan masuk
                ke tab "Belum Ditugaskan" dan bisa di-assign setelah import.
              </p>
              <ClientImportPanel onSuccess={onImportSuccess} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
