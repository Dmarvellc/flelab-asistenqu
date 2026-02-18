"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { claims, ClaimStatus, Claim } from "@/lib/claims-data";
import { AlertCircle, CheckCircle2, XCircle, MoreHorizontal } from "lucide-react";

interface ClaimsListProps {
  role: 'developer' | 'admin_agency' | 'hospital' | 'agent';
  claims?: Claim[];
}

export function ClaimsList({ role, claims: propClaims }: ClaimsListProps) {
  const displayClaims = propClaims || claims;
  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200';
      case 'INFO_REQUESTED':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200';
      case 'INFO_SUBMITTED':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: ClaimStatus) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-3 w-3 mr-1" />;
      case 'INFO_REQUESTED':
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case 'INFO_SUBMITTED':
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case 'REJECTED':
        return <XCircle className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Claims List</h3>
      <div className="space-y-3">
        {displayClaims.map((claim) => {
          const detailUrl =
            role === 'admin_agency' ? `/admin-agency/claims/${claim.claim_id}` :
              role === 'hospital' ? `/hospital/claims/${claim.claim_id}` :
                role === 'agent' ? `/agent/claims/${claim.claim_id}` :
                  '#';

          return (
            <div
              key={claim.claim_id}
              className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg border-l-4 shadow-sm bg-white hover:bg-slate-50 transition-colors ${claim.status === 'APPROVED' ? 'border-l-green-500' :
                claim.status === 'REJECTED' ? 'border-l-red-500' :
                  'border-l-blue-500'
                }`}
            >
              <div className="flex flex-col gap-1 mb-3 md:mb-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{claim.client_name}</span>
                  <span className="text-xs text-muted-foreground mr-1">({claim.policy_number})</span>
                  <Badge className={getStatusColor(claim.status as ClaimStatus)} variant="outline">
                    {getStatusIcon(claim.status as ClaimStatus)}
                    {claim.status}
                  </Badge>
                  {claim.stage && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {claim.stage}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex gap-2 flex-wrap items-center">
                  <span>{claim.hospital_name}</span>
                  <span>•</span>
                  <span>{new Date(claim.claim_date).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="font-medium text-foreground">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(claim.total_amount)}
                  </span>
                  {claim.disease_name && (
                    <>
                      <span>•</span>
                      <span>{claim.disease_name}</span>
                    </>
                  )}
                </div>
                {claim.missing_data && claim.missing_data.length > 0 && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                    <span className="font-medium">Missing:</span>
                    <span>{claim.missing_data.join(", ")}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end">
                <Button size="sm" variant="ghost" asChild>
                  <Link href={detailUrl}>
                    Lihat Detail
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
