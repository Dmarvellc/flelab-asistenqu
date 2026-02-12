export type ClaimFormMeta = {
  claim_category?: "MANFAAT_HIDUP" | "MENINGGAL_DUNIA";
  benefit_type?: string;
  care_cause?: string;
  symptom_onset_date?: string;
  previous_treatment?: string;
  doctor_hospital_history?: string;
  accident_chronology?: string;
  alcohol_drug_related?: "YA" | "TIDAK";
  death_datetime?: string;
  death_place?: string;
  beneficiary_notes?: string;
};

const META_MARKER = "---CLAIM_META_JSON---";

export function composeClaimNotes(plainNotes: string, meta?: ClaimFormMeta | null): string {
  const trimmedNotes = (plainNotes || "").trim();
  if (!meta) {
    return trimmedNotes;
  }

  const hasValues = Object.values(meta).some((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  });

  if (!hasValues) {
    return trimmedNotes;
  }

  const metaJson = JSON.stringify(meta);
  if (!trimmedNotes) {
    return `${META_MARKER}\n${metaJson}`;
  }

  return `${trimmedNotes}\n\n${META_MARKER}\n${metaJson}`;
}

export function extractClaimNotes(notes?: string | null): {
  plainNotes: string;
  meta: ClaimFormMeta | null;
} {
  const source = notes || "";
  const markerIndex = source.indexOf(META_MARKER);
  if (markerIndex === -1) {
    return { plainNotes: source.trim(), meta: null };
  }

  const plainNotes = source.slice(0, markerIndex).trim();
  const jsonPart = source.slice(markerIndex + META_MARKER.length).trim();

  try {
    const parsed = JSON.parse(jsonPart) as ClaimFormMeta;
    return { plainNotes, meta: parsed };
  } catch {
    return { plainNotes: source.trim(), meta: null };
  }
}
