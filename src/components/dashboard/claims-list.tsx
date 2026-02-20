"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { claims, ClaimStatus, Claim as BaseClaim } from "@/lib/claims-data";
import { AlertCircle, CheckCircle2, XCircle, ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Claim extends BaseClaim {
  claim_number?: string;
}

interface ClaimsListProps {
  role: 'developer' | 'admin_agency' | 'hospital' | 'agent';
  claims?: Claim[];
}

export function ClaimsList({ role, claims: propClaims }: ClaimsListProps) {
  const displayClaims = (propClaims || claims) as Claim[];

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
            className="group flex flex-col md:flex-row items-start md:items-center justify-between py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/30 transition-colors px-2 -mx-2 rounded-lg"
          >
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-gray-900 text-[15px]">{claim.client_name}</span>
                <span className="text-xs text-gray-400 font-mono tracking-wide">#{claim.claim_number || `${claim.claim_id.slice(0, 8)}`}</span>

                {/* Minimalist Status */}
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {config.icon}
                  <span className={cn(
                    claim.status === 'APPROVED' ? "text-black" :
                      claim.status === 'REJECTED' ? "text-gray-900" :
                        "text-gray-500"
                  )}>
                    {config.label}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-500 mt-1">
                <span className="truncate max-w-[200px]">{claim.hospital_name || 'Rumah Sakit'}</span>
                <span className="text-gray-300">•</span>
                <span>{new Date(claim.claim_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className="text-gray-300">•</span>
                <span className="font-semibold text-gray-900">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(claim.total_amount || 0)}
                </span>
                {claim.disease_name && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="truncate">{claim.disease_name}</span>
                  </>
                )}
              </div>
            </div>

            <Link
              href={detailUrl}
              className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-black group-hover:text-black transition-colors duration-200 shrink-0 mt-3 md:mt-0 md:ml-4"
            >
              Lihat Detail
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
