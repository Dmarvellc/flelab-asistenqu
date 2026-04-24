"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

export type WrongPortalInfo = {
  error: string;
  suggestedPortalLabel: string | null;
  suggestedPath: string | null;
  currentPortalLabel?: string;
};

/**
 * Friendly "you're on the wrong portal" banner for non-technical users.
 * Renders message in Indonesian with a clear CTA to the correct portal.
 */
export function WrongPortalAlert({ info }: { info: WrongPortalInfo }) {
  const { error, suggestedPortalLabel, suggestedPath } = info;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6 animate-in zoom-in-95 duration-200">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">Portal salah</p>
          <p className="text-sm text-amber-800 mt-1 leading-relaxed">{error}</p>

          {suggestedPath && suggestedPortalLabel && (
            <Link
              href={suggestedPath}
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              Buka Portal {suggestedPortalLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
