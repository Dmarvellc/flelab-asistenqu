import "server-only";
import { dbPool } from "@/lib/db";
import { getJsonCache, setJsonCache } from "@/lib/redis";

// ─── Types ─────────────────────────────────────────────────
export interface NetworkHospital {
  hospital_id: string;
  name: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  website: string | null;
  type: string;
  tier: string;
  bed_count: number;
  established_year: number;
  emergency_24h: boolean;
  international_patients: boolean;
  insurance_panel: boolean;
  is_partner: boolean;
  status: string;
  avg_rating: number;
  total_reviews: number;
  description: string | null;
  specializations: string[];
  accreditations: string[];
  languages_supported: string[];
  technologies: string[];
  operating_hours: string | null;
  latitude: number | null;
  longitude: number | null;
  doctor_count?: number;
}

export interface NetworkDoctor {
  id: string;
  name: string;
  title: string;
  specialization: string;
  subspecialization: string | null;
  hospital: string;
  hospital_location: string;
  country: string;
  experience_years: number;
  languages: string[];
  notable_for: string | null;
  rating: number;
  consultation_fee_min: number;
  consultation_fee_max: number;
  currency: string;
  is_featured: boolean;
  profile_url: string | null;
  bio: string | null;
  qualifications: string[];
  certifications: string[];
  procedures_offered: string[];
  conditions_treated: string[];
  available_days: string[];
  accepting_new_patients: boolean;
  telemedicine_available: boolean;
  hospital_id: string | null;
}

export interface DoctorHospitalLink {
  id: string;
  hospital_id: string;
  hospital_name: string;
  hospital_city: string;
  hospital_country: string;
  hospital_tier: string;
  is_primary: boolean;
  consultation_fee_min: number;
  consultation_fee_max: number;
  currency: string;
  room_number: string | null;
  floor: string | null;
}

export interface DoctorSchedule {
  schedule_id: string;
  hospital_id: string;
  hospital_name: string;
  day_of_week: number; // 0=Sun..6=Sat
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  max_patients: number;
  is_active: boolean;
}

export interface MarketplaceDoctor extends NetworkDoctor {
  gender: string | null;
  photo_url: string | null;
  total_reviews: number;
  patients_treated: number;
  hospitals: DoctorHospitalLink[];
  schedules: DoctorSchedule[];
}

export interface InsurancePanel {
  panel_id: string;
  insurance_name: string;
  panel_type: string;
  coverage_notes: string | null;
}

export interface HospitalFacility {
  facility_id: string;
  category: string;
  name: string;
  description: string | null;
  is_highlighted: boolean;
}

export interface NetworkStats {
  total_hospitals: number;
  total_doctors: number;
  countries: { country: string; hospital_count: number; doctor_count: number }[];
  top_specializations: { specialization: string; doctor_count: number }[];
  premium_hospitals: number;
  partner_hospitals: number;
  jci_accredited: number;
}

// ─── Queries ───────────────────────────────────────────────

export async function getNetworkStats(): Promise<NetworkStats> {
  const cacheKey = "network:stats";
  const cached = await getJsonCache<NetworkStats>(cacheKey);
  if (cached) return cached;

  const [hosRes, docRes, countryRes, specRes, premRes, partnerRes] = await Promise.all([
    dbPool.query("SELECT COUNT(*) FROM public.hospital WHERE status = 'ACTIVE'"),
    dbPool.query("SELECT COUNT(*) FROM public.doctors"),
    dbPool.query(`
      SELECT h.country,
        COUNT(DISTINCT h.hospital_id) as hospital_count,
        COUNT(DISTINCT d.id) as doctor_count
      FROM public.hospital h
      LEFT JOIN public.doctors d ON d.country = h.country
      WHERE h.status = 'ACTIVE'
      GROUP BY h.country ORDER BY hospital_count DESC
    `),
    dbPool.query(`
      SELECT specialization, COUNT(*) as doctor_count
      FROM public.doctors
      GROUP BY specialization ORDER BY doctor_count DESC LIMIT 10
    `),
    dbPool.query("SELECT COUNT(*) FROM public.hospital WHERE tier = 'PREMIUM' AND status = 'ACTIVE'"),
    dbPool.query("SELECT COUNT(*) FROM public.hospital WHERE is_partner = true AND status = 'ACTIVE'"),
  ]);

  // Count JCI accredited
  const jciRes = await dbPool.query(
    "SELECT COUNT(*) FROM public.hospital WHERE 'JCI Accredited' = ANY(accreditations) AND status = 'ACTIVE'"
  );

  const stats: NetworkStats = {
    total_hospitals: parseInt(hosRes.rows[0].count),
    total_doctors: parseInt(docRes.rows[0].count),
    countries: countryRes.rows.map((r) => ({
      country: r.country,
      hospital_count: parseInt(r.hospital_count),
      doctor_count: parseInt(r.doctor_count),
    })),
    top_specializations: specRes.rows.map((r) => ({
      specialization: r.specialization,
      doctor_count: parseInt(r.doctor_count),
    })),
    premium_hospitals: parseInt(premRes.rows[0].count),
    partner_hospitals: parseInt(partnerRes.rows[0].count),
    jci_accredited: parseInt(jciRes.rows[0].count),
  };

  await setJsonCache(cacheKey, stats, 300);
  return stats;
}

export async function searchHospitals(params: {
  q?: string;
  country?: string;
  city?: string;
  tier?: string;
  specialization?: string;
  page?: number;
  limit?: number;
}): Promise<{ hospitals: NetworkHospital[]; total: number }> {
  const conditions: string[] = ["h.status = 'ACTIVE'"];
  const values: (string | number | boolean)[] = [];
  let idx = 1;

  if (params.q) {
    conditions.push(`(h.name ILIKE $${idx} OR h.city ILIKE $${idx} OR h.description ILIKE $${idx})`);
    values.push(`%${params.q}%`);
    idx++;
  }
  if (params.country) {
    conditions.push(`h.country = $${idx}`);
    values.push(params.country);
    idx++;
  }
  if (params.city) {
    conditions.push(`h.city ILIKE $${idx}`);
    values.push(`%${params.city}%`);
    idx++;
  }
  if (params.tier) {
    conditions.push(`h.tier = $${idx}`);
    values.push(params.tier);
    idx++;
  }
  if (params.specialization) {
    conditions.push(`$${idx} = ANY(h.specializations)`);
    values.push(params.specialization);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params.limit || 20;
  const offset = ((params.page || 1) - 1) * limit;

  const [rows, countResult] = await Promise.all([
    dbPool.query(
      `SELECT h.*, COUNT(DISTINCT dh.doctor_id) as doctor_count
       FROM public.hospital h
       LEFT JOIN public.doctor_hospital dh ON dh.hospital_id = h.hospital_id
       ${where}
       GROUP BY h.hospital_id
       ORDER BY h.tier DESC, h.avg_rating DESC, h.total_reviews DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    ),
    dbPool.query(`SELECT COUNT(*) FROM public.hospital h ${where}`, values),
  ]);

  return {
    hospitals: rows.rows.map((r) => ({ ...r, doctor_count: parseInt(r.doctor_count) })),
    total: parseInt(countResult.rows[0].count),
  };
}

export async function getHospitalDetail(hospitalId: string) {
  const [hospitalRes, doctors, facilitiesRes, panelsRes] = await Promise.all([
    dbPool.query("SELECT * FROM public.hospital WHERE hospital_id = $1", [hospitalId]),
    getDoctorsByHospital(hospitalId),
    dbPool.query(
      `SELECT * FROM public.hospital_facility WHERE hospital_id = $1 ORDER BY is_highlighted DESC, category`,
      [hospitalId]
    ),
    dbPool.query(
      `SELECT * FROM public.hospital_insurance_panel WHERE hospital_id = $1 AND is_active = true ORDER BY insurance_name`,
      [hospitalId]
    ),
  ]);

  if (hospitalRes.rows.length === 0) return null;

  return {
    hospital: hospitalRes.rows[0] as NetworkHospital,
    doctors,
    facilities: facilitiesRes.rows as HospitalFacility[],
    insurance_panels: panelsRes.rows as InsurancePanel[],
  };
}

export async function searchDoctorsAdvanced(params: {
  q?: string;
  specialization?: string;
  country?: string;
  hospital?: string;
  condition?: string;
  procedure?: string;
  telemedicine?: boolean;
  featured?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ doctors: NetworkDoctor[]; total: number }> {
  const conditions: string[] = [];
  const values: (string | boolean | number)[] = [];
  let idx = 1;

  if (params.q) {
    conditions.push(
      `(d.name ILIKE $${idx} OR d.specialization ILIKE $${idx} OR d.hospital ILIKE $${idx} OR d.notable_for ILIKE $${idx} OR d.subspecialization ILIKE $${idx})`
    );
    values.push(`%${params.q}%`);
    idx++;
  }
  if (params.specialization) {
    conditions.push(`d.specialization ILIKE $${idx}`);
    values.push(`%${params.specialization}%`);
    idx++;
  }
  if (params.country) {
    conditions.push(`d.country = $${idx}`);
    values.push(params.country);
    idx++;
  }
  if (params.hospital) {
    conditions.push(`d.hospital ILIKE $${idx}`);
    values.push(`%${params.hospital}%`);
    idx++;
  }
  if (params.condition) {
    conditions.push(`$${idx} = ANY(d.conditions_treated)`);
    values.push(params.condition);
    idx++;
  }
  if (params.procedure) {
    conditions.push(`$${idx} = ANY(d.procedures_offered)`);
    values.push(params.procedure);
    idx++;
  }
  if (params.telemedicine) {
    conditions.push(`d.telemedicine_available = true`);
  }
  if (params.featured) {
    conditions.push(`d.is_featured = true`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params.limit || 24;
  const offset = ((params.page || 1) - 1) * limit;

  const [rows, countResult] = await Promise.all([
    dbPool.query(
      `SELECT d.* FROM public.doctors d ${where}
       ORDER BY d.is_featured DESC, d.rating DESC, d.experience_years DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    ),
    dbPool.query(`SELECT COUNT(*) FROM public.doctors d ${where}`, values),
  ]);

  return {
    doctors: rows.rows,
    total: parseInt(countResult.rows[0].count),
  };
}

export async function getRecommendations(params: {
  condition?: string;
  specialization?: string;
  country?: string;
  budget?: "low" | "medium" | "high";
}): Promise<{ doctors: NetworkDoctor[]; hospitals: NetworkHospital[] }> {
  const doctorConditions: string[] = [];
  const doctorValues: (string | number)[] = [];
  let idx = 1;

  if (params.condition) {
    doctorConditions.push(`$${idx} = ANY(d.conditions_treated)`);
    doctorValues.push(params.condition);
    idx++;
  }
  if (params.specialization) {
    doctorConditions.push(`d.specialization ILIKE $${idx}`);
    doctorValues.push(`%${params.specialization}%`);
    idx++;
  }
  if (params.country) {
    doctorConditions.push(`d.country = $${idx}`);
    doctorValues.push(params.country);
    idx++;
  }

  const where = doctorConditions.length > 0 ? `WHERE ${doctorConditions.join(" AND ")}` : "";

  const doctors = await dbPool.query(
    `SELECT d.* FROM public.doctors d ${where}
     ORDER BY d.is_featured DESC, d.rating DESC LIMIT 6`,
    doctorValues
  );

  // Get hospitals from those doctors
  const hospitalIds = [...new Set(doctors.rows.map((d) => d.hospital_id).filter(Boolean))];
  let hospitals = { rows: [] as NetworkHospital[] };
  if (hospitalIds.length > 0) {
    hospitals = await dbPool.query(
      `SELECT h.* FROM public.hospital h WHERE h.hospital_id = ANY($1) ORDER BY h.avg_rating DESC`,
      [hospitalIds]
    );
  }

  return {
    doctors: doctors.rows,
    hospitals: hospitals.rows,
  };
}

// ─── Doctor Marketplace ──────────────────────────────────────

export async function getDoctorDetail(doctorId: string): Promise<MarketplaceDoctor | null> {
  const [doctorRes, hospitalsRes, schedulesRes] = await Promise.all([
    dbPool.query("SELECT * FROM public.doctors WHERE id = $1", [doctorId]),
    dbPool.query(
      `SELECT dh.*, h.name as hospital_name, h.city as hospital_city,
              h.country as hospital_country, h.tier as hospital_tier
       FROM public.doctor_hospital dh
       JOIN public.hospital h ON h.hospital_id = dh.hospital_id
       WHERE dh.doctor_id = $1
       ORDER BY dh.is_primary DESC`,
      [doctorId]
    ),
    dbPool.query(
      `SELECT ds.*, h.name as hospital_name
       FROM public.doctor_schedule ds
       JOIN public.hospital h ON h.hospital_id = ds.hospital_id
       WHERE ds.doctor_id = $1 AND ds.is_active = true
       ORDER BY ds.day_of_week, ds.start_time`,
      [doctorId]
    ),
  ]);

  if (doctorRes.rows.length === 0) return null;

  const doctor = doctorRes.rows[0];

  return {
    ...doctor,
    hospitals: hospitalsRes.rows as DoctorHospitalLink[],
    schedules: schedulesRes.rows as DoctorSchedule[],
  } as MarketplaceDoctor;
}

export async function searchMarketplaceDoctors(params: {
  q?: string;
  specialization?: string;
  country?: string;
  hospital?: string;
  condition?: string;
  procedure?: string;
  telemedicine?: boolean;
  featured?: boolean;
  page?: number;
  limit?: number;
}): Promise<{
  doctors: (NetworkDoctor & {
    hospital_count: number;
    primary_hospital_name: string | null;
    primary_hospital_city: string | null;
    primary_hospital_tier: string | null;
  })[];
  total: number;
}> {
  const conditions: string[] = [];
  const values: (string | boolean | number)[] = [];
  let idx = 1;

  if (params.q) {
    conditions.push(
      `(d.name ILIKE $${idx} OR d.specialization ILIKE $${idx} OR d.hospital ILIKE $${idx} OR d.notable_for ILIKE $${idx} OR d.subspecialization ILIKE $${idx})`
    );
    values.push(`%${params.q}%`);
    idx++;
  }
  if (params.specialization) {
    conditions.push(`d.specialization ILIKE $${idx}`);
    values.push(`%${params.specialization}%`);
    idx++;
  }
  if (params.country) {
    conditions.push(`d.country = $${idx}`);
    values.push(params.country);
    idx++;
  }
  if (params.hospital) {
    conditions.push(`d.hospital ILIKE $${idx}`);
    values.push(`%${params.hospital}%`);
    idx++;
  }
  if (params.condition) {
    conditions.push(`$${idx} = ANY(d.conditions_treated)`);
    values.push(params.condition);
    idx++;
  }
  if (params.procedure) {
    conditions.push(`$${idx} = ANY(d.procedures_offered)`);
    values.push(params.procedure);
    idx++;
  }
  if (params.telemedicine) {
    conditions.push(`d.telemedicine_available = true`);
  }
  if (params.featured) {
    conditions.push(`d.is_featured = true`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params.limit || 24;
  const offset = ((params.page || 1) - 1) * limit;

  const [rows, countResult] = await Promise.all([
    dbPool.query(
      `SELECT d.*,
              h.name as primary_hospital_name,
              h.city as primary_hospital_city,
              h.tier as primary_hospital_tier,
              (SELECT COUNT(*) FROM public.doctor_hospital WHERE doctor_id = d.id) as hospital_count
       FROM public.doctors d
       LEFT JOIN public.doctor_hospital dh ON dh.doctor_id = d.id AND dh.is_primary = true
       LEFT JOIN public.hospital h ON h.hospital_id = dh.hospital_id
       ${where}
       ORDER BY d.is_featured DESC, d.rating DESC, d.experience_years DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    ),
    dbPool.query(`SELECT COUNT(*) FROM public.doctors d ${where}`, values),
  ]);

  return {
    doctors: rows.rows.map((r: Record<string, unknown>) => ({
      ...r,
      hospital_count: parseInt(r.hospital_count as string || "0"),
    })) as (NetworkDoctor & { hospital_count: number; primary_hospital_name: string | null; primary_hospital_city: string | null; primary_hospital_tier: string | null })[],
    total: parseInt(countResult.rows[0].count),
  };
}

export async function getDoctorsByHospital(hospitalId: string): Promise<(NetworkDoctor & {
  dh_fee_min: number;
  dh_fee_max: number;
  dh_currency: string;
  room_number: string | null;
  floor: string | null;
  is_primary: boolean;
})[]> {
  const result = await dbPool.query(
    `SELECT d.*,
            dh.consultation_fee_min as dh_fee_min,
            dh.consultation_fee_max as dh_fee_max,
            dh.currency as dh_currency,
            dh.room_number,
            dh.floor,
            dh.is_primary
     FROM public.doctor_hospital dh
     JOIN public.doctors d ON d.id = dh.doctor_id
     WHERE dh.hospital_id = $1
     ORDER BY dh.is_primary DESC, d.rating DESC`,
    [hospitalId]
  );

  return result.rows;
}
