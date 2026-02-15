"use client";


import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { claims, ClaimStatus, Claim } from "@/lib/claims-data";
import { AlertCircle, CheckCircle2, XCircle, FileEdit, MessageCircle, MoreHorizontal } from "lucide-react";

interface ClaimsListProps {
  role: 'developer' | 'admin_agency' | 'hospital' | 'agent';
  claims?: Claim[];
}

export function ClaimsList({ role, claims: propClaims }: ClaimsListProps) {
  const displayClaims = propClaims || claims;
  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'INFO_REQUESTED':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'INFO_SUBMITTED':
          return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ClaimStatus) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-4 w-4 mr-2" />;
      case 'INFO_REQUESTED':
        return <AlertCircle className="h-4 w-4 mr-2" />;
      case 'INFO_SUBMITTED':
          return <AlertCircle className="h-4 w-4 mr-2" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">On Progress Claims</h3>
      <div className="space-y-3">
        {displayClaims.map((claim) => (
          <div 
            key={claim.claim_id} 
            className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg border-l-4 shadow-sm bg-white ${
              claim.status === 'APPROVED' ? 'border-l-green-500' :
              claim.status === 'REJECTED' ? 'border-l-red-500' :
              'border-l-blue-500'
            }`}
          >
            <div className="flex flex-col gap-1 mb-3 md:mb-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{claim.client_name}</span>
                <span className="text-xs text-muted-foreground">({claim.policy_number})</span>
                <Badge className={getStatusColor(claim.status)} variant="outline">
                   {getStatusIcon(claim.status)}
                   {claim.status}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground flex gap-4">
                <span>{claim.hospital_name}</span>
                <span>•</span>
                <span>{new Date(claim.claim_date).toLocaleDateString()}</span>
                <span>•</span>
                <span>
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

            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
               {['INFO_REQUESTED', 'INFO_SUBMITTED'].includes(claim.status) && (
                 <>
                    <Button size="sm" variant="outline" className="flex-1 md:flex-none gap-2">
                        <FileEdit className="h-3.5 w-3.5" />
                        Fill In
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 md:flex-none gap-2">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Ask Needed
                    </Button>
                 </>
               )}
               <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
               </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
