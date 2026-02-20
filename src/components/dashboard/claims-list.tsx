"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { claims, ClaimStatus, Claim } from "@/lib/claims-data";
import { AlertCircle, CheckCircle2, XCircle, ArrowRight, FileText } from "lucide-react";

interface ClaimsListProps {
  role: 'developer' | 'admin_agency' | 'hospital' | 'agent';
  claims?: Claim[];
}

export function ClaimsList({ role, claims: propClaims }: ClaimsListProps) {
  const displayClaims = propClaims || claims;

  const getStatusConfig = (status: ClaimStatus) => {
    switch (status) {
      case 'APPROVED':
        return {
          className: 'bg-gray-900 text-white border-transparent',
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: 'Disetujui',
          accent: 'border-l-gray-900',
        };
      case 'INFO_REQUESTED':
        return {
          className: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Perlu Info',
          accent: 'border-l-gray-400',
        };
      case 'INFO_SUBMITTED':
        return {
          className: 'bg-gray-800 text-gray-100 border-transparent',
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Info Terkirim',
          accent: 'border-l-gray-600',
        };
      case 'REJECTED':
        return {
          className: 'bg-black text-white border-transparent',
          icon: <XCircle className="h-3 w-3" />,
          label: 'Ditolak',
          accent: 'border-l-black',
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-600 border-gray-200',
          icon: null,
          label: status,
          accent: 'border-l-gray-300',
        };
    }
  };

  if (displayClaims.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
          <FileText className="h-6 w-6 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">Tidak ada klaim ditemukan</p>
        <p className="text-xs text-gray-400 mt-1">Klaim baru akan muncul di sini</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayClaims.map((claim) => {
        const config = getStatusConfig(claim.status as ClaimStatus);
        const detailUrl =
          role === 'admin_agency' ? `/admin-agency/claims/${claim.claim_id}` :
            role === 'hospital' ? `/hospital/claims/${claim.claim_id}` :
              role === 'agent' ? `/agent/claims/${claim.claim_id}` :
                '#';

        return (
          <div
            key={claim.claim_id}
            className={`group flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border border-gray-100 border-l-[3px] bg-white hover:bg-gray-50/50 hover:shadow-sm transition-all duration-200 ${config.accent}`}
          >
            <div className="flex flex-col gap-1.5 mb-3 md:mb-0 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">{claim.client_name}</span>
                <span className="text-xs text-gray-400 font-mono">#{claim.policy_number}</span>
                <Badge
                  className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${config.className}`}
                  variant="outline"
                >
                  {config.icon}
                  {config.label}
                </Badge>
                {claim.stage && (
                  <Badge variant="secondary" className="text-xs font-normal bg-gray-50 text-gray-500 border-gray-100">
                    {claim.stage}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                <span>{claim.hospital_name}</span>
                <span className="text-gray-200">•</span>
                <span>{new Date(claim.claim_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className="text-gray-200">•</span>
                <span className="font-medium text-gray-600">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(claim.total_amount)}
                </span>
                {claim.disease_name && (
                  <>
                    <span className="text-gray-200">•</span>
                    <span>{claim.disease_name}</span>
                  </>
                )}
              </div>

              {claim.missing_data && claim.missing_data.length > 0 && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <AlertCircle className="h-3 w-3 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-500">
                    Dokumen kurang: {claim.missing_data.join(", ")}
                  </span>
                </div>
              )}
            </div>

            <Link
              href={detailUrl}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-black group-hover:text-black transition-colors duration-200 shrink-0 mt-1 md:mt-0 md:ml-4"
            >
              Lihat Detail
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
