"use client";

import React, { useEffect, useState } from "react";
import { FileText, MoreHorizontal, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ClaimsList } from "@/components/dashboard/claims-list";

interface Claim {
  claim_id: string;
  claim_number: string | null;
  claim_date: string;
  status: string;
  stage: string;
  total_amount: number;
  client_name: string;
  disease_name: string | null;
  hospital_name: string | null;
  policy_number: string | null;
  created_at: string;
  created_by_user_id: string;
  agency_name: string | null;
  insurance_name: string | null;
}

export default function DeveloperClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const res = await fetch("/api/developer/claims");
        if (res.ok) {
          const data = await res.json();
          setClaims(data.claims || []);
        }
      } catch (error) {
        console.error("Error fetching claims:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal text-black tracking-tight">
            Semua Klaim
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Lihat dan kelola semua klaim di platform
          </p>
        </div>
      </div>

      {/* Claims Card */}
      <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-medium text-black">Daftar Klaim</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Total {claims.length} klaim
            </p>
          </div>
          <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-400">Memuat klaim...</p>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <ClaimsList role="developer" claims={claims as any} />
          </div>
        )}
      </div>
    </div>
  );
}
