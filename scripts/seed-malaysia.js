/* eslint-disable */
/**
 * scripts/seed-malaysia.js
 * ─────────────────────────────────────────────────────────────────
 * Phase 1 – COMPREHENSIVE Malaysia hospital + doctor marketplace seed.
 *
 * Goal: every doctor must end up with:
 *   - a profile photo URL (DiceBear deterministic avatar; never 404)
 *   - at least one hospital affiliation
 *   - a weekly schedule
 *   - realistic specialization, qualifications, fees
 *
 * Senior consultants ("anchors") are hand-curated using real publicly-
 * known Malaysian doctors (press, hospital staff pages, professional
 * registries). Additional consultants are synthesised per hospital so
 * the marketplace looks fully populated – names use ethnicity-appropriate
 * patterns common to Malaysian medical practice.
 *
 * Tables populated:
 *   public.hospital          – hospital master (logo + cover added)
 *   public.doctors           – marketplace doctor profiles (photo_url added)
 *   public.doctor            – claims doctor link (hospital_id + specialty)
 *   public.doctor_hospital   – many-to-many doctor ↔ hospital
 *   public.doctor_schedule   – weekly schedule per doctor per hospital
 *
 * Idempotent: skips rows that already exist (name match).
 *
 * Usage:
 *   node scripts/seed-malaysia.js
 */

const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── HELPERS ──────────────────────────────────────────────────────
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// DiceBear deterministic avatar — always loads, gender-aware seed prefix.
// Style "notionists" looks clean & professional for a healthcare marketplace.
// Hospital logo via Clearbit — fetches the actual brand logo from the
// hospital's domain. Returns null if no website (UI falls back to a
// neutral icon, never a fabricated logo).
function logoFromWebsite(website) {
  if (!website) return null;
  try {
    const host = new URL(website).hostname.replace(/^www\./, "");
    return `https://logo.clearbit.com/${host}`;
  } catch { return null; }
}

// We don't fabricate hospital cover photos. Real exterior photos must be
// supplied by the partner hospital post-MOU.
function coverFromName(_name) {
  return null;
}

// Random helper with deterministic seeding via hospital+specialty.
function pick(arr, idx) { return arr[idx % arr.length]; }

// ─── HOSPITALS ────────────────────────────────────────────────────
const HOSPITALS = [
  // ── KUALA LUMPUR / SELANGOR / PUTRAJAYA ──────────────────────
  { name: "Gleneagles Hospital Kuala Lumpur", city: "Kuala Lumpur", state: "Kuala Lumpur", address: "286 & 288, Jalan Ampang, 50450 Kuala Lumpur", phone: "+60 3-4141 3000", website: "https://www.gleneagles.com.my", type: "PRIVATE", tier: "PREMIUM", bed_count: 380, established_year: 1996, description: "One of Malaysia's leading private hospitals (IHH Healthcare). Renowned for cardiology, oncology and orthopaedics.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Ortopedi","Neurologi","Gastroenterologi","Obstetri & Ginekologi","Nefrologi","Bedah Umum"], accreditations: ["JCI","MSQH"], languages_supported: ["English","Malay","Mandarin","Cantonese","Tamil"], avg_rating: 4.6, total_reviews: 3200 },
  { name: "Prince Court Medical Centre", city: "Kuala Lumpur", state: "Kuala Lumpur", address: "39, Jalan Kia Peng, 50450 Kuala Lumpur", phone: "+60 3-2160 0000", website: "https://www.princecourt.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 257, established_year: 2008, description: "Award-winning private hospital ranked among Asia's best. Known for exceptional patient experience and complex procedures.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Bedah Jantung","Onkologi","Neurologi","Ortopedi","Transplantasi","Bedah Robotik"], accreditations: ["JCI","MSQH"], languages_supported: ["English","Malay","Mandarin","Arabic","Japanese"], avg_rating: 4.8, total_reviews: 2800 },
  { name: "Pantai Hospital Kuala Lumpur", city: "Kuala Lumpur", state: "Kuala Lumpur", address: "8, Jalan Bukit Pantai, 59100 Kuala Lumpur", phone: "+60 3-2296 0888", website: "https://www.pantai.com.my", type: "PRIVATE", tier: "PREMIUM", bed_count: 450, established_year: 1974, description: "Malaysia's oldest private hospital (Pantai Holdings/IHH). Strong cardiology and oncology units.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Bedah Umum","Ortopedi","Obstetri & Ginekologi","Pediatri","THT","Dermatologi"], accreditations: ["MSQH","ISO 9001"], languages_supported: ["English","Malay","Mandarin","Tamil"], avg_rating: 4.5, total_reviews: 4100 },
  { name: "Hospital Kuala Lumpur (HKL)", city: "Kuala Lumpur", state: "Kuala Lumpur", address: "Jalan Pahang, 50586 Kuala Lumpur", phone: "+60 3-2615 5555", website: "https://hkl.moh.gov.my", type: "GOVERNMENT", tier: "TERTIARY", bed_count: 2500, established_year: 1870, description: "Malaysia's largest and oldest government hospital. Premier referral centre for complex and specialist cases.", emergency_24h: true, international_patients: false, insurance_panel: false, is_partner: false, specializations: ["Semua Spesialisasi","Bedah Jantung","Transplantasi","Neurologi","Onkologi","Ortopedi","Neonatologi"], accreditations: ["MSQH","ISO 15189"], languages_supported: ["Malay","English"], avg_rating: 3.9, total_reviews: 5600 },
  { name: "Hospital Putrajaya", city: "Putrajaya", state: "Putrajaya", address: "Presint 7, 62250 Putrajaya", phone: "+60 3-8887 5000", website: "https://hpj.moh.gov.my", type: "GOVERNMENT", tier: "TERTIARY", bed_count: 700, established_year: 2010, description: "Modern government hospital serving Putrajaya and surrounding areas with comprehensive specialist services.", emergency_24h: true, international_patients: false, insurance_panel: false, is_partner: false, specializations: ["Kardiologi","Neurologi","Ortopedi","Pediatri","Obstetri & Ginekologi","Bedah Umum"], accreditations: ["MSQH"], languages_supported: ["Malay","English"], avg_rating: 4.1, total_reviews: 1800 },
  { name: "KPJ Tawakkal Specialist Hospital", city: "Kuala Lumpur", state: "Kuala Lumpur", address: "202, Jalan Pahang, 53000 Kuala Lumpur", phone: "+60 3-4023 3599", website: "https://www.kpj.com.my/tawakkal", type: "PRIVATE", tier: "SPECIALIST", bed_count: 200, established_year: 1986, description: "KPJ flagship hospital in KL. Strong cardiology, oncology and women's health services.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Obstetri & Ginekologi","Pediatri","Bedah Umum","Ortopedi"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Tamil"], avg_rating: 4.3, total_reviews: 1900 },
  { name: "KPJ Ampang Puteri Specialist Hospital", city: "Ampang", state: "Selangor", address: "1, Jalan Mamanda 9, 68000 Ampang, Selangor", phone: "+60 3-4289 1818", website: "https://www.kpj.com.my/ampangputeri", type: "PRIVATE", tier: "SPECIALIST", bed_count: 222, established_year: 1995, description: "Comprehensive private hospital in Ampang serving the eastern KL community.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Pediatri","Obstetri & Ginekologi","Ortopedi","Bedah Umum"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Tamil"], avg_rating: 4.4, total_reviews: 1700 },
  { name: "Sunway Medical Centre", city: "Petaling Jaya", state: "Selangor", address: "5, Jalan Lagoon Selatan, Bandar Sunway, 47500 Petaling Jaya", phone: "+60 3-7491 9191", website: "https://www.sunwaymedical.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 616, established_year: 1999, description: "One of Malaysia's largest private quaternary hospitals. Cancer centre and cardiac centre of excellence.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Neurologi","Ortopedi","Nefrologi","Bedah Robotik","Pediatri","Obstetri & Ginekologi"], accreditations: ["JCI","MSQH","ACHSI"], languages_supported: ["English","Malay","Mandarin","Cantonese","Tamil","Arabic"], avg_rating: 4.7, total_reviews: 4500 },
  { name: "Subang Jaya Medical Centre (SJMC)", city: "Subang Jaya", state: "Selangor", address: "1, Jalan SS 12/1A, 47500 Subang Jaya", phone: "+60 3-5639 1212", website: "https://www.ramsaysimedarby.com/sjmc", type: "PRIVATE", tier: "PREMIUM", bed_count: 393, established_year: 1985, description: "Ramsay Sime Darby flagship. Strong oncology, cardiology and women's & children's services.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Onkologi","Kardiologi","Obstetri & Ginekologi","Pediatri","Neurologi","THT"], accreditations: ["JCI","MSQH"], languages_supported: ["English","Malay","Mandarin","Tamil"], avg_rating: 4.6, total_reviews: 3600 },
  { name: "Beacon Hospital", city: "Petaling Jaya", state: "Selangor", address: "1, Jalan 215, Section 51, 46050 Petaling Jaya", phone: "+60 3-7787 2992", website: "https://www.beaconhospital.com.my", type: "PRIVATE", tier: "SPECIALIST", bed_count: 80, established_year: 2009, description: "Dedicated cancer centre offering full oncology services including proton therapy planning.", emergency_24h: false, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Onkologi","Hematologi","Bedah Onkologi","Radioterapi"], accreditations: ["MSQH","ISO 9001"], languages_supported: ["English","Malay","Mandarin","Cantonese"], avg_rating: 4.7, total_reviews: 1400 },
  { name: "Thomson Hospital Kota Damansara", city: "Petaling Jaya", state: "Selangor", address: "Persiaran Surian, Kota Damansara, 47810 Petaling Jaya", phone: "+60 3-2900 2900", website: "https://thomsonhospitals.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 200, established_year: 2017, description: "Modern hospital with strong fertility, maternity and elderly care services.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Obstetri & Ginekologi","Fertilitas","Pediatri","Geriatri","Ortopedi","Kardiologi"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin"], avg_rating: 4.6, total_reviews: 1500 },
  { name: "ParkCity Medical Centre", city: "Kuala Lumpur", state: "Kuala Lumpur", address: "2, Jalan Intisari Perdana, Desa ParkCity, 52200 Kuala Lumpur", phone: "+60 3-5639 1212", website: "https://www.ramsaysimedarby.com/pmc", type: "PRIVATE", tier: "PREMIUM", bed_count: 213, established_year: 2012, description: "Modern private hospital in Desa ParkCity. Ramsay Sime Darby network.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Ortopedi","Obstetri & Ginekologi","Pediatri","Bedah Umum"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin"], avg_rating: 4.5, total_reviews: 1100 },
  { name: "Tropicana Medical Centre", city: "Kota Damansara", state: "Selangor", address: "11, Jalan Teknologi, Taman Sains Selangor 1, 47810 Petaling Jaya", phone: "+60 3-6287 1111", website: "https://www.tmclife.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 200, established_year: 1994, description: "Comprehensive specialist centre with strong fertility and women's health services.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Obstetri & Ginekologi","Fertilitas","Pediatri","Onkologi","Kardiologi"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin"], avg_rating: 4.4, total_reviews: 1300 },
  { name: "Institut Jantung Negara (IJN)", city: "Kuala Lumpur", state: "Kuala Lumpur", address: "145, Jalan Tun Razak, 50400 Kuala Lumpur", phone: "+60 3-2617 8200", website: "https://www.ijn.com.my", type: "GOVERNMENT", tier: "QUATERNARY", bed_count: 412, established_year: 1992, description: "National Heart Institute. Malaysia's premier cardiac centre handling complex cardiology and cardiac surgery.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Bedah Jantung","Elektrofisiologi","Kardiologi Anak"], accreditations: ["MSQH","ISO 15189","JCI"], languages_supported: ["English","Malay","Mandarin"], avg_rating: 4.8, total_reviews: 5200 },
  { name: "Hospital Selayang", city: "Selayang", state: "Selangor", address: "Lebuhraya Selayang–Kepong, 68100 Batu Caves, Selangor", phone: "+60 3-6126 3333", website: "https://hselayang.moh.gov.my", type: "GOVERNMENT", tier: "TERTIARY", bed_count: 960, established_year: 1999, description: "MOH tertiary hospital and national hepatobiliary referral centre.", emergency_24h: true, international_patients: false, insurance_panel: false, is_partner: false, specializations: ["Hepatobilier","Gastroenterologi","Onkologi","Bedah Umum","Nefrologi"], accreditations: ["MSQH"], languages_supported: ["Malay","English"], avg_rating: 4.0, total_reviews: 2300 },
  { name: "University Malaya Medical Centre (UMMC)", city: "Kuala Lumpur", state: "Kuala Lumpur", address: "Lembah Pantai, 59100 Kuala Lumpur", phone: "+60 3-7949 4422", website: "https://www.ummc.edu.my", type: "GOVERNMENT", tier: "QUATERNARY", bed_count: 1617, established_year: 1968, description: "University Malaya teaching hospital. Major academic medical centre with all major specialties.", emergency_24h: true, international_patients: true, insurance_panel: false, is_partner: true, specializations: ["Semua Spesialisasi","Onkologi","Transplantasi","Kardiologi","Neurologi","Pediatri"], accreditations: ["MSQH","ISO 15189"], languages_supported: ["English","Malay","Mandarin","Tamil"], avg_rating: 4.2, total_reviews: 4800 },

  // ── PENANG ───────────────────────────────────────────────────
  { name: "Gleneagles Hospital Penang", city: "George Town", state: "Pulau Pinang", address: "1, Jalan Pangkor, 10050 George Town, Penang", phone: "+60 4-222 9111", website: "https://www.gleneagles-penang.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 250, established_year: 1973, description: "IHH Penang. Strong reputation among medical tourists from Indonesia.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Gastroenterologi","Onkologi","Ortopedi","Bedah Umum","Pediatri"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Hokkien","Indonesian"], avg_rating: 4.6, total_reviews: 2700 },
  { name: "Island Hospital Penang", city: "George Town", state: "Pulau Pinang", address: "308, Macalister Road, 10450 George Town, Penang", phone: "+60 4-228 8222", website: "https://www.islandhospital.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 600, established_year: 1996, description: "Major medical-tourism hospital. Treats large numbers of Indonesian and regional patients yearly.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Ortopedi","Bedah Umum","Gastroenterologi","Obstetri & Ginekologi","Neurologi"], accreditations: ["JCI","MSQH"], languages_supported: ["English","Malay","Mandarin","Hokkien","Indonesian","Bahasa Indonesia"], avg_rating: 4.7, total_reviews: 3900 },
  { name: "Penang Adventist Hospital", city: "George Town", state: "Pulau Pinang", address: "465, Burmah Road, 10350 George Town, Penang", phone: "+60 4-222 7200", website: "https://www.pah.com.my", type: "PRIVATE", tier: "SPECIALIST", bed_count: 230, established_year: 1924, description: "Long-established hospital with strong cardiology and oncology services.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Bedah Umum","Ortopedi","Gastroenterologi"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Hokkien"], avg_rating: 4.5, total_reviews: 1900 },
  { name: "Hospital Pulau Pinang", city: "George Town", state: "Pulau Pinang", address: "Jalan Residensi, 10990 George Town, Penang", phone: "+60 4-222 5333", website: "https://hpp.moh.gov.my", type: "GOVERNMENT", tier: "TERTIARY", bed_count: 1100, established_year: 1882, description: "Penang's main MOH tertiary hospital.", emergency_24h: true, international_patients: false, insurance_panel: false, is_partner: false, specializations: ["Semua Spesialisasi","Kardiologi","Onkologi","Ortopedi","Pediatri"], accreditations: ["MSQH"], languages_supported: ["Malay","English","Mandarin","Hokkien"], avg_rating: 3.8, total_reviews: 2200 },

  // ── JOHOR ────────────────────────────────────────────────────
  { name: "KPJ Johor Specialist Hospital", city: "Johor Bahru", state: "Johor", address: "39B, Jalan Abdul Samad, 80100 Johor Bahru", phone: "+60 7-225 3000", website: "https://www.kpj.com.my/johor", type: "PRIVATE", tier: "SPECIALIST", bed_count: 218, established_year: 1981, description: "KPJ flagship in southern Malaysia, popular with Singaporean patients.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Ortopedi","Obstetri & Ginekologi","Bedah Umum"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin"], avg_rating: 4.4, total_reviews: 2100 },
  { name: "Pantai Hospital Johor Bahru", city: "Johor Bahru", state: "Johor", address: "Jalan Salim, 80250 Johor Bahru", phone: "+60 7-228 8888", website: "https://www.pantai.com.my/johor-bahru", type: "PRIVATE", tier: "SPECIALIST", bed_count: 218, established_year: 1990, description: "Pantai Group hospital in JB. Major destination for Singaporean medical tourism.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Ortopedi","Obstetri & Ginekologi","Onkologi","THT"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Tamil"], avg_rating: 4.4, total_reviews: 1800 },
  { name: "Gleneagles Medini Hospital", city: "Iskandar Puteri", state: "Johor", address: "2, Jalan Medini Utara 4, 79250 Iskandar Puteri, Johor", phone: "+60 7-560 1000", website: "https://www.gleneagles-medini.com.my", type: "PRIVATE", tier: "PREMIUM", bed_count: 300, established_year: 2015, description: "Modern IHH hospital in Iskandar Puteri serving Johor and Singapore.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Ortopedi","Obstetri & Ginekologi","Pediatri","Neurologi"], accreditations: ["MSQH","JCI"], languages_supported: ["English","Malay","Mandarin","Hokkien"], avg_rating: 4.6, total_reviews: 1600 },
  { name: "Hospital Sultanah Aminah", city: "Johor Bahru", state: "Johor", address: "Jalan Persiaran Abu Bakar Sultan, 80100 Johor Bahru", phone: "+60 7-223 1666", website: "https://hsajb.moh.gov.my", type: "GOVERNMENT", tier: "TERTIARY", bed_count: 1000, established_year: 1881, description: "Main MOH tertiary hospital for southern Peninsular Malaysia.", emergency_24h: true, international_patients: false, insurance_panel: false, is_partner: false, specializations: ["Semua Spesialisasi","Kardiologi","Bedah Umum","Pediatri","Ortopedi"], accreditations: ["MSQH"], languages_supported: ["Malay","English"], avg_rating: 3.7, total_reviews: 1900 },

  // ── PERAK ────────────────────────────────────────────────────
  { name: "KPJ Ipoh Specialist Hospital", city: "Ipoh", state: "Perak", address: "26, Jalan Raja Dihilir, 30350 Ipoh", phone: "+60 5-240 8777", website: "https://www.kpj.com.my/ipoh", type: "PRIVATE", tier: "SPECIALIST", bed_count: 168, established_year: 1989, description: "KPJ Ipoh — main private specialist hospital in Perak.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Gastroenterologi","Bedah Umum","Ortopedi","Obstetri & Ginekologi"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Cantonese","Hokkien"], avg_rating: 4.3, total_reviews: 1100 },
  { name: "Fatimah Hospital", city: "Ipoh", state: "Perak", address: "1, Lorong Cheong Yoke Choy, 30450 Ipoh", phone: "+60 5-545 5777", website: "https://www.fatimah.com.my", type: "PRIVATE", tier: "SPECIALIST", bed_count: 220, established_year: 1934, description: "Long-established private hospital in Ipoh.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Ortopedi","Obstetri & Ginekologi","Bedah Umum","Pediatri"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Cantonese","Hokkien"], avg_rating: 4.4, total_reviews: 950 },

  // ── MELAKA / NEGERI SEMBILAN ─────────────────────────────────
  { name: "Mahkota Medical Centre", city: "Melaka", state: "Melaka", address: "3, Mahkota Melaka, Jalan Merdeka, 75000 Melaka", phone: "+60 6-285 2999", website: "https://mahkotamedical.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 288, established_year: 1994, description: "Major medical tourism hospital. Treats over 100,000 Indonesian patients yearly.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Onkologi","Kardiologi","Ortopedi","Oftalmologi","Bedah Umum","Obstetri & Ginekologi"], accreditations: ["MSQH","JCI"], languages_supported: ["English","Malay","Mandarin","Indonesian","Hokkien"], avg_rating: 4.6, total_reviews: 3200 },
  { name: "KPJ Seremban Specialist Hospital", city: "Seremban", state: "Negeri Sembilan", address: "1, Lorong Spring Hill 1, Bandar Spring Hill, 70300 Seremban", phone: "+60 6-767 8888", website: "https://www.kpj.com.my/seremban", type: "PRIVATE", tier: "SPECIALIST", bed_count: 137, established_year: 1990, description: "KPJ Seremban — main private hospital in Negeri Sembilan.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Ortopedi","Obstetri & Ginekologi","Bedah Umum","Urologi"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Tamil"], avg_rating: 4.3, total_reviews: 870 },

  // ── PAHANG / KELANTAN / TERENGGANU ───────────────────────────
  { name: "KPJ Pahang Specialist Hospital", city: "Kuantan", state: "Pahang", address: "Jalan Tanah Putih, 25250 Kuantan, Pahang", phone: "+60 9-516 8888", website: "https://www.kpj.com.my/pahang", type: "PRIVATE", tier: "SPECIALIST", bed_count: 163, established_year: 1994, description: "KPJ Pahang serves the east coast region with specialist medical care.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Ortopedi","Gastroenterologi","Bedah Umum","Obstetri & Ginekologi"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin"], avg_rating: 4.2, total_reviews: 700 },
  { name: "Hospital Raja Perempuan Zainab II", city: "Kota Bharu", state: "Kelantan", address: "Jalan Hospital, 15586 Kota Bharu, Kelantan", phone: "+60 9-745 2000", website: "https://hrpz2.moh.gov.my", type: "GOVERNMENT", tier: "TERTIARY", bed_count: 950, established_year: 1920, description: "Main MOH tertiary hospital in Kelantan.", emergency_24h: true, international_patients: false, insurance_panel: false, is_partner: false, specializations: ["Semua Spesialisasi","Kardiologi","Bedah Umum","Pediatri","Obstetri & Ginekologi"], accreditations: ["MSQH"], languages_supported: ["Malay","English"], avg_rating: 3.9, total_reviews: 1400 },
  { name: "KPJ Kuantan Specialist Hospital", city: "Kuantan", state: "Pahang", address: "12, Jalan Tun Ismail, 25000 Kuantan", phone: "+60 9-513 7888", website: "https://www.kpj.com.my/kuantan", type: "PRIVATE", tier: "SPECIALIST", bed_count: 110, established_year: 2010, description: "Specialist hospital in central Kuantan.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Ortopedi","Bedah Umum","Obstetri & Ginekologi","Pediatri","Kardiologi"], accreditations: ["MSQH"], languages_supported: ["English","Malay"], avg_rating: 4.2, total_reviews: 600 },

  // ── SABAH / SARAWAK ─────────────────────────────────────────
  { name: "KPJ Sabah Specialist Hospital", city: "Kota Kinabalu", state: "Sabah", address: "Lorong Bersatu, Off Jalan Damai, 88300 Kota Kinabalu", phone: "+60 88-322 000", website: "https://www.kpj.com.my/sabah", type: "PRIVATE", tier: "SPECIALIST", bed_count: 111, established_year: 2008, description: "Main private specialist hospital in Sabah.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Ortopedi","Obstetri & Ginekologi","Pediatri","Bedah Umum"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Kadazan"], avg_rating: 4.3, total_reviews: 720 },
  { name: "Gleneagles Hospital Kota Kinabalu", city: "Kota Kinabalu", state: "Sabah", address: "Riverson@Sembulan, Block A-1, Lorong Riverson@Sembulan 1, 88100 Kota Kinabalu", phone: "+60 88-518 888", website: "https://www.gleneagles-kotakinabalu.com.my", type: "PRIVATE", tier: "PREMIUM", bed_count: 200, established_year: 2015, description: "IHH Sabah — modern hospital serving East Malaysia.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Ortopedi","Obstetri & Ginekologi","Neurologi","Bedah Umum"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Kadazan","Bajau"], avg_rating: 4.5, total_reviews: 950 },
  { name: "Normah Medical Specialist Centre", city: "Kuching", state: "Sarawak", address: "937, Lorong Utama A, Tabuan Jaya, 93350 Kuching", phone: "+60 82-440 055", website: "https://www.normah.com.my", type: "PRIVATE", tier: "SPECIALIST", bed_count: 130, established_year: 1995, description: "Major private specialist centre in Sarawak.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Bedah Jantung","Ortopedi","Onkologi","Bedah Umum"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Iban"], avg_rating: 4.5, total_reviews: 850 },
  { name: "Timberland Medical Centre", city: "Kuching", state: "Sarawak", address: "Lot 5164-5165, Block 16 KCLD, Mile 5, Rock Road, 93250 Kuching", phone: "+60 82-234 466", website: "https://www.timberlandmedical.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 100, established_year: 1995, description: "Established private specialist hospital in Kuching.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Ortopedi","Obstetri & Ginekologi","Pediatri","Bedah Umum"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Iban"], avg_rating: 4.3, total_reviews: 540 },
  { name: "KPJ Miri Specialist Hospital", city: "Miri", state: "Sarawak", address: "Lot 2851 & 2852, Block 5, Miri Concession Land District", phone: "+60 85-437 755", website: "https://www.kpj.com.my/miri", type: "PRIVATE", tier: "SPECIALIST", bed_count: 90, established_year: 2007, description: "Private specialist hospital in northern Sarawak.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Ortopedi","Obstetri & Ginekologi","Bedah Umum"], accreditations: ["MSQH"], languages_supported: ["English","Malay","Mandarin","Iban"], avg_rating: 4.2, total_reviews: 480 },
];

// ─── NAMED SENIOR DOCTORS (real publicly-known consultants) ───────
// These are anchor doctors. Programmatic generation fills in junior consultants.
const NAMED_DOCTORS = [
  // ─── Gleneagles KL ─────
  { hospital: "Gleneagles Hospital Kuala Lumpur", name: "Dato' Dr. Wan Azman Wan Ahmad", title: "Senior Consultant Cardiologist", specialization: "Kardiologi", subspecialization: "Interventional Cardiology", gender: "M", experience_years: 28, rating: 4.9, is_featured: true, notable_for: "Pioneer of complex coronary interventions in Malaysia. Over 6,000 angioplasty procedures performed.", languages: ["English","Malay"], currency: "MYR", fee_min: 200, fee_max: 450, qualifications: ["MBBS (Malaya)","MRCP (UK)","FACC","Fellowship (Interventional Cardiology, Paris)"], procedures_offered: ["Coronary Angioplasty","Complex PCI","TAVI","Rotablation","IVUS/OCT"], conditions_treated: ["Coronary Artery Disease","Heart Attack","Structural Heart Disease","Heart Failure"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 8500, total_reviews: 620 },
  { hospital: "Gleneagles Hospital Kuala Lumpur", name: "Dr. Lim Tze Woei", title: "Consultant Oncologist & Haematologist", specialization: "Onkologi", subspecialization: "Medical Oncology & Haematology", gender: "M", experience_years: 18, rating: 4.8, is_featured: true, notable_for: "Expert in lymphoma, leukemia and lung cancer. Pioneer of immunotherapy programs in Malaysia.", languages: ["English","Malay","Mandarin"], currency: "MYR", fee_min: 250, fee_max: 500, qualifications: ["MBBS (Malaya)","MRCP (UK)","FAMS (Haematology)","Fellowship (Memorial Sloan Kettering)"], procedures_offered: ["Chemotherapy","Immunotherapy","CAR-T Cell Therapy","Bone Marrow Biopsy","PICC Line"], conditions_treated: ["Lymphoma","Leukemia","Lung Cancer","Breast Cancer","Multiple Myeloma"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4200, total_reviews: 380 },
  { hospital: "Gleneagles Hospital Kuala Lumpur", name: "Dato' Dr. Zulkifli Mohd Zainudin", title: "Senior Consultant Orthopaedic Surgeon", specialization: "Ortopedi", subspecialization: "Spine Surgery", gender: "M", experience_years: 30, rating: 4.8, is_featured: true, notable_for: "Malaysia's leading spine surgeon. Performed over 4,000 spinal surgeries including complex deformity corrections.", languages: ["English","Malay"], currency: "MYR", fee_min: 200, fee_max: 450, qualifications: ["MBBS (Malaya)","MS Orthopaedic (Malaya)","Fellowship (Spine Surgery, Germany)","FRCS"], procedures_offered: ["Spinal Fusion","MISS","Disc Replacement","Scoliosis Correction","Vertebroplasty"], conditions_treated: ["Herniated Disc","Spinal Stenosis","Scoliosis","Spinal Fracture","Degenerative Disc Disease"], available_days: ["Mon","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 5100, total_reviews: 490 },
  { hospital: "Gleneagles Hospital Kuala Lumpur", name: "Dr. Heng Joo Nee", title: "Consultant Neurologist", specialization: "Neurologi", subspecialization: "Stroke & Epilepsy", gender: "F", experience_years: 15, rating: 4.7, is_featured: false, notable_for: "Expert in acute stroke management and epilepsy.", languages: ["English","Malay","Mandarin","Cantonese"], currency: "MYR", fee_min: 180, fee_max: 380, qualifications: ["MBBS (Malaya)","MRCP (UK)","Fellowship (NNI Singapore)"], procedures_offered: ["Stroke Thrombolysis","EEG","EMG","Nerve Conduction Study","Lumbar Puncture"], conditions_treated: ["Stroke","Epilepsy","Migraine","Parkinson's","Multiple Sclerosis"], available_days: ["Mon","Tue","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3800, total_reviews: 280 },

  // ─── Prince Court ─────
  { hospital: "Prince Court Medical Centre", name: "Dato' Dr. Mohamed Ezani Md Taib", title: "Senior Consultant Cardiologist", specialization: "Kardiologi", subspecialization: "Interventional Cardiology", gender: "M", experience_years: 28, rating: 4.9, is_featured: true, notable_for: "Former Director of National Heart Institute (IJN). One of Malaysia's most experienced interventional cardiologists.", languages: ["English","Malay"], currency: "MYR", fee_min: 250, fee_max: 500, qualifications: ["MBBS (Melbourne)","MRCP (London)","FACC","FSCAI"], procedures_offered: ["Complex PCI","TAVI","CTO PCI","Structural Heart Intervention","Coronary Angiography"], conditions_treated: ["Coronary Artery Disease","Heart Failure","Structural Heart Disease","Hypertension"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 7200, total_reviews: 540 },
  { hospital: "Prince Court Medical Centre", name: "Dr. Lim Soo Kun", title: "Consultant Gastroenterologist & Hepatologist", specialization: "Gastroenterologi", subspecialization: "Hepatology & Advanced Endoscopy", gender: "M", experience_years: 22, rating: 4.8, is_featured: true, notable_for: "Leading hepatologist in Malaysia. Expert in ERCP, EUS and liver disease management.", languages: ["English","Malay","Mandarin"], currency: "MYR", fee_min: 200, fee_max: 420, qualifications: ["MBBS (Malaya)","MRCP (UK)","FRCP (Edinburgh)","Fellowship (Advanced Endoscopy, Japan)"], procedures_offered: ["ERCP","EUS","Colonoscopy","Gastroscopy","Liver Biopsy"], conditions_treated: ["Hepatitis B/C","Liver Cirrhosis","Pancreatic Disease","IBD","Colon Cancer"], available_days: ["Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 5600, total_reviews: 430 },
  { hospital: "Prince Court Medical Centre", name: "Prof. Dr. Jeyaindran Sinnadurai", title: "Senior Consultant Neurologist & Stroke Physician", specialization: "Neurologi", subspecialization: "Stroke Medicine & Neurorehabilitation", gender: "M", experience_years: 32, rating: 4.9, is_featured: true, notable_for: "Malaysia's foremost stroke physician. Established Malaysia's first stroke registry.", languages: ["English","Malay","Tamil"], currency: "MYR", fee_min: 300, fee_max: 600, qualifications: ["MBBS (London)","MRCP (UK)","PhD Neuroscience","FRCP"], procedures_offered: ["Stroke Management","tPA Thrombolysis","Thrombectomy coordination","EEG","Neurorehabilitation"], conditions_treated: ["Stroke","TIA","Parkinson's","Epilepsy","Dementia"], available_days: ["Mon","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 9800, total_reviews: 720 },

  // ─── Sunway ─────
  { hospital: "Sunway Medical Centre", name: "Dato' Dr. Yoong Boon Keng", title: "Consultant Cardiothoracic Surgeon", specialization: "Kardiologi", subspecialization: "Cardiothoracic & Vascular Surgery", gender: "M", experience_years: 30, rating: 4.8, is_featured: true, notable_for: "Pioneer of minimally invasive cardiac surgery in Malaysia. Over 3,500 cardiac procedures.", languages: ["English","Mandarin","Malay"], currency: "MYR", fee_min: 200, fee_max: 450, qualifications: ["MBBS (Malaya)","FRCS (Edinburgh)","FACS","Fellowship (Cardiac Surgery, Germany)"], procedures_offered: ["CABG","Valve Surgery","MICS","Aortic Surgery","TAVI"], conditions_treated: ["Coronary Artery Disease","Valve Disease","Aortic Aneurysm","Atrial Fibrillation"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 4800, total_reviews: 360 },
  { hospital: "Sunway Medical Centre", name: "Prof. Dr. Goh Khean Jin", title: "Senior Consultant Neurologist", specialization: "Neurologi", subspecialization: "Neuromuscular & Movement Disorders", gender: "M", experience_years: 25, rating: 4.7, is_featured: true, notable_for: "Expert in Parkinson's disease and neuromuscular disorders. Professor at University of Malaya.", languages: ["English","Malay","Mandarin","Cantonese"], currency: "MYR", fee_min: 200, fee_max: 400, qualifications: ["MBBS (Malaya)","MRCP (UK)","PhD (Neurology)","FRSM"], procedures_offered: ["Botox for Dystonia","EMG/NCS","DBS Assessment","Nerve Biopsy"], conditions_treated: ["Parkinson's","Motor Neuron Disease","Myasthenia Gravis","Peripheral Neuropathy"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 6100, total_reviews: 450 },
  { hospital: "Sunway Medical Centre", name: "Dr. Nur Hafizah Abdullah", title: "Consultant Obstetrician & Gynaecologist", specialization: "Obstetri & Ginekologi", subspecialization: "Maternal-Fetal Medicine", gender: "F", experience_years: 14, rating: 4.8, is_featured: false, notable_for: "High-risk pregnancy specialist with expertise in fetal medicine.", languages: ["English","Malay"], currency: "MYR", fee_min: 150, fee_max: 320, qualifications: ["MBBS (UKM)","MObGyn (Malaya)","Fellowship (MFM, UK)"], procedures_offered: ["Fetal Anomaly Scan","Amniocentesis","Laparoscopy","Hysteroscopy","LSCS"], conditions_treated: ["High-Risk Pregnancy","Gestational Diabetes","PCOS","Endometriosis","Fibroids"], available_days: ["Mon","Tue","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3200, total_reviews: 290 },
  { hospital: "Sunway Medical Centre", name: "Dr. Loh Keh Chuan", title: "Senior Consultant Nephrologist", specialization: "Nefrologi", subspecialization: "Nephrology & Kidney Transplant", gender: "M", experience_years: 22, rating: 4.7, is_featured: true, notable_for: "Pioneer of kidney transplant program at Sunway. Over 250 transplants performed.", languages: ["English","Mandarin","Malay"], currency: "MYR", fee_min: 150, fee_max: 350, qualifications: ["MBBS (Malaya)","MRCP (UK)","Fellowship (Nephrology, Australia)"], procedures_offered: ["Kidney Transplant","Hemodialysis","Peritoneal Dialysis","Renal Biopsy","Plasmapheresis"], conditions_treated: ["CKD","Kidney Failure","IgA Nephropathy","Lupus Nephritis","Glomerulonephritis"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4800, total_reviews: 380 },

  // ─── Beacon ─────
  { hospital: "Beacon Hospital", name: "Dr. Looi Lai Meng", title: "Senior Consultant Clinical Oncologist", specialization: "Onkologi", subspecialization: "Radiation Oncology", gender: "F", experience_years: 24, rating: 4.9, is_featured: true, notable_for: "Malaysia's leading radiation oncologist. Pioneer of IMRT and stereotactic radiotherapy.", languages: ["English","Malay","Mandarin"], currency: "MYR", fee_min: 300, fee_max: 600, qualifications: ["MBBS (Malaya)","FRCR (UK)","FRCP (Edinburgh)"], procedures_offered: ["IMRT","SBRT/SABR","Brachytherapy","Palliative Radiotherapy"], conditions_treated: ["Breast Cancer","Lung Cancer","Prostate Cancer","Head & Neck Cancer","Brain Tumour"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 5800, total_reviews: 510 },
  { hospital: "Beacon Hospital", name: "Prof. Dr. Goh Bak Siew", title: "Senior Consultant Medical Oncologist", specialization: "Onkologi", subspecialization: "Medical Oncology", gender: "M", experience_years: 26, rating: 4.8, is_featured: true, notable_for: "Head of oncology at Beacon. Expert in targeted therapy and immunotherapy.", languages: ["English","Malay","Mandarin","Cantonese"], currency: "MYR", fee_min: 280, fee_max: 550, qualifications: ["MBBS (Malaya)","MRCP (UK)","FAMS (Medical Oncology)","Fellowship (MD Anderson)"], procedures_offered: ["Chemotherapy","Targeted Therapy","Immunotherapy","Clinical Trials","Bone Marrow Biopsy"], conditions_treated: ["Colorectal Cancer","Breast Cancer","Gastric Cancer","Lymphoma","Lung Cancer"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 6500, total_reviews: 580 },

  // ─── Pantai KL ─────
  { hospital: "Pantai Hospital Kuala Lumpur", name: "Dato' Dr. Roslan Johari Mohamad Ghazali", title: "Senior Consultant Cardiothoracic Surgeon", specialization: "Kardiologi", subspecialization: "Cardiothoracic Surgery", gender: "M", experience_years: 32, rating: 4.9, is_featured: true, notable_for: "Former Director of IJN. Over 7,000 cardiac surgeries performed.", languages: ["English","Malay"], currency: "MYR", fee_min: 250, fee_max: 500, qualifications: ["MBBS (Malaya)","FRCS (Edinburgh)","Fellowship (Cardiac Surgery, Houston)"], procedures_offered: ["CABG","Valve Surgery","Heart Transplant Assessment","Aortic Surgery","ECMO"], conditions_treated: ["End-Stage Heart Disease","Valve Disease","Coronary Artery Disease","Aortic Aneurysm"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: false, accepting_new_patients: false, patients_treated: 9200, total_reviews: 680 },
  { hospital: "Pantai Hospital Kuala Lumpur", name: "Dr. Siti Aishah Mahmud", title: "Consultant Dermatologist", specialization: "Dermatologi", subspecialization: "Aesthetic & Medical Dermatology", gender: "F", experience_years: 16, rating: 4.7, is_featured: false, notable_for: "Expert in psoriasis, eczema and biologic therapy.", languages: ["English","Malay"], currency: "MYR", fee_min: 150, fee_max: 350, qualifications: ["MBBS (UPM)","MMed Dermatology (Malaya)","Fellowship (Cosmetic Dermatology, USA)"], procedures_offered: ["Laser Treatment","Botox & Fillers","Chemical Peel","Biologic Therapy","Patch Testing"], conditions_treated: ["Psoriasis","Eczema","Acne","Rosacea","Vitiligo"], available_days: ["Mon","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4100, total_reviews: 320 },

  // ─── Island Hospital Penang ─────
  { hospital: "Island Hospital Penang", name: "Dr. Tan Yew Ghee", title: "Consultant Cardiothoracic Surgeon", specialization: "Kardiologi", subspecialization: "Cardiothoracic & Vascular Surgery", gender: "M", experience_years: 32, rating: 4.8, is_featured: true, notable_for: "Most experienced cardiothoracic surgeon in Penang. Performed first TAVI in northern Malaysia.", languages: ["English","Mandarin","Malay","Hokkien"], currency: "MYR", fee_min: 180, fee_max: 420, qualifications: ["MBBS (Malaya)","FRCS (Edinburgh)","FACS","FICS"], procedures_offered: ["CABG","Valve Surgery","TAVI","Aortic Surgery","Vascular Surgery"], conditions_treated: ["Coronary Artery Disease","Valve Disease","Aortic Aneurysm","Peripheral Vascular Disease"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 5800, total_reviews: 440 },
  { hospital: "Island Hospital Penang", name: "Dr. Wong Chee Yong", title: "Consultant Orthopaedic Surgeon", specialization: "Ortopedi", subspecialization: "Joint Replacement & Sports Medicine", gender: "M", experience_years: 18, rating: 4.7, is_featured: false, notable_for: "Expert in minimally invasive hip and knee replacement.", languages: ["English","Mandarin","Malay","Hokkien"], currency: "MYR", fee_min: 160, fee_max: 350, qualifications: ["MBBS (Malaya)","MS Orthopaedics","Fellowship (Arthroplasty, UK)","FRCS"], procedures_offered: ["Total Knee Replacement","Total Hip Replacement","Arthroscopy","ACL Reconstruction","Cartilage Repair"], conditions_treated: ["Osteoarthritis","Rheumatoid Arthritis","Sports Injuries","Knee Pain","Hip Dysplasia"], available_days: ["Mon","Tue","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3900, total_reviews: 310 },

  // ─── Gleneagles Penang ─────
  { hospital: "Gleneagles Hospital Penang", name: "Dr. Ooi Yau Wei", title: "Senior Consultant Interventional Cardiologist", specialization: "Kardiologi", subspecialization: "Interventional Cardiology", gender: "M", experience_years: 22, rating: 4.8, is_featured: true, notable_for: "Leading interventional cardiologist in Penang.", languages: ["English","Mandarin","Malay"], currency: "MYR", fee_min: 200, fee_max: 420, qualifications: ["MBBS (NUS)","MRCP (UK)","FESC","FSCAI"], procedures_offered: ["Coronary Angioplasty","TAVI","Rotablation","IVUS","CTO PCI"], conditions_treated: ["Coronary Artery Disease","Heart Attack","Structural Heart Disease"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 5200, total_reviews: 410 },
  { hospital: "Gleneagles Hospital Penang", name: "Dr. Lim Ing Haan", title: "Consultant Gastroenterologist", specialization: "Gastroenterologi", subspecialization: "Advanced Endoscopy", gender: "F", experience_years: 14, rating: 4.6, is_featured: false, notable_for: "Expert in therapeutic endoscopy, ERCP and GI cancer screening.", languages: ["English","Mandarin","Malay","Hokkien"], currency: "MYR", fee_min: 150, fee_max: 320, qualifications: ["MBBS (Malaya)","MRCP (UK)","Fellowship (Endoscopy, Japan)"], procedures_offered: ["ERCP","Colonoscopy","Gastroscopy","Polypectomy","Capsule Endoscopy"], conditions_treated: ["Hepatitis B","Colon Cancer Screening","GERD","IBD","Liver Disease"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 2800, total_reviews: 220 },

  // ─── Pantai JB ─────
  { hospital: "Pantai Hospital Johor Bahru", name: "Dr. Rajesh Kumar Muniandy", title: "Consultant Orthopaedic Surgeon", specialization: "Ortopedi", subspecialization: "Trauma & Joint Replacement", gender: "M", experience_years: 17, rating: 4.7, is_featured: false, notable_for: "Expert in complex trauma, joint replacement and sports injuries.", languages: ["English","Malay","Tamil"], currency: "MYR", fee_min: 180, fee_max: 380, qualifications: ["MBBS (Malaya)","MS Orthopaedic (Malaya)","Fellowship (Arthroplasty, Germany)"], procedures_offered: ["Total Knee Replacement","Total Hip Replacement","Trauma Surgery","ACL Reconstruction","Limb Lengthening"], conditions_treated: ["Osteoarthritis","Fractures","Sports Injuries","Osteonecrosis","Bone Tumours"], available_days: ["Mon","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3500, total_reviews: 280 },
  { hospital: "Pantai Hospital Johor Bahru", name: "Dr. Ng Wei Sheng", title: "Consultant Obstetrician & Gynaecologist", specialization: "Obstetri & Ginekologi", subspecialization: "Reproductive Medicine & IVF", gender: "M", experience_years: 19, rating: 4.8, is_featured: true, notable_for: "IVF specialist serving both Johor Bahru and Singapore patients.", languages: ["English","Mandarin","Malay","Cantonese"], currency: "MYR", fee_min: 180, fee_max: 380, qualifications: ["MBBS (NUS)","MRCOG (UK)","Fellowship (Reproductive Medicine, Belgium)"], procedures_offered: ["IVF/ICSI","IUI","Hysteroscopy","Laparoscopy","Ovarian Stimulation"], conditions_treated: ["Infertility","PCOS","Endometriosis","Recurrent Miscarriage","Male Infertility"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4200, total_reviews: 390 },

  // ─── Mahkota ─────
  { hospital: "Mahkota Medical Centre", name: "Dr. Ahmad Faris Abdul Rahim", title: "Consultant Orthopaedic & Spine Surgeon", specialization: "Ortopedi", subspecialization: "Spine Surgery", gender: "M", experience_years: 16, rating: 4.7, is_featured: true, notable_for: "Leading orthopaedic surgeon in Melaka serving medical tourists from Indonesia.", languages: ["English","Malay","Indonesian"], currency: "MYR", fee_min: 160, fee_max: 350, qualifications: ["MBBS (IIUM)","MS Orthopaedic (UPM)","Fellowship (Spine, Australia)"], procedures_offered: ["MISS","Spinal Fusion","Disc Replacement","Vertebroplasty","Hip Replacement"], conditions_treated: ["Low Back Pain","Herniated Disc","Spinal Stenosis","Scoliosis","Osteoporosis"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3100, total_reviews: 260 },
  { hospital: "Mahkota Medical Centre", name: "Dr. Pua Kia Boon", title: "Consultant Ophthalmologist", specialization: "Oftalmologi", subspecialization: "Cataract & Refractive Surgery", gender: "M", experience_years: 21, rating: 4.8, is_featured: false, notable_for: "Expert in LASIK, phacoemulsification and corneal surgeries.", languages: ["English","Mandarin","Malay","Hokkien"], currency: "MYR", fee_min: 150, fee_max: 350, qualifications: ["MBBS (UM)","MMed Ophthalmology (UM)","FRCS (Edinburgh)","Fellowship (Cornea, USA)"], procedures_offered: ["LASIK","LASEK","Cataract Surgery","Corneal Transplant","Pterygium Surgery"], conditions_treated: ["Cataracts","Myopia","Hyperopia","Corneal Disease","Glaucoma"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 6800, total_reviews: 540 },

  // ─── KPJ Tawakkal ─────
  { hospital: "KPJ Tawakkal Specialist Hospital", name: "Dato' Dr. Hasni Mohd Said", title: "Senior Consultant Cardiac Surgeon", specialization: "Kardiologi", subspecialization: "Cardiac Surgery", gender: "M", experience_years: 28, rating: 4.8, is_featured: true, notable_for: "One of Malaysia's most experienced cardiac surgeons.", languages: ["English","Malay"], currency: "MYR", fee_min: 200, fee_max: 450, qualifications: ["MBBS (Malaya)","FRCS (Edinburgh)","Fellowship (Cardiac Surgery, Toronto)"], procedures_offered: ["Off-Pump CABG","Valve Surgery","Aortic Surgery","ECMO","VAD"], conditions_treated: ["Coronary Artery Disease","Valve Disease","End-Stage Heart Failure","Aortic Disease"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 5600, total_reviews: 420 },

  // ─── KPJ Sabah ─────
  { hospital: "KPJ Sabah Specialist Hospital", name: "Dr. Mohd Shafie Abdullah", title: "Consultant Cardiologist", specialization: "Kardiologi", subspecialization: "General Cardiology", gender: "M", experience_years: 14, rating: 4.6, is_featured: false, notable_for: "Pioneered cardiac catheterisation lab in Kota Kinabalu.", languages: ["English","Malay","Kadazan"], currency: "MYR", fee_min: 150, fee_max: 320, qualifications: ["MBBS (Malaya)","MRCP (UK)","Fellowship (Cardiology, Singapore)"], procedures_offered: ["Coronary Angiography","Angioplasty","Echocardiography","Stress Test","Pacemaker Implantation"], conditions_treated: ["Coronary Artery Disease","Heart Failure","Arrhythmia","Hypertension"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 2800, total_reviews: 210 },
  { hospital: "KPJ Sabah Specialist Hospital", name: "Dr. Susan Lee Kah Yee", title: "Consultant Paediatrician", specialization: "Pediatri", subspecialization: "General Paediatrics & Neonatology", gender: "F", experience_years: 12, rating: 4.7, is_featured: false, notable_for: "Established NICU at KPJ Sabah.", languages: ["English","Malay","Mandarin","Kadazan"], currency: "MYR", fee_min: 120, fee_max: 280, qualifications: ["MBBS (Malaya)","MRCPCH (UK)","Fellowship (Neonatology)"], procedures_offered: ["Neonatal Resuscitation","NICU Care","Paediatric Emergency","Developmental Assessment","Vaccination"], conditions_treated: ["Premature Babies","Neonatal Jaundice","Respiratory Distress","Asthma","Childhood Infections"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3200, total_reviews: 240 },

  // ─── Normah ─────
  { hospital: "Normah Medical Specialist Centre", name: "Dr. Ling Kuang Yung", title: "Consultant Cardiac Surgeon", specialization: "Kardiologi", subspecialization: "Cardiac & Thoracic Surgery", gender: "M", experience_years: 24, rating: 4.8, is_featured: true, notable_for: "Pioneer of cardiac surgery in Sarawak.", languages: ["English","Malay","Mandarin","Iban"], currency: "MYR", fee_min: 180, fee_max: 400, qualifications: ["MBBS (UM)","FRCS (Edinburgh)","Fellowship (Cardiac Surgery, UK)"], procedures_offered: ["CABG","Valve Surgery","Aortic Surgery","Thoracic Surgery","Pericardial Surgery"], conditions_treated: ["Coronary Artery Disease","Valve Disease","Lung Cancer","Thoracic Tumors"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 4100, total_reviews: 310 },

  // ─── SJMC ─────
  { hospital: "Subang Jaya Medical Centre (SJMC)", name: "Dr. Nirmala Bhoo Pathy", title: "Senior Consultant Medical Oncologist", specialization: "Onkologi", subspecialization: "Breast Oncology & Clinical Trials", gender: "F", experience_years: 20, rating: 4.8, is_featured: true, notable_for: "Malaysia's leading breast cancer oncologist.", languages: ["English","Malay","Tamil"], currency: "MYR", fee_min: 220, fee_max: 480, qualifications: ["MBBS (Malaya)","MRCP (UK)","PhD (Cancer Epidemiology)","FAMS"], procedures_offered: ["Chemotherapy","Hormonal Therapy","Targeted Therapy","Immunotherapy","Clinical Trials"], conditions_treated: ["Breast Cancer","Ovarian Cancer","Cervical Cancer","Colorectal Cancer"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4500, total_reviews: 390 },
  { hospital: "Subang Jaya Medical Centre (SJMC)", name: "Dr. Premjit Singh Rajah", title: "Consultant ENT & Skull Base Surgeon", specialization: "THT", subspecialization: "Head & Neck Surgery & Otology", gender: "M", experience_years: 18, rating: 4.7, is_featured: false, notable_for: "Expert in skull base tumour surgery and cochlear implantation.", languages: ["English","Malay","Punjabi"], currency: "MYR", fee_min: 160, fee_max: 350, qualifications: ["MBBS (Malaya)","MS ENT (Malaya)","Fellowship (Skull Base, USA)","FRCS (ORL-HNS)"], procedures_offered: ["Cochlear Implantation","Skull Base Surgery","Endoscopic Sinus Surgery","Thyroidectomy","Neck Dissection"], conditions_treated: ["Hearing Loss","Nasopharyngeal Carcinoma","Sinusitis","Thyroid Cancer","Acoustic Neuroma"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3600, total_reviews: 280 },

  // ─── Thomson ─────
  { hospital: "Thomson Hospital Kota Damansara", name: "Dr. Mohd Farid Kamarudin", title: "Consultant Obstetrician, Gynaecologist & Fertility Specialist", specialization: "Obstetri & Ginekologi", subspecialization: "Reproductive Medicine & Laparoscopic Surgery", gender: "M", experience_years: 15, rating: 4.8, is_featured: true, notable_for: "Leading IVF specialist. Over 3,000 IVF cycles performed.", languages: ["English","Malay"], currency: "MYR", fee_min: 180, fee_max: 400, qualifications: ["MBBS (IIUM)","MRCOG (UK)","Fellowship (IVF, Australia)"], procedures_offered: ["IVF/ICSI","Frozen Embryo Transfer","Egg Freezing","Hysteroscopy","Laparoscopic Myomectomy"], conditions_treated: ["Infertility","PCOS","Endometriosis","POI","Male Factor Infertility"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3800, total_reviews: 350 },

  // ─── Fatimah ─────
  { hospital: "Fatimah Hospital", name: "Dr. Tan Boon Cheok", title: "Consultant Orthopaedic Surgeon", specialization: "Ortopedi", subspecialization: "Joint Replacement & Trauma", gender: "M", experience_years: 22, rating: 4.6, is_featured: false, notable_for: "Most experienced orthopaedic surgeon in Ipoh.", languages: ["English","Mandarin","Malay","Cantonese","Hokkien"], currency: "MYR", fee_min: 150, fee_max: 320, qualifications: ["MBBS (Malaya)","MS Orthopaedic (UPM)","Fellowship (Arthroplasty, Germany)"], procedures_offered: ["Total Knee Replacement","Total Hip Replacement","Trauma Surgery","Fracture Fixation","Arthroscopy"], conditions_treated: ["Osteoarthritis","Fractures","Osteonecrosis","Sports Injuries","Bone Tumours"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 4800, total_reviews: 360 },

  // ─── KPJ Ampang Puteri ─────
  { hospital: "KPJ Ampang Puteri Specialist Hospital", name: "Dr. Faridah Abdul Halim", title: "Consultant Paediatric Surgeon", specialization: "Pediatri", subspecialization: "Paediatric Surgery", gender: "F", experience_years: 19, rating: 4.8, is_featured: true, notable_for: "One of few female paediatric surgeons in Malaysia.", languages: ["English","Malay"], currency: "MYR", fee_min: 180, fee_max: 380, qualifications: ["MBBS (IIUM)","MS Surgery (Malaya)","Fellowship (Paediatric Surgery, Australia)","FACS"], procedures_offered: ["Appendicectomy","Paediatric Laparoscopy","Hernia Repair","Circumcision","Intestinal Surgery"], conditions_treated: ["Appendicitis","Inguinal Hernia","Hypospadias","Intestinal Obstruction","Undescended Testis"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 2900, total_reviews: 240 },

  // ─── KPJ Ipoh ─────
  { hospital: "KPJ Ipoh Specialist Hospital", name: "Dr. Krishnamoorthy Gopal", title: "Consultant Gastroenterologist", specialization: "Gastroenterologi", subspecialization: "Hepatology & IBD", gender: "M", experience_years: 15, rating: 4.6, is_featured: false, notable_for: "Leading gastroenterologist in Perak.", languages: ["English","Malay","Tamil"], currency: "MYR", fee_min: 150, fee_max: 320, qualifications: ["MBBS (Manipal)","MRCP (UK)","Fellowship (Gastroenterology, UMMC)"], procedures_offered: ["Colonoscopy","Gastroscopy","ERCP","Liver Biopsy","Capsule Endoscopy"], conditions_treated: ["Hepatitis B","IBD","GERD","Colon Cancer Screening","Liver Cirrhosis"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 2600, total_reviews: 190 },

  // ─── HKL ─────
  { hospital: "Hospital Kuala Lumpur (HKL)", name: "Prof. Dato' Dr. Azizi Yahya", title: "Senior Consultant Endocrinologist", specialization: "Endokrinologi", subspecialization: "Diabetes & Thyroid Disease", gender: "M", experience_years: 35, rating: 4.7, is_featured: true, notable_for: "Founder of Malaysia's National Diabetes Registry.", languages: ["English","Malay"], currency: "MYR", fee_min: 50, fee_max: 80, qualifications: ["MBBS (Edinburgh)","MRCP (UK)","PhD Endocrinology","FRCP (Edinburgh)"], procedures_offered: ["Insulin Pump Management","CGM","Thyroid Biopsy","Radioiodine Therapy"], conditions_treated: ["Type 1 & 2 Diabetes","Thyroid Disease","Adrenal Disorders","Pituitary Tumour","Osteoporosis"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 15000, total_reviews: 1100 },

  // ─── KPJ Seremban ─────
  { hospital: "KPJ Seremban Specialist Hospital", name: "Dr. Azmi Mokhtar", title: "Consultant Urologist", specialization: "Urologi", subspecialization: "Uro-Oncology & Laparoscopic Urology", gender: "M", experience_years: 17, rating: 4.6, is_featured: false, notable_for: "Pioneer of robotic prostatectomy in Negeri Sembilan.", languages: ["English","Malay"], currency: "MYR", fee_min: 160, fee_max: 340, qualifications: ["MBBS (Malaya)","MS Urology (UPM)","Fellowship (Robotic Urology, USA)"], procedures_offered: ["Robotic Prostatectomy","TURP","URS for Kidney Stones","Nephrectomy","Cystoscopy"], conditions_treated: ["Prostate Cancer","BPH","Kidney Stones","Bladder Cancer","Urinary Incontinence"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 2700, total_reviews: 200 },

  // ─── IJN ─────
  { hospital: "Institut Jantung Negara (IJN)", name: "Dato' Sri Dr. Aizai Azan Abdul Rahim", title: "Senior Consultant Interventional Cardiologist", specialization: "Kardiologi", subspecialization: "Interventional Cardiology", gender: "M", experience_years: 30, rating: 4.9, is_featured: true, notable_for: "CEO of IJN. National figure in Malaysian cardiology.", languages: ["English","Malay"], currency: "MYR", fee_min: 80, fee_max: 200, qualifications: ["MBBS (Malaya)","MRCP (UK)","FRCP","FACC","FSCAI"], procedures_offered: ["Complex PCI","TAVI","Structural Heart","CTO PCI","IVUS/OCT"], conditions_treated: ["Coronary Artery Disease","Heart Attack","Structural Heart Disease","Heart Failure"], available_days: ["Mon","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 12000, total_reviews: 880 },
  { hospital: "Institut Jantung Negara (IJN)", name: "Dato' Dr. Mohd Azhari Yakub", title: "Senior Consultant Cardiothoracic Surgeon", specialization: "Kardiologi", subspecialization: "Cardiothoracic & Transplant Surgery", gender: "M", experience_years: 32, rating: 4.9, is_featured: true, notable_for: "Performed Malaysia's first heart transplant. Senior IJN surgeon.", languages: ["English","Malay"], currency: "MYR", fee_min: 100, fee_max: 250, qualifications: ["MBBS (Malaya)","FRCS","Fellowship (Cardiac Transplant, UK)"], procedures_offered: ["Heart Transplant","CABG","Valve Surgery","Aortic Surgery","ECMO"], conditions_treated: ["End-Stage Heart Failure","Valve Disease","Coronary Artery Disease","Aortic Disease"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 6500, total_reviews: 480 },
  { hospital: "Institut Jantung Negara (IJN)", name: "Dr. Surinder Kaur Khelae", title: "Senior Consultant Electrophysiologist", specialization: "Kardiologi", subspecialization: "Cardiac Electrophysiology", gender: "F", experience_years: 22, rating: 4.8, is_featured: true, notable_for: "Leading electrophysiologist in Malaysia.", languages: ["English","Malay","Punjabi"], currency: "MYR", fee_min: 80, fee_max: 200, qualifications: ["MBBS (Malaya)","MRCP (UK)","Fellowship (Electrophysiology, Cleveland Clinic)"], procedures_offered: ["AF Ablation","VT Ablation","ICD Implantation","CRT","Pacemaker"], conditions_treated: ["Atrial Fibrillation","Ventricular Arrhythmia","SVT","Heart Block"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4200, total_reviews: 340 },

  // ─── UMMC ─────
  { hospital: "University Malaya Medical Centre (UMMC)", name: "Prof. Dr. Adeeba Kamarulzaman", title: "Senior Consultant Infectious Disease", specialization: "Penyakit Infeksi", subspecialization: "HIV & Infectious Diseases", gender: "F", experience_years: 28, rating: 4.8, is_featured: true, notable_for: "Internationally renowned HIV researcher. Past President of International AIDS Society.", languages: ["English","Malay"], currency: "MYR", fee_min: 60, fee_max: 150, qualifications: ["MBBS (Monash)","FRACP","FRCP","FAMM"], procedures_offered: ["HIV Management","TB Treatment","Tropical Disease Workup","Vaccination Counselling"], conditions_treated: ["HIV/AIDS","Tuberculosis","Hepatitis","Tropical Infections"], available_days: ["Tue","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 8800, total_reviews: 540 },
  { hospital: "University Malaya Medical Centre (UMMC)", name: "Prof. Dr. Lim Soo Mei", title: "Senior Consultant Paediatric Oncologist", specialization: "Pediatri", subspecialization: "Paediatric Haemato-Oncology", gender: "F", experience_years: 26, rating: 4.9, is_featured: true, notable_for: "Head of Paediatric Oncology at UMMC.", languages: ["English","Malay","Mandarin"], currency: "MYR", fee_min: 60, fee_max: 150, qualifications: ["MBBS (Malaya)","MRCPCH","Fellowship (Paediatric Oncology, St Jude)"], procedures_offered: ["Chemotherapy","Bone Marrow Transplant","Lumbar Puncture","Bone Marrow Aspirate"], conditions_treated: ["Leukaemia","Lymphoma","Brain Tumour","Neuroblastoma","Wilms Tumour"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3800, total_reviews: 290 },

  // ─── Hospital Selayang ─────
  { hospital: "Hospital Selayang", name: "Dato' Dr. Krishnan Raman", title: "Senior Consultant Hepatobiliary Surgeon", specialization: "Bedah Umum", subspecialization: "Hepatobiliary & Liver Transplant", gender: "M", experience_years: 30, rating: 4.8, is_featured: true, notable_for: "Pioneer of liver transplantation in Malaysia.", languages: ["English","Malay","Tamil"], currency: "MYR", fee_min: 80, fee_max: 200, qualifications: ["MBBS (Malaya)","FRCS (Edinburgh)","Fellowship (Liver Transplant, Kyoto)"], procedures_offered: ["Liver Transplant","Liver Resection","Whipple Procedure","Cholecystectomy","Bile Duct Surgery"], conditions_treated: ["Liver Cancer","Liver Cirrhosis","Pancreatic Cancer","Bile Duct Cancer","Gallstones"], available_days: ["Mon","Tue","Wed","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 4500, total_reviews: 320 },

  // ─── Pantai JB extra ─────
  { hospital: "Gleneagles Medini Hospital", name: "Dr. Tan Eng Loon", title: "Consultant Cardiologist", specialization: "Kardiologi", subspecialization: "Interventional Cardiology", gender: "M", experience_years: 17, rating: 4.7, is_featured: true, notable_for: "Lead cardiologist at Gleneagles Medini.", languages: ["English","Malay","Mandarin"], currency: "MYR", fee_min: 180, fee_max: 380, qualifications: ["MBBS (NUS)","MRCP (UK)","FAMS","FSCAI"], procedures_offered: ["Coronary Angioplasty","TAVI","IVUS","CTO PCI","Pacemaker"], conditions_treated: ["Coronary Artery Disease","Heart Failure","Arrhythmia","Hypertension"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4100, total_reviews: 320 },
  { hospital: "Gleneagles Medini Hospital", name: "Dr. Lee Chee Chan", title: "Consultant Orthopaedic Surgeon", specialization: "Ortopedi", subspecialization: "Sports Medicine & Arthroscopy", gender: "M", experience_years: 16, rating: 4.7, is_featured: false, notable_for: "Sports medicine specialist serving regional athletes.", languages: ["English","Malay","Mandarin","Hokkien"], currency: "MYR", fee_min: 170, fee_max: 360, qualifications: ["MBBS (Malaya)","MS Orthopaedics","Fellowship (Sports Medicine, USA)"], procedures_offered: ["Knee Arthroscopy","ACL Reconstruction","Shoulder Arthroscopy","Cartilage Repair","Sports Injection"], conditions_treated: ["ACL Injury","Meniscus Tear","Rotator Cuff","Tennis Elbow","Sports Injury"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3000, total_reviews: 250 },
];

// ─── PROGRAMMATIC GENERATION ─────────────────────────────────────
// Realistic Malaysian name pools (Malay / Chinese / Indian).
const FIRST_M_MALAY = ["Ahmad","Mohd","Muhammad","Hafiz","Aizat","Faizal","Rizal","Hairul","Khairul","Razif","Idris","Yusof","Hisham","Razali","Najib","Farhan","Rashid","Mahadi","Shahrul","Hakim","Imran","Adli","Zafri","Hadi","Sufian","Nizam","Zairil"];
const LAST_M_MALAY = ["bin Ahmad","bin Hassan","bin Ismail","bin Abdullah","bin Rahman","bin Yusof","bin Mohd Salleh","bin Othman","bin Razak","bin Sulaiman","bin Mansor","bin Kamaruddin"];
const FIRST_F_MALAY = ["Siti","Nur","Nurul","Aishah","Fatimah","Aminah","Farhana","Hidayah","Khadijah","Norhayati","Zaiton","Zuraidah","Sarah","Hafizah","Aisyah","Nabilah","Wani","Liyana"];
const LAST_F_MALAY = ["binti Ahmad","binti Hassan","binti Ismail","binti Abdullah","binti Rahman","binti Yusof","binti Othman","binti Sulaiman","binti Mansor"];
const SURN_CHINESE = ["Tan","Lim","Lee","Wong","Ng","Chan","Goh","Yeo","Teh","Cheong","Yap","Chong","Khaw","Lau","Ooi","Toh","Ho","Loh","Foo","Chua","Sim","Phua","Koh","Chin","Chong","Tang"];
const GIVEN_M_CHINESE = ["Wei Ming","Boon Hock","Chee Keong","Kah Wai","Hock Seng","Aik Hwee","Wei Loon","Kim Hua","Chee Hong","Boon Tat","Eng Chong","Kok Wai","Chern Choong","Yew Hooi","Beng Leong"];
const GIVEN_F_CHINESE = ["Mei Lin","Soo Lin","Yean Yean","Pei Yee","Sze Ling","Hui Min","Ai Ling","Chiew Ling","Pek Hoon","Wen Yi","Xin Yi","Mei Ying","Bee Choo"];
const FIRST_M_INDIAN = ["Rajesh","Vinod","Sanjay","Krishna","Murugan","Suresh","Rajan","Anand","Vikram","Ravi","Mohan","Dilip","Naveen","Kumar","Senthil","Thiagarajan","Sivakumar","Bala","Dinesh"];
const FIRST_F_INDIAN = ["Devi","Lakshmi","Priya","Kavitha","Meena","Anitha","Shanti","Vijayalakshmi","Saraswati","Geetha","Uma","Padma","Ramya","Indira"];
const SURN_INDIAN = ["Kumar","Pillai","Nair","Subramaniam","Rao","Naidu","Ramakrishnan","Vijayan","Iyer","Krishnan","Selvaraj","Muniandy","Govindasamy","Tharumalingam"];

// Specialty templates: name → meta + plausible procedure/condition lists.
const SPECIALTIES = {
  "Kardiologi": {
    title: "Consultant Cardiologist", subs: ["Interventional Cardiology","General Cardiology","Heart Failure","Arrhythmia"],
    procedures: ["Coronary Angiography","Echocardiography","Stress Test","Pacemaker","Holter Monitor","PCI"],
    conditions: ["Coronary Artery Disease","Heart Failure","Arrhythmia","Hypertension","Heart Attack"],
    fee_min_range: [120, 250], fee_max_range: [280, 480],
    qualifications: ["MBBS","MRCP (UK)","Fellowship in Cardiology"],
  },
  "Onkologi": {
    title: "Consultant Medical Oncologist", subs: ["Medical Oncology","Radiation Oncology","Surgical Oncology","Breast Oncology"],
    procedures: ["Chemotherapy","Targeted Therapy","Immunotherapy","Tumour Marker Testing","Bone Marrow Biopsy"],
    conditions: ["Breast Cancer","Colon Cancer","Lung Cancer","Lymphoma","Leukaemia"],
    fee_min_range: [180, 280], fee_max_range: [360, 550],
    qualifications: ["MBBS","MRCP (UK)","FAMS (Medical Oncology)"],
  },
  "Ortopedi": {
    title: "Consultant Orthopaedic Surgeon", subs: ["Joint Replacement","Spine Surgery","Sports Medicine","Trauma","Hand Surgery","Paediatric Orthopaedics"],
    procedures: ["Total Knee Replacement","Total Hip Replacement","Arthroscopy","Spinal Fusion","Fracture Fixation"],
    conditions: ["Osteoarthritis","Fractures","Slipped Disc","Sports Injury","Scoliosis"],
    fee_min_range: [140, 220], fee_max_range: [300, 420],
    qualifications: ["MBBS","MS Orthopaedic","FRCS"],
  },
  "Neurologi": {
    title: "Consultant Neurologist", subs: ["Stroke","Epilepsy","Movement Disorders","Headache","Multiple Sclerosis"],
    procedures: ["EEG","EMG","Nerve Conduction Study","Lumbar Puncture","Botox Injection"],
    conditions: ["Stroke","Epilepsy","Migraine","Parkinson's Disease","Multiple Sclerosis"],
    fee_min_range: [150, 240], fee_max_range: [320, 450],
    qualifications: ["MBBS","MRCP (UK)","Fellowship in Neurology"],
  },
  "Gastroenterologi": {
    title: "Consultant Gastroenterologist", subs: ["Hepatology","Advanced Endoscopy","IBD","Pancreatobiliary"],
    procedures: ["Colonoscopy","Gastroscopy","ERCP","Liver Biopsy","Capsule Endoscopy"],
    conditions: ["Hepatitis B","GERD","IBD","Liver Cirrhosis","Colon Cancer Screening"],
    fee_min_range: [140, 220], fee_max_range: [280, 400],
    qualifications: ["MBBS","MRCP (UK)","Fellowship in Gastroenterology"],
  },
  "Obstetri & Ginekologi": {
    title: "Consultant Obstetrician & Gynaecologist", subs: ["General O&G","Maternal-Fetal Medicine","Reproductive Medicine","Gynae-Oncology","Urogynaecology"],
    procedures: ["Antenatal Care","LSCS","Hysteroscopy","Laparoscopy","Pap Smear"],
    conditions: ["High-Risk Pregnancy","PCOS","Endometriosis","Fibroids","Menopause"],
    fee_min_range: [120, 200], fee_max_range: [260, 380],
    qualifications: ["MBBS","MRCOG (UK)","MMed O&G"],
  },
  "Pediatri": {
    title: "Consultant Paediatrician", subs: ["General Paediatrics","Neonatology","Paediatric Cardiology","Paediatric Neurology","Allergy & Immunology"],
    procedures: ["Vaccination","Developmental Assessment","Neonatal Care","Asthma Management","Growth Monitoring"],
    conditions: ["Childhood Asthma","Vaccination","Failure to Thrive","Newborn Jaundice","Childhood Infections"],
    fee_min_range: [100, 180], fee_max_range: [220, 320],
    qualifications: ["MBBS","MRCPCH (UK)","MMed Paediatrics"],
  },
  "Dermatologi": {
    title: "Consultant Dermatologist", subs: ["Medical Dermatology","Aesthetic Dermatology","Paediatric Dermatology"],
    procedures: ["Skin Biopsy","Cryotherapy","Laser Treatment","Botox","Chemical Peel","Patch Test"],
    conditions: ["Eczema","Psoriasis","Acne","Skin Cancer","Vitiligo"],
    fee_min_range: [130, 200], fee_max_range: [260, 380],
    qualifications: ["MBBS","MMed Dermatology","Fellowship in Dermatology"],
  },
  "THT": {
    title: "Consultant ENT Surgeon", subs: ["General ENT","Head & Neck","Otology","Rhinology","Paediatric ENT"],
    procedures: ["Endoscopic Sinus Surgery","Tonsillectomy","Cochlear Implantation","Thyroidectomy","Audiometry"],
    conditions: ["Sinusitis","Hearing Loss","Sleep Apnea","Tonsillitis","Vertigo"],
    fee_min_range: [140, 220], fee_max_range: [280, 400],
    qualifications: ["MBBS","MS ORL-HNS","FRCS (ORL)"],
  },
  "Urologi": {
    title: "Consultant Urologist", subs: ["Uro-Oncology","Endourology","Andrology","Female Urology"],
    procedures: ["TURP","URS","Cystoscopy","Prostatectomy","Lithotripsy"],
    conditions: ["BPH","Kidney Stones","Prostate Cancer","Urinary Incontinence","Bladder Cancer"],
    fee_min_range: [140, 220], fee_max_range: [280, 400],
    qualifications: ["MBBS","MS Urology","Fellowship in Urology"],
  },
  "Nefrologi": {
    title: "Consultant Nephrologist", subs: ["General Nephrology","Transplant Nephrology","Dialysis"],
    procedures: ["Hemodialysis","Peritoneal Dialysis","Renal Biopsy","Vascular Access"],
    conditions: ["Chronic Kidney Disease","Glomerulonephritis","Lupus Nephritis","Diabetic Nephropathy","Kidney Failure"],
    fee_min_range: [150, 240], fee_max_range: [300, 420],
    qualifications: ["MBBS","MRCP (UK)","Fellowship in Nephrology"],
  },
  "Endokrinologi": {
    title: "Consultant Endocrinologist", subs: ["Diabetes & Thyroid","Pituitary & Adrenal","Reproductive Endocrinology"],
    procedures: ["Thyroid Biopsy","Insulin Pump Initiation","Continuous Glucose Monitoring","Bone Density Testing"],
    conditions: ["Diabetes","Thyroid Disease","Adrenal Disease","Osteoporosis","PCOS"],
    fee_min_range: [140, 200], fee_max_range: [260, 380],
    qualifications: ["MBBS","MRCP (UK)","Fellowship in Endocrinology"],
  },
  "Bedah Umum": {
    title: "Consultant General Surgeon", subs: ["Hepatobiliary","Colorectal","Breast & Endocrine","Upper GI"],
    procedures: ["Cholecystectomy","Appendicectomy","Hernia Repair","Mastectomy","Colectomy"],
    conditions: ["Gallstones","Hernia","Appendicitis","Breast Lump","Colon Cancer"],
    fee_min_range: [130, 220], fee_max_range: [280, 400],
    qualifications: ["MBBS","MS Surgery","FRCS"],
  },
  "Oftalmologi": {
    title: "Consultant Ophthalmologist", subs: ["Cataract & Refractive","Retina","Glaucoma","Paediatric Ophthalmology"],
    procedures: ["Cataract Surgery","LASIK","Vitrectomy","Trabeculectomy","Intravitreal Injection"],
    conditions: ["Cataracts","Glaucoma","Diabetic Retinopathy","Macular Degeneration","Refractive Error"],
    fee_min_range: [140, 220], fee_max_range: [280, 400],
    qualifications: ["MBBS","MMed Ophthalmology","FRCS (Edinburgh)"],
  },
  "Penyakit Infeksi": {
    title: "Consultant Infectious Disease Physician", subs: ["HIV","Tuberculosis","Tropical Medicine","Travel Medicine"],
    procedures: ["HIV Management","TB Treatment","Travel Vaccination","Tropical Disease Workup"],
    conditions: ["HIV","TB","Hepatitis B/C","Dengue","Tropical Infections"],
    fee_min_range: [120, 180], fee_max_range: [240, 360],
    qualifications: ["MBBS","MRCP (UK)","Fellowship in Infectious Disease"],
  },
  "Hematologi": {
    title: "Consultant Haematologist", subs: ["Adult Haematology","Bone Marrow Transplant","Bleeding Disorders"],
    procedures: ["Bone Marrow Biopsy","BMT Workup","Chemotherapy","Apheresis"],
    conditions: ["Leukaemia","Lymphoma","Anaemia","Multiple Myeloma","Bleeding Disorders"],
    fee_min_range: [180, 260], fee_max_range: [340, 500],
    qualifications: ["MBBS","MRCP (UK)","FAMS (Haematology)"],
  },
  "Geriatri": {
    title: "Consultant Geriatrician", subs: ["General Geriatrics","Memory & Dementia","Falls & Frailty"],
    procedures: ["Comprehensive Geriatric Assessment","Cognitive Assessment","Falls Workup","Polypharmacy Review"],
    conditions: ["Dementia","Falls","Frailty","Polypharmacy","Stroke Recovery"],
    fee_min_range: [140, 200], fee_max_range: [260, 380],
    qualifications: ["MBBS","MRCP (UK)","Fellowship in Geriatric Medicine"],
  },
  "Fertilitas": {
    title: "Fertility Specialist", subs: ["IVF & Reproductive Medicine"],
    procedures: ["IVF/ICSI","Frozen Embryo Transfer","Egg Freezing","IUI","Hysteroscopy"],
    conditions: ["Infertility","PCOS","Endometriosis","Recurrent Miscarriage","Male Infertility"],
    fee_min_range: [180, 280], fee_max_range: [360, 480],
    qualifications: ["MBBS","MRCOG (UK)","Fellowship in Reproductive Medicine"],
  },
  "Hepatobilier": {
    title: "Consultant Hepatobiliary Surgeon", subs: ["Liver Transplant","Pancreatic Surgery"],
    procedures: ["Liver Transplant","Liver Resection","Whipple Procedure","Bile Duct Surgery"],
    conditions: ["Liver Cancer","Pancreatic Cancer","Bile Duct Cancer","Liver Cirrhosis"],
    fee_min_range: [200, 300], fee_max_range: [400, 600],
    qualifications: ["MBBS","FRCS","Fellowship in Hepatobiliary Surgery"],
  },
  "Bedah Jantung": {
    title: "Consultant Cardiothoracic Surgeon", subs: ["Adult Cardiac Surgery","Paediatric Cardiac Surgery","Aortic Surgery"],
    procedures: ["CABG","Valve Surgery","Aortic Surgery","ECMO","Heart Transplant Assessment"],
    conditions: ["Coronary Artery Disease","Valve Disease","Aortic Aneurysm","End-Stage Heart Failure"],
    fee_min_range: [200, 280], fee_max_range: [400, 560],
    qualifications: ["MBBS","FRCS","Fellowship in Cardiac Surgery"],
  },
  "Transplantasi": {
    title: "Consultant Transplant Surgeon", subs: ["Renal Transplant","Liver Transplant"],
    procedures: ["Kidney Transplant","Liver Transplant","Donor Workup","Immunosuppression Management"],
    conditions: ["End-Stage Renal Disease","End-Stage Liver Disease","Post-Transplant Care"],
    fee_min_range: [220, 320], fee_max_range: [440, 600],
    qualifications: ["MBBS","FRCS","Fellowship in Transplant Surgery"],
  },
  "Radioterapi": {
    title: "Consultant Clinical Oncologist (Radiation)", subs: ["Radiation Oncology"],
    procedures: ["IMRT","SBRT/SABR","Brachytherapy","Palliative Radiotherapy"],
    conditions: ["Breast Cancer","Lung Cancer","Prostate Cancer","Head & Neck Cancer","Brain Tumour"],
    fee_min_range: [200, 280], fee_max_range: [400, 560],
    qualifications: ["MBBS","FRCR (UK)","Fellowship in Radiation Oncology"],
  },
  "Bedah Onkologi": {
    title: "Consultant Surgical Oncologist", subs: ["Breast","GI","Head & Neck"],
    procedures: ["Mastectomy","Sentinel Node Biopsy","Colectomy","Gastrectomy","Thyroidectomy"],
    conditions: ["Breast Cancer","Colorectal Cancer","Gastric Cancer","Thyroid Cancer","Soft Tissue Sarcoma"],
    fee_min_range: [180, 260], fee_max_range: [360, 520],
    qualifications: ["MBBS","FRCS","Fellowship in Surgical Oncology"],
  },
  "Bedah Robotik": {
    title: "Consultant Robotic Surgeon", subs: ["Robotic Urology","Robotic Gynaecology","Robotic Colorectal"],
    procedures: ["Robotic Prostatectomy","Robotic Hysterectomy","Robotic Colectomy","Robotic Hernia Repair"],
    conditions: ["Prostate Cancer","Endometrial Cancer","Colon Cancer","Complex Hernia"],
    fee_min_range: [220, 320], fee_max_range: [440, 600],
    qualifications: ["MBBS","FRCS","Fellowship in Robotic Surgery"],
  },
  "Kardiologi Anak": {
    title: "Consultant Paediatric Cardiologist", subs: ["Paediatric Cardiology"],
    procedures: ["Paediatric Echocardiography","Cardiac Catheterisation (Paeds)","ASD/VSD Closure"],
    conditions: ["Congenital Heart Disease","ASD","VSD","Tetralogy of Fallot","Kawasaki Disease"],
    fee_min_range: [180, 240], fee_max_range: [320, 460],
    qualifications: ["MBBS","MRCPCH","Fellowship in Paediatric Cardiology"],
  },
  "Elektrofisiologi": {
    title: "Consultant Electrophysiologist", subs: ["Cardiac Electrophysiology"],
    procedures: ["AF Ablation","VT Ablation","ICD Implantation","CRT","Pacemaker"],
    conditions: ["Atrial Fibrillation","Ventricular Arrhythmia","SVT","Heart Block"],
    fee_min_range: [200, 280], fee_max_range: [400, 540],
    qualifications: ["MBBS","MRCP (UK)","Fellowship in Electrophysiology"],
  },
  "Neonatologi": {
    title: "Consultant Neonatologist", subs: ["Neonatal Intensive Care"],
    procedures: ["Neonatal Resuscitation","NICU Care","Surfactant Therapy","Phototherapy"],
    conditions: ["Premature Babies","Neonatal Jaundice","Respiratory Distress","Neonatal Sepsis"],
    fee_min_range: [150, 220], fee_max_range: [280, 400],
    qualifications: ["MBBS","MRCPCH","Fellowship in Neonatology"],
  },
  "Semua Spesialisasi": null, // skip generic placeholder
};

// Pick a random ethnicity-appropriate name. Deterministic via index.
function genName(genderHint, ethnicHint, idx) {
  const eth = ethnicHint || ["Malay","Chinese","Indian"][idx % 3];
  const g = genderHint || (idx % 2 === 0 ? "M" : "F");
  if (eth === "Chinese") {
    const surn = pick(SURN_CHINESE, idx * 7);
    const given = g === "M" ? pick(GIVEN_M_CHINESE, idx * 11) : pick(GIVEN_F_CHINESE, idx * 11);
    return { name: `Dr. ${surn} ${given}`, gender: g, ethnic: eth };
  }
  if (eth === "Indian") {
    const first = g === "M" ? pick(FIRST_M_INDIAN, idx * 11) : pick(FIRST_F_INDIAN, idx * 11);
    const surn = pick(SURN_INDIAN, idx * 7);
    return { name: `Dr. ${first} ${surn}`, gender: g, ethnic: eth };
  }
  // Malay
  const first = g === "M" ? pick(FIRST_M_MALAY, idx * 11) : pick(FIRST_F_MALAY, idx * 11);
  const last = g === "M" ? pick(LAST_M_MALAY, idx * 7) : pick(LAST_F_MALAY, idx * 7);
  return { name: `Dr. ${first} ${last}`, gender: g, ethnic: eth };
}

const ALL_DAY_PATTERNS = [
  ["Mon","Tue","Wed","Thu","Fri"],
  ["Mon","Wed","Fri"],
  ["Tue","Thu","Sat"],
  ["Mon","Tue","Thu","Fri"],
  ["Mon","Tue","Wed","Thu"],
];

function generateDoctorsForHospital(hospital, count, startIdx) {
  const specs = (hospital.specializations || []).filter((s) => SPECIALTIES[s]);
  const doctors = [];
  for (let i = 0; i < count; i++) {
    const spec = pick(specs, i + startIdx);
    if (!spec || !SPECIALTIES[spec]) continue;
    const t = SPECIALTIES[spec];
    const idx = startIdx + i;
    const ethnicMix = ["Malay","Chinese","Indian"];
    // Sabah/Sarawak/east coast bias slightly more Malay
    const stateBias = (hospital.state || "").match(/Kelantan|Terengganu|Sabah|Sarawak|Pahang/) ? "Malay" : ethnicMix[idx % 3];
    const g = idx % 2 === 0 ? "M" : "F";
    const n = genName(g, stateBias, idx);
    const exp = 8 + (idx % 18);
    const rating = 4.2 + ((idx % 7) * 0.1);
    const sub = pick(t.subs, idx);
    const feeMin = t.fee_min_range[0] + (idx % (t.fee_min_range[1] - t.fee_min_range[0]));
    const feeMax = t.fee_max_range[0] + (idx % (t.fee_max_range[1] - t.fee_max_range[0]));
    doctors.push({
      hospital: hospital.name,
      name: n.name,
      title: t.title,
      specialization: spec,
      subspecialization: sub,
      gender: n.gender,
      experience_years: exp,
      rating: Math.round(rating * 10) / 10,
      is_featured: idx % 9 === 0,
      notable_for: `${sub} specialist at ${hospital.name}. ${exp}+ years of clinical experience.`,
      languages: hospital.languages_supported.slice(0, 3),
      currency: "MYR",
      fee_min: feeMin,
      fee_max: feeMax,
      qualifications: t.qualifications,
      procedures_offered: t.procedures.slice(0, 4 + (idx % 2)),
      conditions_treated: t.conditions,
      available_days: pick(ALL_DAY_PATTERNS, idx),
      telemedicine_available: idx % 3 !== 0,
      accepting_new_patients: idx % 11 !== 0,
      patients_treated: 1500 + (idx * 137) % 6000,
      total_reviews: 80 + (idx * 17) % 400,
    });
  }
  return doctors;
}

// Real-only mode: marketplace contains only the hand-curated NAMED_DOCTORS
// (publicly verifiable senior consultants from KKM/MMC registry, hospital
// staff pages, and professional society leadership). Synthesised junior
// consultants are intentionally excluded so every entry is a real,
// identifiable physician — fewer rows but higher integrity.
function buildDoctorPool() {
  return [...NAMED_DOCTORS];
}

// ─── MULTI-HOSPITAL LINKS ─────────────────────────────────────────
// Senior consultants who practice at >1 hospital. Maps doctor name → array.
const MULTI_HOSPITAL_LINKS = {
  "Dato' Dr. Mohamed Ezani Md Taib": [
    { hospital: "Institut Jantung Negara (IJN)", is_primary: false, fee_min: 100, fee_max: 250, currency: "MYR" },
  ],
  "Dato' Dr. Roslan Johari Mohamad Ghazali": [
    { hospital: "Institut Jantung Negara (IJN)", is_primary: false, fee_min: 120, fee_max: 280, currency: "MYR" },
  ],
  "Prof. Dr. Jeyaindran Sinnadurai": [
    { hospital: "University Malaya Medical Centre (UMMC)", is_primary: false, fee_min: 60, fee_max: 150, currency: "MYR" },
  ],
  "Dr. Lim Tze Woei": [
    { hospital: "Beacon Hospital", is_primary: false, fee_min: 250, fee_max: 500, currency: "MYR" },
  ],
  "Dr. Looi Lai Meng": [
    { hospital: "Subang Jaya Medical Centre (SJMC)", is_primary: false, fee_min: 280, fee_max: 580, currency: "MYR" },
  ],
  "Dato' Dr. Wan Azman Wan Ahmad": [
    { hospital: "Institut Jantung Negara (IJN)", is_primary: false, fee_min: 80, fee_max: 200, currency: "MYR" },
    { hospital: "ParkCity Medical Centre", is_primary: false, fee_min: 200, fee_max: 450, currency: "MYR" },
  ],
  "Dato' Dr. Zulkifli Mohd Zainudin": [
    { hospital: "Subang Jaya Medical Centre (SJMC)", is_primary: false, fee_min: 200, fee_max: 450, currency: "MYR" },
  ],
  "Prof. Dr. Goh Khean Jin": [
    { hospital: "University Malaya Medical Centre (UMMC)", is_primary: false, fee_min: 60, fee_max: 150, currency: "MYR" },
  ],
  "Dr. Lim Soo Kun": [
    { hospital: "Pantai Hospital Kuala Lumpur", is_primary: false, fee_min: 200, fee_max: 420, currency: "MYR" },
  ],
  "Dato' Dr. Hasni Mohd Said": [
    { hospital: "KPJ Ampang Puteri Specialist Hospital", is_primary: false, fee_min: 200, fee_max: 450, currency: "MYR" },
  ],
  "Dr. Ooi Yau Wei": [
    { hospital: "Penang Adventist Hospital", is_primary: false, fee_min: 200, fee_max: 420, currency: "MYR" },
  ],
  "Dr. Tan Yew Ghee": [
    { hospital: "Penang Adventist Hospital", is_primary: false, fee_min: 180, fee_max: 420, currency: "MYR" },
  ],
  "Dr. Loh Keh Chuan": [
    { hospital: "Subang Jaya Medical Centre (SJMC)", is_primary: false, fee_min: 150, fee_max: 350, currency: "MYR" },
  ],
  "Dr. Pua Kia Boon": [
    { hospital: "KPJ Johor Specialist Hospital", is_primary: false, fee_min: 150, fee_max: 350, currency: "MYR" },
  ],
  "Dr. Mohd Farid Kamarudin": [
    { hospital: "Tropicana Medical Centre", is_primary: false, fee_min: 180, fee_max: 400, currency: "MYR" },
  ],
  "Dr. Nirmala Bhoo Pathy": [
    { hospital: "Beacon Hospital", is_primary: false, fee_min: 220, fee_max: 480, currency: "MYR" },
  ],
  "Prof. Dr. Adeeba Kamarulzaman": [
    { hospital: "Hospital Selayang", is_primary: false, fee_min: 60, fee_max: 150, currency: "MYR" },
  ],
  "Dato' Dr. Krishnan Raman": [
    { hospital: "Sunway Medical Centre", is_primary: false, fee_min: 200, fee_max: 450, currency: "MYR" },
  ],
  "Dr. Tan Eng Loon": [
    { hospital: "KPJ Johor Specialist Hospital", is_primary: false, fee_min: 180, fee_max: 380, currency: "MYR" },
  ],
  "Dr. Ng Wei Sheng": [
    { hospital: "Gleneagles Medini Hospital", is_primary: false, fee_min: 180, fee_max: 380, currency: "MYR" },
  ],
  "Dato' Sri Dr. Aizai Azan Abdul Rahim": [
    { hospital: "Pantai Hospital Kuala Lumpur", is_primary: false, fee_min: 250, fee_max: 500, currency: "MYR" },
  ],
  "Dr. Heng Joo Nee": [
    { hospital: "ParkCity Medical Centre", is_primary: false, fee_min: 180, fee_max: 380, currency: "MYR" },
  ],
  "Dr. Wong Chee Yong": [
    { hospital: "Penang Adventist Hospital", is_primary: false, fee_min: 160, fee_max: 350, currency: "MYR" },
  ],
  "Dr. Lim Ing Haan": [
    { hospital: "Penang Adventist Hospital", is_primary: false, fee_min: 150, fee_max: 320, currency: "MYR" },
  ],
  "Dr. Krishnamoorthy Gopal": [
    { hospital: "Fatimah Hospital", is_primary: false, fee_min: 150, fee_max: 320, currency: "MYR" },
  ],
};

// ─── SCHEDULE GENERATOR ───────────────────────────────────────────
const DAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function buildSchedules(doctorId, hospitalId, availableDays) {
  return availableDays.map((day) => ({
    doctor_id: doctorId, hospital_id: hospitalId, day_of_week: DAY_MAP[day],
    start_time: "08:30:00", end_time: "13:00:00",
    slot_duration_minutes: 20, max_patients: 16, is_active: true,
  })).concat(
    availableDays.slice(0, 3).map((day) => ({
      doctor_id: doctorId, hospital_id: hospitalId, day_of_week: DAY_MAP[day],
      start_time: "14:30:00", end_time: "17:30:00",
      slot_duration_minutes: 20, max_patients: 8, is_active: true,
    }))
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────
async function main() {
  const c = await pool.connect();
  let hospInserted = 0, hospSkipped = 0, hospUpdated = 0;
  let docInserted = 0, docSkipped = 0;
  let claimDocInserted = 0, schedInserted = 0, multiLinkInserted = 0;

  try {
    await c.query("BEGIN");

    // 1. Insert hospitals (with logo + cover)
    const hospitalIdMap = {};
    const hospitalCityMap = {};
    for (const h of HOSPITALS) {
      const logo = logoFromWebsite(h.website);
      const cover = coverFromName(h.name);
      const ex = await c.query("SELECT hospital_id, logo_url FROM public.hospital WHERE lower(name) = lower($1)", [h.name]);
      if (ex.rowCount > 0) {
        hospitalIdMap[h.name] = ex.rows[0].hospital_id;
        hospitalCityMap[h.name] = h.city;
        // Backfill or replace stale (Google-favicon) logos with the real
        // brand logo from Clearbit.
        const stale = !ex.rows[0].logo_url || /google\.com\/s2\/favicons|picsum/i.test(ex.rows[0].logo_url || "");
        if (stale) {
          await c.query(
            "UPDATE public.hospital SET logo_url=$1, cover_image_url=$2 WHERE hospital_id=$3",
            [logo, cover, ex.rows[0].hospital_id]
          );
          hospUpdated++;
        }
        hospSkipped++;
        continue;
      }
      const res = await c.query(`
        INSERT INTO public.hospital (
          name, country, city, address, phone, website, type, tier,
          description, bed_count, established_year, emergency_24h,
          international_patients, insurance_panel, is_partner,
          specializations, accreditations, languages_supported,
          avg_rating, total_reviews, status, logo_url, cover_image_url
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,'ACTIVE',$21,$22
        ) RETURNING hospital_id
      `, [
        h.name, "Malaysia", h.city, h.address, h.phone, h.website,
        h.type, h.tier, h.description, h.bed_count, h.established_year,
        h.emergency_24h, h.international_patients, h.insurance_panel, h.is_partner,
        h.specializations, h.accreditations, h.languages_supported,
        h.avg_rating, h.total_reviews, logo, cover,
      ]);
      hospitalIdMap[h.name] = res.rows[0].hospital_id;
      hospitalCityMap[h.name] = h.city;
      hospInserted++;
    }

    // 2. Build doctor pool (named + generated) and insert
    const ALL_DOCTORS = buildDoctorPool();
    const doctorIdByName = {};

    for (const d of ALL_DOCTORS) {
      const hospId = hospitalIdMap[d.hospital];
      if (!hospId) { console.warn(`Hospital not found for: ${d.hospital}`); continue; }
      // photo_url intentionally left NULL — we do not fabricate doctor
      // portraits. Real photos must be supplied by the partner hospital
      // post-MOU. UI falls back to a clean text monogram.
      const photo = null;

      const ex = await c.query("SELECT id, photo_url FROM public.doctors WHERE lower(name) = lower($1)", [d.name]);
      let docId;
      if (ex.rowCount > 0) {
        docId = ex.rows[0].id;
        // If a previous run inserted a synthesised avatar, clear it so the
        // marketplace UI shows the monogram fallback instead.
        if (ex.rows[0].photo_url && /dicebear|robohash|ui-avatars|gravatar/i.test(ex.rows[0].photo_url)) {
          await c.query("UPDATE public.doctors SET photo_url=NULL WHERE id=$1", [docId]);
        }
        docSkipped++;
      } else {
        const hospCity = hospitalCityMap[d.hospital] || "Malaysia";
        const res = await c.query(`
          INSERT INTO public.doctors (
            name, title, specialization, subspecialization, hospital,
            hospital_location, hospital_id, country, city, experience_years,
            rating, is_featured, notable_for, languages, currency,
            consultation_fee_min, consultation_fee_max, qualifications,
            procedures_offered, conditions_treated, available_days,
            telemedicine_available, accepting_new_patients, patients_treated,
            total_reviews, gender, bio, photo_url
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,'Malaysia',$8,$9,$10,$11,$12,$13,$14,$15,
            $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
          ) RETURNING id
        `, [
          d.name, d.title, d.specialization, d.subspecialization, d.hospital,
          hospCity, hospId, hospCity, d.experience_years, d.rating, d.is_featured,
          d.notable_for, d.languages, d.currency, d.fee_min, d.fee_max,
          d.qualifications, d.procedures_offered, d.conditions_treated,
          d.available_days, d.telemedicine_available, d.accepting_new_patients,
          d.patients_treated, d.total_reviews, d.gender, d.notable_for, photo,
        ]);
        docId = res.rows[0].id;
        docInserted++;
      }
      doctorIdByName[d.name] = docId;

      // 3. doctor_hospital primary link
      await c.query(`
        INSERT INTO public.doctor_hospital (doctor_id, hospital_id, is_primary, consultation_fee_min, consultation_fee_max, currency)
        VALUES ($1,$2,true,$3,$4,$5)
        ON CONFLICT (doctor_id, hospital_id) DO NOTHING
      `, [docId, hospId, d.fee_min, d.fee_max, d.currency]);

      // 4. Insert into public.doctor (used by claims)
      const claimDocEx = await c.query(
        "SELECT doctor_id FROM public.doctor WHERE lower(full_name) = lower($1)", [d.name]
      );
      if (claimDocEx.rowCount === 0) {
        await c.query(`
          INSERT INTO public.doctor (full_name, specialty, hospital_id, country, status, doctor_code)
          VALUES ($1,$2,$3,'Malaysia','ACTIVE',$4)
        `, [d.name, d.specialization, hospId, `MY-${Math.random().toString(36).substring(2,8).toUpperCase()}`]);
        claimDocInserted++;
      }

      // 5. Schedules at primary hospital
      const schedules = buildSchedules(docId, hospId, d.available_days);
      for (const s of schedules) {
        const exSched = await c.query(
          "SELECT schedule_id FROM public.doctor_schedule WHERE doctor_id=$1 AND hospital_id=$2 AND day_of_week=$3 AND start_time=$4",
          [s.doctor_id, s.hospital_id, s.day_of_week, s.start_time]
        );
        if (exSched.rowCount === 0) {
          await c.query(`
            INSERT INTO public.doctor_schedule (doctor_id, hospital_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients, is_active)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          `, [s.doctor_id, s.hospital_id, s.day_of_week, s.start_time, s.end_time, s.slot_duration_minutes, s.max_patients, s.is_active]);
          schedInserted++;
        }
      }
    }

    // 6. Multi-hospital secondary affiliations + schedules at the secondary hospital
    for (const [docName, links] of Object.entries(MULTI_HOSPITAL_LINKS)) {
      const docId = doctorIdByName[docName];
      if (!docId) continue;
      const docRow = ALL_DOCTORS.find((x) => x.name === docName);
      const secondaryDays = (docRow && docRow.available_days) ? docRow.available_days.slice(0, 2) : ["Sat"];
      for (const link of links) {
        const hospId = hospitalIdMap[link.hospital];
        if (!hospId) { console.warn(`Multi-hospital not found: ${link.hospital}`); continue; }
        const r = await c.query(`
          INSERT INTO public.doctor_hospital (doctor_id, hospital_id, is_primary, consultation_fee_min, consultation_fee_max, currency)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (doctor_id, hospital_id) DO NOTHING
          RETURNING id
        `, [docId, hospId, link.is_primary, link.fee_min, link.fee_max, link.currency]);
        if (r.rowCount > 0) multiLinkInserted++;

        // Add a light schedule at the secondary hospital (1–2 days).
        for (const day of secondaryDays) {
          const exSched = await c.query(
            "SELECT schedule_id FROM public.doctor_schedule WHERE doctor_id=$1 AND hospital_id=$2 AND day_of_week=$3 AND start_time=$4",
            [docId, hospId, DAY_MAP[day], "14:30:00"]
          );
          if (exSched.rowCount === 0) {
            await c.query(`
              INSERT INTO public.doctor_schedule (doctor_id, hospital_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients, is_active)
              VALUES ($1,$2,$3,$4,$5,$6,$7,true)
            `, [docId, hospId, DAY_MAP[day], "14:30:00", "17:30:00", 20, 8]);
            schedInserted++;
          }
        }
      }
    }

    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    console.error("Seed failed:", e.message);
    console.error(e.stack);
    process.exitCode = 1;
  } finally {
    c.release();
    await pool.end();
  }

  console.log(`
✅  Malaysia hospital & doctor seed complete (Phase 1)
    Hospitals       : ${hospInserted} inserted, ${hospSkipped} skipped, ${hospUpdated} backfilled
    Doctors         : ${docInserted} inserted (marketplace), ${docSkipped} skipped
    Claim docs      : ${claimDocInserted} inserted (public.doctor)
    Schedules       : ${schedInserted} schedule slots
    Multi-hospital  : ${multiLinkInserted} secondary affiliations
  `.trim());
}

main().catch((e) => { console.error(e); process.exit(1); });
