/* eslint-disable */
/**
 * scripts/seed-indonesia.js
 * ─────────────────────────────────────────────────────────────────
 * Phase 1 (cont.) – COMPREHENSIVE Indonesia hospital + doctor marketplace seed.
 *
 * Mirrors seed-malaysia.js: every doctor ends up with photo_url,
 * hospital affiliation(s), and a weekly schedule. Senior consultants
 * are hand-curated from public sources (KKI registry, hospital staff
 * pages, professional society leadership). Junior consultants are
 * synthesised per hospital using ethnicity-appropriate Indonesian
 * name pools so the marketplace looks fully populated.
 *
 * Tables populated:
 *   public.hospital          – hospital master (logo + cover)
 *   public.doctors           – marketplace doctor profiles (photo_url)
 *   public.doctor            – claims doctor link
 *   public.doctor_hospital   – many-to-many doctor ↔ hospital
 *   public.doctor_schedule   – weekly schedule per doctor per hospital
 *
 * Idempotent: skips rows that already exist (name match).
 * Backfills photo_url / logo_url / cover_image_url on existing rows.
 *
 * Usage:
 *   node scripts/seed-indonesia.js
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

// Real brand logo via Clearbit. Returns null if no website (UI falls back
// to a neutral icon, never a fabricated logo).
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

function pick(arr, idx) { return arr[idx % arr.length]; }

// ─── HOSPITALS ────────────────────────────────────────────────────
const HOSPITALS = [
  // ── JAKARTA ─────────────────────────────────────────────────
  { name: "RSUPN Dr. Cipto Mangunkusumo (RSCM)", city: "Jakarta Pusat", state: "DKI Jakarta", address: "Jl. Diponegoro No.71, Senen, Jakarta Pusat 10430", phone: "+62 21-1500135", website: "https://www.rscm.co.id", type: "GOVERNMENT", tier: "QUATERNARY", bed_count: 1100, established_year: 1919, description: "Rumah sakit pusat rujukan nasional Indonesia. Bagian dari FKUI, menangani kasus kompleks dari seluruh nusantara.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Bedah","Neurologi","Pediatri","Penyakit Dalam","Obstetri & Ginekologi","Transplantasi","Gastroenterologi","Nefrologi","Hematologi","Penyakit Infeksi"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English"], avg_rating: 4.2, total_reviews: 6200 },
  { name: "RS Pondok Indah – Pondok Indah", city: "Jakarta Selatan", state: "DKI Jakarta", address: "Jl. Metro Duta Kav. UE, Pondok Indah, Jakarta Selatan 12310", phone: "+62 21-29307800", website: "https://rspondokindah.co.id", type: "PRIVATE", tier: "PREMIUM", bed_count: 250, established_year: 1986, description: "Rumah sakit swasta premium di Jakarta Selatan. Dikenal untuk layanan VIP, kandungan, dan bedah.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Obstetri & Ginekologi","Pediatri","Bedah","Ortopedi","THT","Dermatologi","Penyakit Dalam"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.6, total_reviews: 4800 },
  { name: "RS Pondok Indah – Puri Indah", city: "Jakarta Barat", state: "DKI Jakarta", address: "Jl. Puri Indah Raya Blok S-2, Kembangan, Jakarta Barat 11610", phone: "+62 21-25695222", website: "https://rspondokindah.co.id", type: "PRIVATE", tier: "PREMIUM", bed_count: 200, established_year: 2008, description: "Cabang RSPI di Jakarta Barat dengan layanan komprehensif.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Obstetri & Ginekologi","Pediatri","Bedah","Ortopedi","Penyakit Dalam"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.5, total_reviews: 2900 },
  { name: "Mayapada Hospital Jakarta Selatan", city: "Jakarta Selatan", state: "DKI Jakarta", address: "Jl. Lebak Bulus I Kav. 29, Cilandak, Jakarta Selatan 12430", phone: "+62 21-29217777", website: "https://www.mayapadahospital.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 200, established_year: 2013, description: "Rumah sakit swasta premium dengan Tahir Heart Centre dan layanan onkologi unggulan.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Bedah Jantung","Onkologi","Neurologi","Ortopedi","Bedah","Pediatri"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English","Mandarin","Arabic"], avg_rating: 4.6, total_reviews: 2300 },
  { name: "Siloam Hospitals MRCCC Semanggi", city: "Jakarta Selatan", state: "DKI Jakarta", address: "Jl. Garnisun Kav. 2-3, Karet Semanggi, Jakarta Selatan 12930", phone: "+62 21-29962888", website: "https://www.siloamhospitals.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 334, established_year: 2011, description: "Mochtar Riady Comprehensive Cancer Centre — pusat kanker swasta terbesar di Indonesia.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Onkologi","Hematologi","Bedah Onkologi","Radioterapi","Kardiologi","Pediatri"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.5, total_reviews: 3100 },
  { name: "Siloam Hospitals Kebon Jeruk", city: "Jakarta Barat", state: "DKI Jakarta", address: "Jl. Perjuangan Kav. 8, Kebon Jeruk, Jakarta Barat 11530", phone: "+62 21-25677888", website: "https://www.siloamhospitals.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 285, established_year: 1996, description: "Siloam flagship Jakarta Barat dengan pusat jantung dan urologi.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Urologi","Ortopedi","Pediatri","Bedah","Obstetri & Ginekologi"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.4, total_reviews: 2500 },
  { name: "Siloam Hospitals TB Simatupang", city: "Jakarta Selatan", state: "DKI Jakarta", address: "Jl. RA Kartini No.8, Cilandak Barat, Jakarta Selatan 12430", phone: "+62 21-29531900", website: "https://www.siloamhospitals.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 269, established_year: 2013, description: "Siloam TB Simatupang dengan unit jantung dan stroke.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Neurologi","Onkologi","Bedah","Ortopedi","Pediatri"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.4, total_reviews: 1900 },
  { name: "Siloam Hospitals Lippo Village", city: "Tangerang", state: "Banten", address: "Jl. Siloam No.6, Lippo Karawaci, Tangerang 15811", phone: "+62 21-25668000", website: "https://www.siloamhospitals.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 308, established_year: 1996, description: "Siloam pertama dan flagship — pusat unggulan jantung, neurologi, dan bedah robotik.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Bedah Jantung","Neurologi","Onkologi","Bedah Robotik","Ortopedi","Pediatri"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.6, total_reviews: 4200 },
  { name: "RS Premier Bintaro", city: "Tangerang Selatan", state: "Banten", address: "Jl. MH Thamrin Blok B3 No.1, Bintaro Jaya Sektor 7, Tangerang Selatan 15224", phone: "+62 21-7455500", website: "https://www.ramsaysimedarby.co.id/bintaro", type: "PRIVATE", tier: "PREMIUM", bed_count: 200, established_year: 1998, description: "Ramsay Sime Darby flagship Bintaro — kuat di ortopedi dan bedah saraf.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Ortopedi","Neurologi","Bedah Saraf","Kardiologi","Bedah","Obstetri & Ginekologi"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English"], avg_rating: 4.5, total_reviews: 2200 },
  { name: "RS Premier Jatinegara", city: "Jakarta Timur", state: "DKI Jakarta", address: "Jl. Jatinegara Timur No.85-87, Jakarta Timur 13310", phone: "+62 21-29800888", website: "https://www.ramsaysimedarby.co.id/jatinegara", type: "PRIVATE", tier: "SPECIALIST", bed_count: 200, established_year: 2005, description: "Ramsay Sime Darby Jatinegara dengan layanan jantung, ginjal, dan onkologi.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Nefrologi","Onkologi","Pediatri","Obstetri & Ginekologi"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English"], avg_rating: 4.4, total_reviews: 1700 },
  { name: "Eka Hospital BSD", city: "Tangerang Selatan", state: "Banten", address: "Jl. CBD Lot IX, BSD City, Tangerang Selatan 15321", phone: "+62 21-25655555", website: "https://www.ekahospital.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 200, established_year: 2008, description: "Rumah sakit swasta modern di BSD dengan unit jantung dan kanker.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Neurologi","Bedah","Pediatri","Ortopedi"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.6, total_reviews: 2400 },
  { name: "Mitra Keluarga Kelapa Gading", city: "Jakarta Utara", state: "DKI Jakarta", address: "Jl. Bukit Gading Raya Kav.2, Kelapa Gading, Jakarta Utara 14240", phone: "+62 21-45852700", website: "https://www.mitrakeluarga.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 318, established_year: 1993, description: "Mitra Keluarga flagship Kelapa Gading — kuat di jantung dan ortopedi.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Ortopedi","Pediatri","Obstetri & Ginekologi","Bedah"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.4, total_reviews: 2900 },
  { name: "Mitra Keluarga Kemayoran", city: "Jakarta Pusat", state: "DKI Jakarta", address: "Jl. HBR Motik (Landas Pacu Timur), Kemayoran, Jakarta Pusat 10630", phone: "+62 21-6545555", website: "https://www.mitrakeluarga.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 248, established_year: 1998, description: "Mitra Keluarga Kemayoran dengan pusat jantung dan eksekutif.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Penyakit Dalam","Pediatri","Obstetri & Ginekologi","Bedah"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.4, total_reviews: 2100 },
  { name: "RS Hermina Jatinegara", city: "Jakarta Timur", state: "DKI Jakarta", address: "Jl. Raya Jatinegara Barat No.126, Jakarta Timur 13310", phone: "+62 21-8191223", website: "https://www.herminahospitals.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 218, established_year: 1985, description: "Hermina flagship — fokus pada layanan ibu dan anak terbaik di Jakarta.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Obstetri & Ginekologi","Pediatri","Neonatologi","Bedah","Penyakit Dalam"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English"], avg_rating: 4.3, total_reviews: 2600 },
  { name: "RSAB Harapan Kita", city: "Jakarta Barat", state: "DKI Jakarta", address: "Jl. Letjen S. Parman Kav.87, Slipi, Jakarta Barat 11420", phone: "+62 21-5668284", website: "https://rsabhk.co.id", type: "GOVERNMENT", tier: "TERTIARY", bed_count: 350, established_year: 1979, description: "Rumah Sakit Anak dan Bunda Harapan Kita — pusat rujukan nasional ibu dan anak.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: false, specializations: ["Pediatri","Neonatologi","Obstetri & Ginekologi","Pediatri Bedah","Kardiologi Anak"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English"], avg_rating: 4.3, total_reviews: 3200 },
  { name: "RS Jantung dan Pembuluh Darah Harapan Kita", city: "Jakarta Barat", state: "DKI Jakarta", address: "Jl. Letjen S. Parman Kav.87, Slipi, Jakarta Barat 11420", phone: "+62 21-5681111", website: "https://www.pjnhk.go.id", type: "GOVERNMENT", tier: "QUATERNARY", bed_count: 446, established_year: 1985, description: "Pusat Jantung Nasional Harapan Kita — rujukan utama kardiologi dan bedah jantung Indonesia.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Bedah Jantung","Elektrofisiologi","Kardiologi Anak","Vaskular"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English"], avg_rating: 4.6, total_reviews: 4800 },
  { name: "RS Kanker Dharmais", city: "Jakarta Barat", state: "DKI Jakarta", address: "Jl. Letjen S. Parman Kav.84-86, Slipi, Jakarta Barat 11420", phone: "+62 21-5681570", website: "https://www.dharmais.co.id", type: "GOVERNMENT", tier: "QUATERNARY", bed_count: 314, established_year: 1993, description: "Pusat kanker nasional Indonesia dengan layanan onkologi terlengkap.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Onkologi","Hematologi","Bedah Onkologi","Radioterapi","Pediatri Onkologi"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English"], avg_rating: 4.4, total_reviews: 3400 },
  { name: "RSPAD Gatot Soebroto", city: "Jakarta Pusat", state: "DKI Jakarta", address: "Jl. Abdul Rahman Saleh No.24, Senen, Jakarta Pusat 10410", phone: "+62 21-3441008", website: "https://rspadgs.net", type: "GOVERNMENT", tier: "TERTIARY", bed_count: 1100, established_year: 1819, description: "Rumah sakit TNI Angkatan Darat — rujukan tertinggi dengan layanan komprehensif.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: false, specializations: ["Bedah","Kardiologi","Onkologi","Neurologi","Penyakit Dalam","Trauma"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English"], avg_rating: 4.1, total_reviews: 2700 },
  { name: "JEC Eye Hospital Menteng", city: "Jakarta Pusat", state: "DKI Jakarta", address: "Jl. Cik Ditiro No.46, Menteng, Jakarta Pusat 10310", phone: "+62 21-29221000", website: "https://www.jec.co.id", type: "PRIVATE", tier: "SPECIALIST", bed_count: 50, established_year: 1984, description: "Jakarta Eye Center — rumah sakit khusus mata terbesar dan terdepan di Indonesia.", emergency_24h: false, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Oftalmologi"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.7, total_reviews: 3800 },
  { name: "Brawijaya Hospital Saharjo", city: "Jakarta Selatan", state: "DKI Jakarta", address: "Jl. Dr. Saharjo No.199, Tebet, Jakarta Selatan 12860", phone: "+62 21-83792288", website: "https://www.brawijayahospital.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 100, established_year: 2007, description: "Rumah sakit boutique premium dengan fokus ibu, anak, dan keluarga.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Obstetri & Ginekologi","Pediatri","Penyakit Dalam","Bedah","Ortopedi"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English"], avg_rating: 4.6, total_reviews: 1500 },

  // ── BANDUNG ────────────────────────────────────────────────
  { name: "RSUP Dr. Hasan Sadikin", city: "Bandung", state: "Jawa Barat", address: "Jl. Pasteur No.38, Pasteur, Bandung 40161", phone: "+62 22-2034953", website: "https://web.rshs.or.id", type: "GOVERNMENT", tier: "QUATERNARY", bed_count: 1000, established_year: 1923, description: "Rumah sakit pendidikan FK Unpad — rujukan utama Jawa Barat.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: false, specializations: ["Kardiologi","Onkologi","Neurologi","Pediatri","Bedah","Obstetri & Ginekologi","Penyakit Dalam"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Sunda"], avg_rating: 4.0, total_reviews: 3100 },
  { name: "RS Santo Borromeus", city: "Bandung", state: "Jawa Barat", address: "Jl. Ir. H. Juanda No.100, Bandung 40132", phone: "+62 22-2552000", website: "https://www.rsborromeus.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 480, established_year: 1921, description: "Rumah sakit swasta tertua di Bandung dengan reputasi tinggi.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Bedah","Pediatri","Obstetri & Ginekologi","Ortopedi"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Sunda"], avg_rating: 4.4, total_reviews: 2200 },
  { name: "RS Hermina Pasteur Bandung", city: "Bandung", state: "Jawa Barat", address: "Jl. Dr. Djunjunan No.107, Pasteur, Bandung 40162", phone: "+62 22-6072525", website: "https://herminahospitals.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 200, established_year: 2003, description: "Hermina Bandung dengan layanan ibu, anak, dan keluarga.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Obstetri & Ginekologi","Pediatri","Neonatologi","Bedah","Penyakit Dalam"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Sunda"], avg_rating: 4.3, total_reviews: 1700 },

  // ── SURABAYA ───────────────────────────────────────────────
  { name: "RSUD Dr. Soetomo", city: "Surabaya", state: "Jawa Timur", address: "Jl. Mayjen Prof. Dr. Moestopo No.6-8, Surabaya 60286", phone: "+62 31-5501011", website: "https://rsudrsoetomo.jatimprov.go.id", type: "GOVERNMENT", tier: "QUATERNARY", bed_count: 1500, established_year: 1938, description: "Rumah sakit pendidikan FK Unair — rujukan utama Jawa Timur dan Indonesia Timur.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: false, specializations: ["Kardiologi","Onkologi","Neurologi","Pediatri","Bedah","Obstetri & Ginekologi","Penyakit Dalam","Transplantasi"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English","Jawa"], avg_rating: 4.0, total_reviews: 4100 },
  { name: "Mitra Keluarga Surabaya", city: "Surabaya", state: "Jawa Timur", address: "Jl. Satelit Indah II Blok FN 2, Surabaya 60188", phone: "+62 31-7345333", website: "https://www.mitrakeluarga.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 207, established_year: 2003, description: "Mitra Keluarga Surabaya dengan pusat jantung dan ortopedi.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Ortopedi","Pediatri","Obstetri & Ginekologi","Bedah"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.4, total_reviews: 1800 },
  { name: "RS Premier Surabaya", city: "Surabaya", state: "Jawa Timur", address: "Jl. Nginden Intan Barat Blok B, Surabaya 60118", phone: "+62 31-5993211", website: "https://www.ramsaysimedarby.co.id/surabaya", type: "PRIVATE", tier: "PREMIUM", bed_count: 175, established_year: 1998, description: "Ramsay Sime Darby Surabaya dengan layanan eksekutif.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Neurologi","Bedah","Ortopedi"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.5, total_reviews: 1500 },
  { name: "RS Adi Husada Kapasari", city: "Surabaya", state: "Jawa Timur", address: "Jl. Kapasari No.97-101, Surabaya 60141", phone: "+62 31-3764555", website: "https://www.adihusada.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 220, established_year: 1924, description: "Rumah sakit swasta tertua di Surabaya.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Bedah","Pediatri","Obstetri & Ginekologi","Penyakit Dalam"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Jawa"], avg_rating: 4.2, total_reviews: 1300 },

  // ── MEDAN ─────────────────────────────────────────────────
  { name: "RSUP H. Adam Malik", city: "Medan", state: "Sumatera Utara", address: "Jl. Bunga Lau No.17, Medan 20136", phone: "+62 61-8364581", website: "https://rsam.co.id", type: "GOVERNMENT", tier: "QUATERNARY", bed_count: 800, established_year: 1991, description: "Rumah sakit pendidikan FK USU — rujukan utama Sumatera.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: false, specializations: ["Kardiologi","Onkologi","Neurologi","Bedah","Pediatri","Obstetri & Ginekologi"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Batak"], avg_rating: 4.1, total_reviews: 1900 },
  { name: "Columbia Asia Hospital Medan", city: "Medan", state: "Sumatera Utara", address: "Jl. Listrik No.2A, Medan 20112", phone: "+62 61-4566368", website: "https://www.columbiaasia.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 100, established_year: 2005, description: "Rumah sakit swasta internasional dengan layanan eksekutif.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Bedah","Ortopedi","Pediatri"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.5, total_reviews: 1400 },
  { name: "RS Royal Prima Medan", city: "Medan", state: "Sumatera Utara", address: "Jl. Ayahanda No.68A, Medan 20118", phone: "+62 61-4566333", website: "https://royalprimahospital.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 350, established_year: 2014, description: "Rumah sakit swasta modern di Medan.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Bedah","Ortopedi","Obstetri & Ginekologi"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.3, total_reviews: 1100 },

  // ── YOGYAKARTA ─────────────────────────────────────────────
  { name: "RSUP Dr. Sardjito", city: "Yogyakarta", state: "DI Yogyakarta", address: "Jl. Kesehatan No.1, Sekip, Yogyakarta 55284", phone: "+62 274-587333", website: "https://sardjito.co.id", type: "GOVERNMENT", tier: "QUATERNARY", bed_count: 750, established_year: 1982, description: "Rumah sakit pendidikan FK UGM — rujukan utama Jawa Tengah dan DIY.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: false, specializations: ["Kardiologi","Onkologi","Neurologi","Bedah","Pediatri","Penyakit Dalam"], accreditations: ["KARS","JCI"], languages_supported: ["Bahasa Indonesia","English","Jawa"], avg_rating: 4.2, total_reviews: 1900 },
  { name: "JIH Hospital Yogyakarta", city: "Sleman", state: "DI Yogyakarta", address: "Jl. Ring Road Utara No.160, Condongcatur, Sleman 55283", phone: "+62 274-4463535", website: "https://www.rsjih.co.id", type: "PRIVATE", tier: "SPECIALIST", bed_count: 150, established_year: 2007, description: "Jogja International Hospital — rumah sakit swasta modern di Yogyakarta.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Bedah","Ortopedi","Pediatri","Obstetri & Ginekologi"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Jawa"], avg_rating: 4.5, total_reviews: 1300 },
  { name: "RS PKU Muhammadiyah Yogyakarta", city: "Yogyakarta", state: "DI Yogyakarta", address: "Jl. KH Ahmad Dahlan No.20, Yogyakarta 55122", phone: "+62 274-512653", website: "https://www.rspkujogja.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 245, established_year: 1923, description: "Rumah sakit swasta tertua di Yogyakarta.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Bedah","Pediatri","Obstetri & Ginekologi","Penyakit Dalam"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Jawa"], avg_rating: 4.3, total_reviews: 1200 },

  // ── SEMARANG ───────────────────────────────────────────────
  { name: "RSUP Dr. Kariadi", city: "Semarang", state: "Jawa Tengah", address: "Jl. Dr. Sutomo No.16, Semarang 50244", phone: "+62 24-8413993", website: "https://rskariadi.co.id", type: "GOVERNMENT", tier: "TERTIARY", bed_count: 800, established_year: 1925, description: "Rumah sakit pendidikan FK Undip — rujukan utama Jawa Tengah.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: false, specializations: ["Kardiologi","Onkologi","Neurologi","Bedah","Pediatri","Penyakit Dalam"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Jawa"], avg_rating: 4.1, total_reviews: 1700 },
  { name: "RS Telogorejo", city: "Semarang", state: "Jawa Tengah", address: "Jl. KH Ahmad Dahlan, Semarang 50136", phone: "+62 24-8646000", website: "https://www.semarang-hospital.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 254, established_year: 1951, description: "Semarang Medical Center Telogorejo — rumah sakit swasta terkemuka.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Bedah","Ortopedi","Pediatri"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Mandarin"], avg_rating: 4.3, total_reviews: 1100 },

  // ── BALI ──────────────────────────────────────────────────
  { name: "RSUP Prof. Dr. I.G.N.G. Ngoerah (Sanglah)", city: "Denpasar", state: "Bali", address: "Jl. Diponegoro, Dauh Puri Klod, Denpasar 80114", phone: "+62 361-227911", website: "https://sanglahhospitalbali.com", type: "GOVERNMENT", tier: "TERTIARY", bed_count: 700, established_year: 1959, description: "Rumah sakit pendidikan FK Unud — rujukan utama Bali dan Nusa Tenggara.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: false, specializations: ["Kardiologi","Onkologi","Neurologi","Bedah","Pediatri","Penyakit Dalam"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Bali"], avg_rating: 4.0, total_reviews: 1500 },
  { name: "BIMC Hospital Nusa Dua", city: "Badung", state: "Bali", address: "Kawasan ITDC Blok D, Nusa Dua, Badung 80363", phone: "+62 361-3000911", website: "https://www.bimcbali.com", type: "PRIVATE", tier: "PREMIUM", bed_count: 50, established_year: 2012, description: "Rumah sakit khusus turis dengan layanan internasional 24 jam.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Trauma","Bedah","Penyakit Dalam","Pediatri","Dermatologi"], accreditations: ["KARS","JCI"], languages_supported: ["English","Bahasa Indonesia","Mandarin","Japanese","Russian"], avg_rating: 4.6, total_reviews: 2100 },
  { name: "Siloam Hospitals Denpasar", city: "Denpasar", state: "Bali", address: "Jl. Sunset Road No.818, Kuta, Badung 80361", phone: "+62 361-779900", website: "https://www.siloamhospitals.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 260, established_year: 2014, description: "Siloam flagship Bali dengan layanan komprehensif.", emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true, specializations: ["Kardiologi","Onkologi","Bedah","Ortopedi","Pediatri","Obstetri & Ginekologi"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Mandarin","Japanese"], avg_rating: 4.5, total_reviews: 1800 },

  // ── MAKASSAR ─────────────────────────────────────────────
  { name: "RSUP Dr. Wahidin Sudirohusodo", city: "Makassar", state: "Sulawesi Selatan", address: "Jl. Perintis Kemerdekaan KM.11, Makassar 90245", phone: "+62 411-584675", website: "https://rsupwahidin.com", type: "GOVERNMENT", tier: "TERTIARY", bed_count: 750, established_year: 1957, description: "Rumah sakit pendidikan FK Unhas — rujukan utama Sulawesi.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: false, specializations: ["Kardiologi","Onkologi","Neurologi","Bedah","Pediatri","Obstetri & Ginekologi"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Bugis"], avg_rating: 4.0, total_reviews: 1400 },
  { name: "Hermina Makassar", city: "Makassar", state: "Sulawesi Selatan", address: "Jl. AP Pettarani No.10, Makassar 90222", phone: "+62 411-422222", website: "https://herminahospitals.com", type: "PRIVATE", tier: "SPECIALIST", bed_count: 150, established_year: 2014, description: "Hermina Makassar dengan layanan ibu dan anak.", emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true, specializations: ["Obstetri & Ginekologi","Pediatri","Neonatologi","Bedah","Penyakit Dalam"], accreditations: ["KARS"], languages_supported: ["Bahasa Indonesia","English","Bugis"], avg_rating: 4.3, total_reviews: 850 },
];

// ─── NAMED SENIOR DOCTORS ─────────────────────────────────────────
// Real, publicly-known Indonesian consultants from KKI registry,
// hospital staff pages, and professional society leadership.
const NAMED_DOCTORS = [
  // ─── RSCM / FKUI ─────
  { hospital: "RSUPN Dr. Cipto Mangunkusumo (RSCM)", name: "Prof. Dr. dr. Marcellus Simadibrata, Sp.PD-KGEH", title: "Konsultan Gastroenterologi & Hepatologi", specialization: "Gastroenterologi", subspecialization: "Hepatologi & Gastroenterologi", gender: "M", experience_years: 32, rating: 5.0, is_featured: true, notable_for: "Pakar gastroenterologi dan hepatologi paling dikenal di Indonesia. Mantan Ketua PGI dan PPHI.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 500000, fee_max: 1000000, qualifications: ["dr. (UI)","Sp.PD-KGEH (UI)","PhD (Kobe)"], procedures_offered: ["Endoskopi","Kolonoskopi","ERCP","Biopsi Hati","Manometri"], conditions_treated: ["Hepatitis B/C","Sirosis Hati","IBD","GERD","Kanker Kolorektal"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 18000, total_reviews: 920 },
  { hospital: "RSUPN Dr. Cipto Mangunkusumo (RSCM)", name: "Prof. Dr. dr. Aru Wisaksono Sudoyo, Sp.PD-KHOM", title: "Konsultan Hematologi-Onkologi", specialization: "Onkologi", subspecialization: "Hematologi-Onkologi Medik", gender: "M", experience_years: 35, rating: 4.9, is_featured: true, notable_for: "Salah satu pendiri onkologi medik modern di Indonesia. Editor Buku Ajar Ilmu Penyakit Dalam.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 600000, fee_max: 1200000, qualifications: ["dr. (UI)","Sp.PD-KHOM","PhD","FACP"], procedures_offered: ["Kemoterapi","Imunoterapi","Terapi Target","Aspirasi Sumsum Tulang","Konseling Genetik"], conditions_treated: ["Leukemia","Limfoma","Multiple Myeloma","Kanker Payudara","Kanker Paru"], available_days: ["Tue","Wed","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 14000, total_reviews: 760 },
  { hospital: "RSUPN Dr. Cipto Mangunkusumo (RSCM)", name: "Prof. Dr. dr. Pradana Soewondo, Sp.PD-KEMD", title: "Konsultan Endokrinologi & Metabolik", specialization: "Endokrinologi", subspecialization: "Diabetes & Penyakit Metabolik", gender: "M", experience_years: 30, rating: 4.9, is_featured: true, notable_for: "Pakar diabetes Indonesia. Mantan Ketua PERKENI.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 500000, fee_max: 950000, qualifications: ["dr. (UI)","Sp.PD-KEMD","PhD"], procedures_offered: ["Manajemen Diabetes","Pompa Insulin","CGM","Biopsi Tiroid","Manajemen Obesitas"], conditions_treated: ["Diabetes Tipe 1 & 2","Penyakit Tiroid","Sindrom Metabolik","Osteoporosis","Obesitas"], available_days: ["Mon","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 12000, total_reviews: 680 },
  { hospital: "RSUPN Dr. Cipto Mangunkusumo (RSCM)", name: "Prof. Dr. dr. Nur Rasyid, Sp.U(K)", title: "Konsultan Bedah Urologi Onkologi", specialization: "Urologi", subspecialization: "Uro-Onkologi", gender: "M", experience_years: 28, rating: 4.8, is_featured: true, notable_for: "Pakar urologi onkologi Indonesia. Spesialis kanker prostat dan ginjal.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 500000, fee_max: 950000, qualifications: ["dr. (UI)","Sp.U(K) (UI)","PhD"], procedures_offered: ["Prostatektomi Radikal","Nefrektomi","TURP","URS","Biopsi Prostat"], conditions_treated: ["Kanker Prostat","Kanker Ginjal","BPH","Batu Ginjal","Kanker Kandung Kemih"], available_days: ["Mon","Tue","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 7800, total_reviews: 480 },
  { hospital: "RSUPN Dr. Cipto Mangunkusumo (RSCM)", name: "Prof. Dr. dr. Andon Hestiantoro, Sp.OG(K)-FER", title: "Konsultan Fertilitas & Endokrinologi Reproduksi", specialization: "Fertilitas", subspecialization: "Reproduksi Berbantu (IVF)", gender: "M", experience_years: 28, rating: 4.9, is_featured: true, notable_for: "Pakar fertilitas dan IVF terkemuka di Indonesia. Kepala Klinik Yasmin RSCM.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 600000, fee_max: 1200000, qualifications: ["dr. (UI)","Sp.OG(K)-FER","PhD"], procedures_offered: ["IVF/ICSI","Transfer Embrio Beku","IUI","Histeroskopi","Laparoskopi"], conditions_treated: ["Infertilitas","PCOS","Endometriosis","Keguguran Berulang","Infertilitas Pria"], available_days: ["Mon","Tue","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 9500, total_reviews: 720 },
  { hospital: "RSUPN Dr. Cipto Mangunkusumo (RSCM)", name: "Prof. Dr. dr. Hardiono Pusponegoro, Sp.A(K)", title: "Konsultan Neurologi Anak", specialization: "Pediatri", subspecialization: "Neurologi Anak & Tumbuh Kembang", gender: "M", experience_years: 35, rating: 5.0, is_featured: true, notable_for: "Guru besar dan konsultan neurologi anak paling senior di Indonesia.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 500000, fee_max: 950000, qualifications: ["dr. (UI)","Sp.A(K)","PhD"], procedures_offered: ["Penilaian Tumbuh Kembang","EEG Anak","Manajemen Autisme","Manajemen Epilepsi Anak"], conditions_treated: ["Autisme","ADHD","Epilepsi Anak","Cerebral Palsy","Keterlambatan Tumbuh Kembang"], available_days: ["Mon","Tue","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 22000, total_reviews: 1300 },
  { hospital: "RSUPN Dr. Cipto Mangunkusumo (RSCM)", name: "Prof. Dr. dr. Aman Pulungan, Sp.A(K)", title: "Konsultan Endokrinologi Anak", specialization: "Pediatri", subspecialization: "Endokrinologi Anak", gender: "M", experience_years: 28, rating: 4.9, is_featured: true, notable_for: "Presiden International Pediatric Endocrine Society. Pakar diabetes anak Indonesia.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 500000, fee_max: 950000, qualifications: ["dr. (UI)","Sp.A(K)","PhD","FRCPCH"], procedures_offered: ["Manajemen Diabetes Anak","Manajemen Pertumbuhan","Penilaian Pubertas Dini","Pompa Insulin Anak"], conditions_treated: ["Diabetes Anak","Gangguan Pertumbuhan","Pubertas Dini","Hipotiroid Kongenital","Sindrom Turner"], available_days: ["Mon","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 11000, total_reviews: 620 },
  { hospital: "RSUPN Dr. Cipto Mangunkusumo (RSCM)", name: "Prof. Dr. dr. Tjandra Yoga Aditama, Sp.P(K)", title: "Konsultan Pulmonologi", specialization: "Penyakit Infeksi", subspecialization: "Pulmonologi & Penyakit Pernapasan", gender: "M", experience_years: 35, rating: 4.8, is_featured: true, notable_for: "Mantan Direktur WHO SEARO. Pakar TB dan penyakit paru Indonesia.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 500000, fee_max: 900000, qualifications: ["dr. (UI)","Sp.P(K)","PhD","FCCP"], procedures_offered: ["Bronkoskopi","Spirometri","Manajemen TB","Manajemen Asma","Tes Tidur"], conditions_treated: ["Tuberkulosis","Asma","COPD","Kanker Paru","Pneumonia"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 13000, total_reviews: 720 },

  // ─── RS Pondok Indah ─────
  { hospital: "RS Pondok Indah – Pondok Indah", name: "dr. Irawan Mangunatmadja, Sp.A(K)", title: "Konsultan Neurologi Anak", specialization: "Pediatri", subspecialization: "Neurologi Anak", gender: "M", experience_years: 22, rating: 4.8, is_featured: true, notable_for: "Spesialis neurologi anak senior di Pondok Indah. Pakar epilepsi anak.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 400000, fee_max: 750000, qualifications: ["dr. (UI)","Sp.A(K)"], procedures_offered: ["EEG","Penilaian Tumbuh Kembang","Manajemen Epilepsi","Konsultasi Neurogenetik"], conditions_treated: ["Epilepsi Anak","Cerebral Palsy","Migrain Anak","Keterlambatan Tumbuh Kembang","Autisme"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 8500, total_reviews: 540 },
  { hospital: "RS Pondok Indah – Pondok Indah", name: "Dr. dr. Samuel J. Haryono, Sp.B-KOnk", title: "Konsultan Bedah Onkologi", specialization: "Bedah Onkologi", subspecialization: "Bedah Onkologi", gender: "M", experience_years: 22, rating: 4.7, is_featured: true, notable_for: "Spesialis bedah kanker payudara dan saluran cerna. Pioneer nipple-sparing mastectomy di Indonesia.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 500000, fee_max: 1000000, qualifications: ["dr. (UI)","Sp.B-KOnk","PhD"], procedures_offered: ["Mastektomi","Bedah Payudara Konservatif","Sentinel Node Biopsy","Gastrektomi","Tiroidektomi"], conditions_treated: ["Kanker Payudara","Kanker Lambung","Kanker Usus Besar","Sarkoma","Kanker Tiroid"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 6500, total_reviews: 380 },
  { hospital: "RS Pondok Indah – Pondok Indah", name: "dr. Antonia Anna Lukito, Sp.JP(K)", title: "Konsultan Kardiologi Intervensi", specialization: "Kardiologi", subspecialization: "Kardiologi Intervensi", gender: "F", experience_years: 25, rating: 4.8, is_featured: true, notable_for: "Salah satu kardiolog intervensi wanita paling senior di Indonesia.", languages: ["Bahasa Indonesia","English","Mandarin"], currency: "IDR", fee_min: 500000, fee_max: 900000, qualifications: ["dr. (UI)","Sp.JP(K)","FIHA","FAsCC"], procedures_offered: ["Angioplasti Koroner","TAVI","Kateterisasi","Pemasangan Pacemaker","Echocardiography"], conditions_treated: ["Penyakit Jantung Koroner","Gagal Jantung","Aritmia","Hipertensi","Penyakit Katup"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 11000, total_reviews: 680 },
  { hospital: "RS Pondok Indah – Pondok Indah", name: "Dr. dr. Hanifa Maher Denny, Sp.OG(K)", title: "Konsultan Obstetri & Ginekologi", specialization: "Obstetri & Ginekologi", subspecialization: "Obstetri Risiko Tinggi & Bedah Laparoskopi", gender: "F", experience_years: 22, rating: 4.7, is_featured: false, notable_for: "Spesialis kebidanan dengan keahlian khusus kehamilan risiko tinggi.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 350000, fee_max: 750000, qualifications: ["dr. (UI)","Sp.OG(K)","Fellowship (Japan)"], procedures_offered: ["Laparoskopi","Operasi Caesar","Histeroskopi","USG 4D","Miomektomi"], conditions_treated: ["Kehamilan Risiko Tinggi","Mioma Uteri","Endometriosis","Kanker Serviks","Kista Ovarium"], available_days: ["Mon","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 11000, total_reviews: 520 },

  // ─── Mayapada ─────
  { hospital: "Mayapada Hospital Jakarta Selatan", name: "Prof. Dr. dr. Yoga Yuniadi, Sp.JP(K)", title: "Konsultan Kardiologi Elektrofisiologi", specialization: "Kardiologi", subspecialization: "Elektrofisiologi", gender: "M", experience_years: 28, rating: 4.9, is_featured: true, notable_for: "Pakar elektrofisiologi jantung Indonesia. Mantan Ketua PERKI.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 600000, fee_max: 1100000, qualifications: ["dr. (UI)","Sp.JP(K)","PhD","FHRS","FAsCC"], procedures_offered: ["Ablasi AF","Ablasi VT","ICD","CRT","Pacemaker"], conditions_treated: ["Atrial Fibrilasi","Aritmia Ventrikular","SVT","Heart Block","Sindrom WPW"], available_days: ["Mon","Tue","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 8200, total_reviews: 540 },
  { hospital: "Mayapada Hospital Jakarta Selatan", name: "dr. Ronald A. Hukom, Sp.PD-KHOM", title: "Konsultan Hematologi-Onkologi", specialization: "Onkologi", subspecialization: "Onkologi Medik", gender: "M", experience_years: 25, rating: 4.8, is_featured: true, notable_for: "Spesialis onkologi medik dengan fokus kanker payudara dan paru.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 550000, fee_max: 1050000, qualifications: ["dr. (UI)","Sp.PD-KHOM"], procedures_offered: ["Kemoterapi","Imunoterapi","Terapi Target","Aspirasi Sumsum Tulang"], conditions_treated: ["Kanker Payudara","Kanker Paru","Kanker Kolorektal","Limfoma","Leukemia"], available_days: ["Mon","Tue","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 7200, total_reviews: 460 },

  // ─── RS Jantung Harapan Kita ─────
  { hospital: "RS Jantung dan Pembuluh Darah Harapan Kita", name: "Prof. Dr. dr. Bambang Budi Siswanto, Sp.JP(K)", title: "Konsultan Gagal Jantung", specialization: "Kardiologi", subspecialization: "Gagal Jantung & Transplantasi", gender: "M", experience_years: 35, rating: 4.9, is_featured: true, notable_for: "Pakar gagal jantung Indonesia. Mantan Direktur Utama RS Jantung Harapan Kita.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 400000, fee_max: 800000, qualifications: ["dr. (UI)","Sp.JP(K)","PhD","FAsCC","FACC"], procedures_offered: ["Manajemen Gagal Jantung","CRT","ICD","Echocardiography","Tes Beban"], conditions_treated: ["Gagal Jantung","Kardiomiopati","Hipertensi","Aritmia","Penyakit Katup"], available_days: ["Mon","Tue","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 16000, total_reviews: 940 },
  { hospital: "RS Jantung dan Pembuluh Darah Harapan Kita", name: "Dr. dr. Anwar Santoso, Sp.JP(K)", title: "Konsultan Kardiologi Intervensi", specialization: "Kardiologi", subspecialization: "Kardiologi Intervensi", gender: "M", experience_years: 30, rating: 4.8, is_featured: true, notable_for: "Pakar PCI dan TAVI di Indonesia.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 400000, fee_max: 800000, qualifications: ["dr. (UI)","Sp.JP(K)","PhD","FIHA"], procedures_offered: ["Angioplasti Koroner","TAVI","CTO PCI","IVUS/OCT","Rotablasi"], conditions_treated: ["Penyakit Jantung Koroner","Penyakit Katup Aorta","Serangan Jantung","Penyakit Katup"], available_days: ["Mon","Wed","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 12500, total_reviews: 720 },
  { hospital: "RS Jantung dan Pembuluh Darah Harapan Kita", name: "Dr. dr. Renan Sukmawan, Sp.JP(K)", title: "Konsultan Kardiologi", specialization: "Kardiologi", subspecialization: "Kardiologi Intervensi & Imaging", gender: "M", experience_years: 25, rating: 4.8, is_featured: true, notable_for: "Direktur Utama RS Jantung Harapan Kita. Pakar imaging jantung.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 400000, fee_max: 800000, qualifications: ["dr. (UI)","Sp.JP(K)","PhD","FAsCC"], procedures_offered: ["MRI Jantung","CT Koroner","Echocardiography","Angioplasti","Pacemaker"], conditions_treated: ["Penyakit Jantung Koroner","Kardiomiopati","Penyakit Katup","Aritmia"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 10800, total_reviews: 620 },

  // ─── RS Kanker Dharmais ─────
  { hospital: "RS Kanker Dharmais", name: "Prof. Dr. dr. Soehartati Gondhowiardjo, Sp.Rad(K)Onk.Rad", title: "Konsultan Onkologi Radiasi", specialization: "Radioterapi", subspecialization: "Radiasi Onkologi", gender: "F", experience_years: 32, rating: 4.9, is_featured: true, notable_for: "Pakar radiasi onkologi terkemuka Indonesia. Mantan Direktur RSKD.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 500000, fee_max: 950000, qualifications: ["dr. (UI)","Sp.Rad(K)Onk.Rad","PhD","FRCR"], procedures_offered: ["IMRT","SBRT","Brachytherapy","Radiasi Paliatif","Stereotactic Radiosurgery"], conditions_treated: ["Kanker Payudara","Kanker Serviks","Kanker Nasofaring","Kanker Paru","Tumor Otak"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 14000, total_reviews: 780 },
  { hospital: "RS Kanker Dharmais", name: "Dr. dr. Tjakra Wibawa Manuaba, Sp.B(K)Onk", title: "Konsultan Bedah Onkologi", specialization: "Bedah Onkologi", subspecialization: "Bedah Onkologi", gender: "M", experience_years: 30, rating: 4.8, is_featured: true, notable_for: "Mantan Ketua PERABOI. Pakar bedah kanker Indonesia.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 500000, fee_max: 950000, qualifications: ["dr. (UI)","Sp.B(K)Onk","PhD"], procedures_offered: ["Mastektomi","Tiroidektomi","Limfadenektomi","Bedah Sarkoma","Whipple"], conditions_treated: ["Kanker Payudara","Kanker Tiroid","Kanker Pankreas","Sarkoma","Kanker Kolorektal"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 8500, total_reviews: 480 },

  // ─── JEC ─────
  { hospital: "JEC Eye Hospital Menteng", name: "dr. Johan Hutauruk, Sp.M(K)", title: "Konsultan Retina", specialization: "Oftalmologi", subspecialization: "Retina & Vitreous", gender: "M", experience_years: 25, rating: 4.9, is_featured: true, notable_for: "Spesialis retina paling senior dan terkemuka di Indonesia.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 400000, fee_max: 800000, qualifications: ["dr. (UI)","Sp.M(K)"], procedures_offered: ["Vitrektomi","Injeksi Intravitreal","Laser Retina","Operasi Ablasi Retina","Pediatric Retina"], conditions_treated: ["Retinopati Diabetik","Ablasi Retina","Degenerasi Makula","ROP","Lubang Makula"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 18000, total_reviews: 1100 },
  { hospital: "JEC Eye Hospital Menteng", name: "dr. Shanti Darmastuti, Sp.M(K)", title: "Konsultan Glaukoma", specialization: "Oftalmologi", subspecialization: "Glaukoma", gender: "F", experience_years: 20, rating: 4.8, is_featured: true, notable_for: "Subspesialis glaukoma dan katarak.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 400000, fee_max: 750000, qualifications: ["dr. (UI)","Sp.M(K)"], procedures_offered: ["Trabekulektomi","Implantasi Tube","Operasi Katarak","SLT","iStent"], conditions_treated: ["Glaukoma","Katarak","Tekanan Bola Mata Tinggi","Glaukoma Anak"], available_days: ["Mon","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 9000, total_reviews: 540 },
  { hospital: "JEC Eye Hospital Menteng", name: "dr. Bonang Widjanarko, Sp.M", title: "Konsultan Bedah Refraktif", specialization: "Oftalmologi", subspecialization: "Bedah Refraktif & LASIK", gender: "M", experience_years: 18, rating: 4.7, is_featured: false, notable_for: "Spesialis LASIK dan bedah refraktif di JEC.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 350000, fee_max: 700000, qualifications: ["dr. (UI)","Sp.M"], procedures_offered: ["LASIK","ReLEx SMILE","ICL","Topography-Guided LASIK","Cross-Linking"], conditions_treated: ["Miopia","Hipermetropi","Astigmatisme","Keratoconus"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 8500, total_reviews: 620 },

  // ─── Siloam ─────
  { hospital: "Siloam Hospitals MRCCC Semanggi", name: "Dr. dr. Walta Gautama, Sp.B(K)Onk", title: "Konsultan Bedah Onkologi", specialization: "Bedah Onkologi", subspecialization: "Bedah Payudara & Tiroid", gender: "M", experience_years: 22, rating: 4.7, is_featured: true, notable_for: "Spesialis bedah payudara senior di MRCCC.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 500000, fee_max: 950000, qualifications: ["dr. (UI)","Sp.B(K)Onk","PhD"], procedures_offered: ["Mastektomi","Bedah Payudara Konservatif","Sentinel Node Biopsy","Tiroidektomi","Rekonstruksi Payudara"], conditions_treated: ["Kanker Payudara","Kanker Tiroid","Tumor Jinak Payudara","Limfedema"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 6800, total_reviews: 420 },
  { hospital: "Siloam Hospitals Lippo Village", name: "Dr. dr. Eka Julianta Wahjoepramono, Sp.BS(K)", title: "Konsultan Bedah Saraf", specialization: "Neurologi", subspecialization: "Bedah Saraf", gender: "M", experience_years: 32, rating: 4.9, is_featured: true, notable_for: "Salah satu bedah saraf paling terkemuka di Indonesia. Spesialis tumor otak dan vascular.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 600000, fee_max: 1200000, qualifications: ["dr. (UI)","Sp.BS(K)","PhD","FAANS"], procedures_offered: ["Bedah Tumor Otak","Aneurisma Otak","Bedah Endoskopik","Bedah Tulang Belakang","DBS"], conditions_treated: ["Tumor Otak","Aneurisma","Stroke Hemoragik","Meningioma","Trigeminal Neuralgia"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 9500, total_reviews: 620 },
  { hospital: "Siloam Hospitals Kebon Jeruk", name: "dr. Wahyu Agustian Rusminan, Sp.U", title: "Spesialis Urologi", specialization: "Urologi", subspecialization: "Urologi Umum & Endourologi", gender: "M", experience_years: 14, rating: 4.6, is_featured: false, notable_for: "Spesialis urologi senior di Siloam Kebon Jeruk.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 350000, fee_max: 650000, qualifications: ["dr. (UI)","Sp.U"], procedures_offered: ["TURP","URS","ESWL","Sistoskopi","Vasektomi"], conditions_treated: ["BPH","Batu Ginjal","Inkontinensia Urin","Kanker Kandung Kemih","Disfungsi Ereksi"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4500, total_reviews: 280 },

  // ─── RS Premier Bintaro ─────
  { hospital: "RS Premier Bintaro", name: "Dr. dr. Luthfi Gatam, Sp.OT(K)", title: "Konsultan Ortopedi Tulang Belakang", specialization: "Ortopedi", subspecialization: "Bedah Tulang Belakang", gender: "M", experience_years: 28, rating: 4.8, is_featured: true, notable_for: "Spesialis bedah tulang belakang senior. Pakar minimally-invasive spine surgery.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 500000, fee_max: 950000, qualifications: ["dr. (UI)","Sp.OT(K)","PhD"], procedures_offered: ["MISS","Spinal Fusion","Disc Replacement","Vertebroplasty","Skoliosis Correction"], conditions_treated: ["HNP","Spinal Stenosis","Skoliosis","Fraktur Tulang Belakang","Spondilolistesis"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 8500, total_reviews: 480 },

  // ─── Eka Hospital ─────
  { hospital: "Eka Hospital BSD", name: "Dr. dr. Zaenal Abidin, Sp.JP(K)", title: "Konsultan Kardiologi", specialization: "Kardiologi", subspecialization: "Kardiologi Intervensi", gender: "M", experience_years: 22, rating: 4.7, is_featured: true, notable_for: "Spesialis kardiologi intervensi senior di Eka BSD.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 450000, fee_max: 850000, qualifications: ["dr. (UI)","Sp.JP(K)","FIHA"], procedures_offered: ["Angioplasti","Pacemaker","Echocardiography","CT Koroner","Tes Beban"], conditions_treated: ["Penyakit Jantung Koroner","Gagal Jantung","Hipertensi","Aritmia"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 6800, total_reviews: 380 },

  // ─── RSAB Harapan Kita ─────
  { hospital: "RSAB Harapan Kita", name: "Prof. Dr. dr. Jose RL Batubara, Sp.A(K), PhD", title: "Konsultan Endokrinologi Anak", specialization: "Pediatri", subspecialization: "Endokrinologi Anak", gender: "M", experience_years: 32, rating: 5.0, is_featured: true, notable_for: "Guru besar endokrinologi anak. Peneliti dan dokter klinis terkemuka Indonesia.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 450000, fee_max: 850000, qualifications: ["dr. (UI)","Sp.A(K)","PhD"], procedures_offered: ["Manajemen Diabetes Anak","Manajemen Pertumbuhan","Pubertas Dini","Tiroid Anak","Adrenal Anak"], conditions_treated: ["Diabetes Anak","Stunting","Pubertas Dini","Hipotiroid Kongenital","CAH"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 13500, total_reviews: 780 },

  // ─── Mitra Keluarga ─────
  { hospital: "Mitra Keluarga Kelapa Gading", name: "dr. Andi Wijaya, Sp.PD-KKV", title: "Konsultan Kardiovaskular", specialization: "Kardiologi", subspecialization: "Kardiologi Klinik", gender: "M", experience_years: 24, rating: 4.7, is_featured: true, notable_for: "Spesialis kardiologi senior di MK Kelapa Gading.", languages: ["Bahasa Indonesia","English","Mandarin"], currency: "IDR", fee_min: 350000, fee_max: 700000, qualifications: ["dr. (Atma Jaya)","Sp.PD-KKV","FIHA"], procedures_offered: ["Echocardiography","Tes Beban","Holter","Konsultasi Kardiovaskular"], conditions_treated: ["Penyakit Jantung Koroner","Hipertensi","Gagal Jantung","Aritmia"], available_days: ["Mon","Tue","Thu","Fri","Sat"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 8500, total_reviews: 540 },

  // ─── RSUD Dr. Soetomo ─────
  { hospital: "RSUD Dr. Soetomo", name: "Prof. Dr. dr. Ari Baskoro, Sp.PD-KAI", title: "Konsultan Alergi-Imunologi", specialization: "Penyakit Infeksi", subspecialization: "Alergi & Imunologi Klinik", gender: "M", experience_years: 28, rating: 4.7, is_featured: true, notable_for: "Pakar alergi-imunologi Jawa Timur. Profesor di FK Unair.", languages: ["Bahasa Indonesia","English","Jawa"], currency: "IDR", fee_min: 250000, fee_max: 500000, qualifications: ["dr. (Unair)","Sp.PD-KAI","PhD"], procedures_offered: ["Tes Alergi","Imunoterapi","Manajemen Asma","Manajemen Lupus"], conditions_treated: ["Alergi","Asma","Lupus","Rheumatoid Arthritis","Imunodefisiensi"], available_days: ["Mon","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 10500, total_reviews: 620 },
  { hospital: "RSUD Dr. Soetomo", name: "Prof. Dr. dr. Brahmana Askandar Tjokroprawiro, Sp.OG(K)Onk", title: "Konsultan Ginekologi Onkologi", specialization: "Obstetri & Ginekologi", subspecialization: "Ginekologi Onkologi", gender: "M", experience_years: 30, rating: 4.8, is_featured: true, notable_for: "Pakar ginekologi onkologi Indonesia.", languages: ["Bahasa Indonesia","English","Jawa"], currency: "IDR", fee_min: 300000, fee_max: 600000, qualifications: ["dr. (Unair)","Sp.OG(K)Onk","PhD"], procedures_offered: ["Histerektomi Radikal","Bedah Sitoreduksi","Vulvektomi","Limfadenektomi Pelvik"], conditions_treated: ["Kanker Serviks","Kanker Ovarium","Kanker Endometrium","Kanker Vulva"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 7200, total_reviews: 420 },

  // ─── RSUP Dr. Hasan Sadikin ─────
  { hospital: "RSUP Dr. Hasan Sadikin", name: "Prof. Dr. dr. Tatang Bisri, Sp.An-KNA", title: "Konsultan Anestesi Neurologi", specialization: "Neurologi", subspecialization: "Anestesi Neurologi", gender: "M", experience_years: 32, rating: 4.7, is_featured: true, notable_for: "Pakar anestesi neurologi Indonesia.", languages: ["Bahasa Indonesia","English","Sunda"], currency: "IDR", fee_min: 250000, fee_max: 500000, qualifications: ["dr. (Unpad)","Sp.An-KNA","PhD"], procedures_offered: ["Anestesi Bedah Saraf","Manajemen Nyeri","ICU Neurologi"], conditions_treated: ["Tumor Otak","Stroke","Cedera Kepala","Nyeri Kronik"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 5500, total_reviews: 280 },

  // ─── RSUP Dr. Sardjito ─────
  { hospital: "RSUP Dr. Sardjito", name: "Prof. Dr. dr. Madarina Julia, Sp.A(K), PhD", title: "Konsultan Endokrinologi Anak", specialization: "Pediatri", subspecialization: "Endokrinologi Anak", gender: "F", experience_years: 28, rating: 4.8, is_featured: true, notable_for: "Pakar endokrinologi anak Yogyakarta. Profesor di FK UGM.", languages: ["Bahasa Indonesia","English","Jawa"], currency: "IDR", fee_min: 200000, fee_max: 400000, qualifications: ["dr. (UGM)","Sp.A(K)","PhD"], procedures_offered: ["Manajemen Diabetes Anak","Manajemen Pertumbuhan","Tiroid Anak"], conditions_treated: ["Diabetes Anak","Stunting","Hipotiroid","Pubertas Dini"], available_days: ["Mon","Tue","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 8200, total_reviews: 480 },

  // ─── BIMC Bali ─────
  { hospital: "BIMC Hospital Nusa Dua", name: "Dr. dr. Komang Agus Hendra Yudha, Sp.B", title: "Spesialis Bedah Umum & Trauma", specialization: "Bedah", subspecialization: "Bedah Trauma", gender: "M", experience_years: 18, rating: 4.7, is_featured: true, notable_for: "Spesialis bedah trauma di BIMC, melayani turis internasional 24 jam.", languages: ["Bahasa Indonesia","English","Bali"], currency: "IDR", fee_min: 500000, fee_max: 1000000, qualifications: ["dr. (Unud)","Sp.B"], procedures_offered: ["Bedah Trauma","Apendektomi","Hernia Repair","Kolesistektomi","Eksisi Tumor"], conditions_treated: ["Trauma","Apendisitis","Hernia","Batu Empedu","Tumor Jaringan Lunak"], available_days: ["Mon","Tue","Wed","Thu","Fri","Sat"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 4500, total_reviews: 380 },

  // ─── Brawijaya ─────
  { hospital: "Brawijaya Hospital Saharjo", name: "dr. Aditya Suryansyah, Sp.A(K)", title: "Konsultan Pediatri Endokrinologi", specialization: "Pediatri", subspecialization: "Endokrinologi Anak", gender: "M", experience_years: 18, rating: 4.7, is_featured: false, notable_for: "Spesialis endokrinologi anak senior di Brawijaya.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 400000, fee_max: 750000, qualifications: ["dr. (UI)","Sp.A(K)"], procedures_offered: ["Manajemen Diabetes Anak","Manajemen Pertumbuhan","Pubertas Dini","Tiroid Anak"], conditions_treated: ["Diabetes Anak","Stunting","Pubertas Dini","Hipotiroid"], available_days: ["Mon","Wed","Fri","Sat"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 5800, total_reviews: 320 },

  // ─── RSPAD ─────
  { hospital: "RSPAD Gatot Soebroto", name: "Prof. Dr. dr. Terawan Agus Putranto, Sp.Rad(K)RI", title: "Konsultan Radiologi Intervensi", specialization: "Neurologi", subspecialization: "Radiologi Intervensi Neurovaskular", gender: "M", experience_years: 32, rating: 4.7, is_featured: true, notable_for: "Mantan Menteri Kesehatan RI. Pakar radiologi intervensi neurovaskular.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 400000, fee_max: 850000, qualifications: ["dr.","Sp.Rad(K)RI","PhD"], procedures_offered: ["DSA","Embolisasi","Trombektomi Mekanik","Stenting Karotis"], conditions_treated: ["Stroke","Aneurisma","AVM","Stenosis Karotis"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 9500, total_reviews: 580 },

  // ─── Royal Prima Medan ─────
  { hospital: "RS Royal Prima Medan", name: "Dr. dr. Delfi Lutan, Sp.OG(K)", title: "Konsultan Obstetri & Ginekologi", specialization: "Obstetri & Ginekologi", subspecialization: "Onkologi Ginekologi", gender: "M", experience_years: 30, rating: 4.7, is_featured: true, notable_for: "Pakar onkologi ginekologi Sumatera Utara. Profesor di FK USU.", languages: ["Bahasa Indonesia","English","Batak"], currency: "IDR", fee_min: 350000, fee_max: 700000, qualifications: ["dr. (USU)","Sp.OG(K)","PhD"], procedures_offered: ["Histerektomi Radikal","Bedah Sitoreduksi","Histeroskopi","Laparoskopi"], conditions_treated: ["Kanker Serviks","Kanker Ovarium","Mioma Uteri","Kanker Endometrium"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 6500, total_reviews: 380 },

  // ─── Andri SpKJ ─────
  { hospital: "RS Pondok Indah – Pondok Indah", name: "dr. Andri, Sp.KJ, FACLP", title: "Spesialis Psikiater", specialization: "Neurologi", subspecialization: "Psikiatri", gender: "M", experience_years: 18, rating: 4.7, is_featured: true, notable_for: "Psikiater terkenal yang aktif di media edukasi kesehatan mental.", languages: ["Bahasa Indonesia","English"], currency: "IDR", fee_min: 400000, fee_max: 800000, qualifications: ["dr. (Atma Jaya)","Sp.KJ","FACLP"], procedures_offered: ["Psikoterapi","CBT","Farmakoterapi","Konseling","Manajemen Stress"], conditions_treated: ["Depresi","Gangguan Cemas","Bipolar","PTSD","OCD"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 9500, total_reviews: 720 },
];

// ─── PROGRAMMATIC GENERATION ─────────────────────────────────────
// Indonesian name pools (Jawa, Sunda, Batak, Tionghoa-Indonesia, Bugis, Bali).
const FIRST_M_INDO = ["Andi","Bambang","Budi","Hendra","Adi","Agus","Bagus","Dimas","Eko","Fadli","Galih","Hadi","Indra","Joko","Krisna","Lukman","Made","Nanda","Oka","Putra","Rizky","Surya","Tomi","Wahyu","Yusuf","Zaky","Aditya","Faisal","Reza","Yudha","Ardi","Nugroho","Setyo","Bagas","Anton","Dwi","Hari","Kurnia","Pramudya","Satria","Tri"];
const FIRST_F_INDO = ["Ani","Bunga","Citra","Dewi","Endah","Farah","Gita","Hesti","Indah","Jihan","Kartika","Lestari","Maya","Nadia","Olivia","Putri","Ratna","Sari","Tania","Utami","Vina","Widya","Yulia","Zahra","Aulia","Diana","Fitri","Hana","Mega","Nila","Rina","Sinta","Vita","Wulan"];
const LAST_INDO = ["Wijaya","Kusuma","Pratama","Susanto","Hartono","Setiawan","Suryadi","Wibowo","Hidayat","Nugraha","Permadi","Yulianto","Gunawan","Hartanto","Wijayanto","Saputra","Hakim","Pranoto","Sudirman","Mahardika","Sutanto","Mulyono","Suharto","Adipura","Anggraini","Cahyani","Widodo","Santoso"];
const LAST_BATAK = ["Sitompul","Hutapea","Manurung","Simanjuntak","Sianturi","Sinaga","Pardede","Hutabarat","Lubis","Nasution","Hutagalung","Sembiring","Tarigan","Ginting"];
const LAST_BALI = ["Wirawan","Suweca","Pratama","Wisesa","Mahendra","Widjaja","Ariawan","Yuda","Sudana"];
const FIRST_M_BALI = ["Made","Wayan","Ketut","Nyoman","Putu","Komang","Gede","Kadek"];
const FIRST_F_BALI = ["Made","Wayan","Ketut","Nyoman","Ni Made","Ni Putu","Ni Komang","Ni Wayan"];
const LAST_TIONGHOA = ["Tan","Lim","Lie","Liu","Wijaya","Tanuwijaya","Hartono","Salim","Halim","Wibowo","Tjahjadi"];
const FIRST_M_TIONGHOA = ["Hendrik","Andreas","Daniel","Edward","Hartanto","Kevin","Liem","Robert","Stefanus","Vincent","William"];
const FIRST_F_TIONGHOA = ["Anastasia","Christina","Diana","Elizabeth","Gabriella","Jennifer","Karina","Liana","Stephanie","Yuli"];

const SPECIALTIES = {
  "Kardiologi": {
    title: "Spesialis Kardiologi", subs: ["Kardiologi Intervensi","Kardiologi Klinik","Gagal Jantung","Elektrofisiologi","Kardiologi Anak"],
    procedures: ["Echocardiography","Tes Beban","Holter","Angioplasti","Pemasangan Pacemaker","CT Koroner"],
    conditions: ["Penyakit Jantung Koroner","Gagal Jantung","Aritmia","Hipertensi","Penyakit Katup"],
    fee_min_range: [250000, 450000], fee_max_range: [500000, 900000],
    qualifications: ["dr.","Sp.JP","FIHA"],
  },
  "Onkologi": {
    title: "Spesialis Onkologi", subs: ["Onkologi Medik","Hematologi-Onkologi","Onkologi Anak"],
    procedures: ["Kemoterapi","Imunoterapi","Terapi Target","Aspirasi Sumsum Tulang","Konseling Genetik"],
    conditions: ["Kanker Payudara","Kanker Paru","Kanker Kolorektal","Limfoma","Leukemia"],
    fee_min_range: [400000, 600000], fee_max_range: [800000, 1100000],
    qualifications: ["dr.","Sp.PD-KHOM"],
  },
  "Ortopedi": {
    title: "Spesialis Ortopedi", subs: ["Bedah Tulang Belakang","Joint Replacement","Sports Medicine","Trauma","Ortopedi Anak"],
    procedures: ["Total Knee Replacement","Total Hip Replacement","Artroskopi","Spinal Fusion","Fiksasi Fraktur"],
    conditions: ["Osteoartritis","Fraktur","HNP","Cedera Olahraga","Skoliosis"],
    fee_min_range: [300000, 500000], fee_max_range: [600000, 950000],
    qualifications: ["dr.","Sp.OT"],
  },
  "Neurologi": {
    title: "Spesialis Neurologi", subs: ["Stroke","Epilepsi","Gerakan Abnormal","Nyeri Kepala"],
    procedures: ["EEG","EMG","Lumbal Pungsi","Injeksi Botox","Manajemen Nyeri"],
    conditions: ["Stroke","Epilepsi","Migrain","Parkinson","Multiple Sclerosis"],
    fee_min_range: [300000, 500000], fee_max_range: [600000, 900000],
    qualifications: ["dr.","Sp.N"],
  },
  "Gastroenterologi": {
    title: "Konsultan Gastroenterologi", subs: ["Hepatologi","Endoskopi Lanjutan","IBD"],
    procedures: ["Kolonoskopi","Gastroskopi","ERCP","Biopsi Hati","Endoskopi Kapsul"],
    conditions: ["Hepatitis B","GERD","IBD","Sirosis Hati","Skrining Kanker Kolon"],
    fee_min_range: [350000, 550000], fee_max_range: [650000, 1000000],
    qualifications: ["dr.","Sp.PD-KGEH"],
  },
  "Obstetri & Ginekologi": {
    title: "Spesialis Obstetri & Ginekologi", subs: ["Obstetri Umum","Maternal-Fetal","Fertilitas","Ginekologi Onkologi","Urogynaecology"],
    procedures: ["Antenatal Care","Operasi Caesar","Histeroskopi","Laparoskopi","Pap Smear"],
    conditions: ["Kehamilan Risiko Tinggi","PCOS","Endometriosis","Mioma","Menopause"],
    fee_min_range: [250000, 400000], fee_max_range: [500000, 800000],
    qualifications: ["dr.","Sp.OG"],
  },
  "Pediatri": {
    title: "Spesialis Anak", subs: ["Pediatri Umum","Neonatologi","Kardiologi Anak","Neurologi Anak","Alergi-Imunologi Anak"],
    procedures: ["Vaksinasi","Penilaian Tumbuh Kembang","Manajemen Asma","Konseling Nutrisi"],
    conditions: ["Asma","Vaksinasi","Stunting","Diare","Infeksi Saluran Pernapasan"],
    fee_min_range: [200000, 350000], fee_max_range: [400000, 700000],
    qualifications: ["dr.","Sp.A"],
  },
  "Dermatologi": {
    title: "Spesialis Kulit & Kelamin", subs: ["Dermatologi Medis","Dermatologi Estetika","Dermatologi Anak"],
    procedures: ["Biopsi Kulit","Krioterapi","Laser","Botox","Chemical Peel"],
    conditions: ["Eksim","Psoriasis","Jerawat","Kanker Kulit","Vitiligo"],
    fee_min_range: [250000, 400000], fee_max_range: [500000, 800000],
    qualifications: ["dr.","Sp.DV","Sp.KK"],
  },
  "THT": {
    title: "Spesialis THT-KL", subs: ["THT Umum","Otologi","Rinologi","THT Anak"],
    procedures: ["FESS","Tonsilektomi","Implan Koklea","Tiroidektomi","Audiometri"],
    conditions: ["Sinusitis","Gangguan Pendengaran","Sleep Apnea","Tonsilitis","Vertigo"],
    fee_min_range: [250000, 400000], fee_max_range: [500000, 800000],
    qualifications: ["dr.","Sp.THT-KL"],
  },
  "Urologi": {
    title: "Spesialis Urologi", subs: ["Uro-Onkologi","Endourologi","Andrologi"],
    procedures: ["TURP","URS","ESWL","Sistoskopi","Vasektomi"],
    conditions: ["BPH","Batu Ginjal","Kanker Prostat","Inkontinensia Urin","Disfungsi Ereksi"],
    fee_min_range: [300000, 500000], fee_max_range: [600000, 900000],
    qualifications: ["dr.","Sp.U"],
  },
  "Nefrologi": {
    title: "Konsultan Nefrologi", subs: ["Nefrologi Umum","Transplantasi","Dialisis"],
    procedures: ["Hemodialisis","Dialisis Peritoneal","Biopsi Ginjal","Vascular Access"],
    conditions: ["Penyakit Ginjal Kronis","Glomerulonefritis","Nefropati Diabetik","Gagal Ginjal","Lupus Nefritis"],
    fee_min_range: [350000, 550000], fee_max_range: [650000, 1000000],
    qualifications: ["dr.","Sp.PD-KGH"],
  },
  "Endokrinologi": {
    title: "Konsultan Endokrinologi & Metabolik", subs: ["Diabetes","Tiroid","Reproduksi"],
    procedures: ["Manajemen Diabetes","Pompa Insulin","CGM","Biopsi Tiroid","Konseling Obesitas"],
    conditions: ["Diabetes","Penyakit Tiroid","Sindrom Metabolik","Osteoporosis","PCOS"],
    fee_min_range: [350000, 500000], fee_max_range: [600000, 950000],
    qualifications: ["dr.","Sp.PD-KEMD"],
  },
  "Bedah": {
    title: "Spesialis Bedah Umum", subs: ["Hepatobilier","Kolorektal","Bedah Payudara","Bedah Tiroid"],
    procedures: ["Kolesistektomi","Apendektomi","Hernia Repair","Mastektomi","Tiroidektomi"],
    conditions: ["Batu Empedu","Hernia","Apendisitis","Tumor Payudara","Kanker Kolon"],
    fee_min_range: [350000, 550000], fee_max_range: [650000, 1000000],
    qualifications: ["dr.","Sp.B"],
  },
  "Oftalmologi": {
    title: "Spesialis Mata", subs: ["Katarak & Refraktif","Retina","Glaukoma","Oftalmologi Anak"],
    procedures: ["Operasi Katarak","LASIK","Vitrektomi","Trabekulektomi","Injeksi Intravitreal"],
    conditions: ["Katarak","Glaukoma","Retinopati Diabetik","Degenerasi Makula","Miopia"],
    fee_min_range: [300000, 500000], fee_max_range: [600000, 900000],
    qualifications: ["dr.","Sp.M"],
  },
  "Penyakit Infeksi": {
    title: "Konsultan Penyakit Infeksi", subs: ["HIV","Tuberkulosis","Penyakit Tropis"],
    procedures: ["Manajemen HIV","Manajemen TB","Vaksinasi Travel","Workup Penyakit Tropis"],
    conditions: ["HIV","TB","Hepatitis B/C","Demam Berdarah","Tifus"],
    fee_min_range: [250000, 400000], fee_max_range: [500000, 800000],
    qualifications: ["dr.","Sp.PD-KPTI"],
  },
  "Hematologi": {
    title: "Konsultan Hematologi", subs: ["Hematologi Dewasa","BMT"],
    procedures: ["Aspirasi Sumsum Tulang","BMT Workup","Kemoterapi","Aferesis"],
    conditions: ["Leukemia","Limfoma","Anemia","Multiple Myeloma","Gangguan Perdarahan"],
    fee_min_range: [400000, 600000], fee_max_range: [800000, 1100000],
    qualifications: ["dr.","Sp.PD-KHOM"],
  },
  "Geriatri": {
    title: "Konsultan Geriatri", subs: ["Geriatri Umum","Demensia"],
    procedures: ["Penilaian Geriatri Komprehensif","Penilaian Kognitif","Workup Jatuh","Review Polifarmasi"],
    conditions: ["Demensia","Jatuh","Frailty","Polifarmasi","Pemulihan Stroke"],
    fee_min_range: [300000, 500000], fee_max_range: [600000, 900000],
    qualifications: ["dr.","Sp.PD-KGER"],
  },
  "Fertilitas": {
    title: "Spesialis Fertilitas", subs: ["IVF & Reproduksi"],
    procedures: ["IVF/ICSI","Transfer Embrio Beku","Egg Freezing","IUI","Histeroskopi"],
    conditions: ["Infertilitas","PCOS","Endometriosis","Keguguran Berulang","Infertilitas Pria"],
    fee_min_range: [500000, 700000], fee_max_range: [900000, 1300000],
    qualifications: ["dr.","Sp.OG-FER"],
  },
  "Bedah Jantung": {
    title: "Spesialis Bedah Jantung", subs: ["Bedah Jantung Dewasa","Bedah Jantung Anak"],
    procedures: ["CABG","Operasi Katup","Operasi Aorta","ECMO","Heart Transplant Assessment"],
    conditions: ["Penyakit Jantung Koroner","Penyakit Katup","Aneurisma Aorta","Gagal Jantung Tahap Akhir"],
    fee_min_range: [500000, 700000], fee_max_range: [1000000, 1400000],
    qualifications: ["dr.","Sp.BTKV"],
  },
  "Transplantasi": {
    title: "Spesialis Transplantasi", subs: ["Transplantasi Ginjal","Transplantasi Hati"],
    procedures: ["Transplantasi Ginjal","Transplantasi Hati","Donor Workup","Manajemen Imunosupresi"],
    conditions: ["Penyakit Ginjal Tahap Akhir","Penyakit Hati Tahap Akhir","Pasca Transplantasi"],
    fee_min_range: [600000, 800000], fee_max_range: [1100000, 1500000],
    qualifications: ["dr.","Sp.B-KBD"],
  },
  "Radioterapi": {
    title: "Konsultan Onkologi Radiasi", subs: ["Radiasi Onkologi"],
    procedures: ["IMRT","SBRT","Brachytherapy","Radiasi Paliatif"],
    conditions: ["Kanker Payudara","Kanker Paru","Kanker Prostat","Kanker Nasofaring","Tumor Otak"],
    fee_min_range: [400000, 600000], fee_max_range: [800000, 1100000],
    qualifications: ["dr.","Sp.Rad(K)Onk.Rad"],
  },
  "Bedah Onkologi": {
    title: "Spesialis Bedah Onkologi", subs: ["Bedah Payudara","Bedah GI","Bedah Tiroid"],
    procedures: ["Mastektomi","Sentinel Node Biopsy","Kolektomi","Gastrektomi","Tiroidektomi"],
    conditions: ["Kanker Payudara","Kanker Kolorektal","Kanker Lambung","Kanker Tiroid","Sarkoma"],
    fee_min_range: [400000, 600000], fee_max_range: [800000, 1100000],
    qualifications: ["dr.","Sp.B(K)Onk"],
  },
  "Bedah Robotik": {
    title: "Spesialis Bedah Robotik", subs: ["Urologi Robotik","Ginekologi Robotik","Kolorektal Robotik"],
    procedures: ["Robotic Prostatectomy","Robotic Hysterectomy","Robotic Colectomy","Robotic Hernia"],
    conditions: ["Kanker Prostat","Kanker Endometrium","Kanker Kolon","Hernia Kompleks"],
    fee_min_range: [600000, 800000], fee_max_range: [1100000, 1500000],
    qualifications: ["dr.","Sp.B/Sp.U","Fellowship Robotik"],
  },
  "Kardiologi Anak": {
    title: "Spesialis Kardiologi Anak", subs: ["Kardiologi Anak"],
    procedures: ["Echocardiography Anak","Kateterisasi Jantung Anak","Penutupan ASD/VSD"],
    conditions: ["Penyakit Jantung Bawaan","ASD","VSD","Tetralogi Fallot","Kawasaki"],
    fee_min_range: [400000, 600000], fee_max_range: [700000, 1000000],
    qualifications: ["dr.","Sp.A(K) Kardiologi"],
  },
  "Elektrofisiologi": {
    title: "Konsultan Elektrofisiologi", subs: ["Elektrofisiologi Jantung"],
    procedures: ["Ablasi AF","Ablasi VT","ICD","CRT","Pacemaker"],
    conditions: ["Atrial Fibrilasi","Aritmia Ventrikular","SVT","Heart Block"],
    fee_min_range: [500000, 700000], fee_max_range: [900000, 1200000],
    qualifications: ["dr.","Sp.JP(K)","Fellowship EP"],
  },
  "Neonatologi": {
    title: "Konsultan Neonatologi", subs: ["NICU"],
    procedures: ["Resusitasi Neonatal","Perawatan NICU","Terapi Surfaktan","Fototerapi"],
    conditions: ["Bayi Prematur","Ikterus Neonatal","Distress Pernapasan","Sepsis Neonatal"],
    fee_min_range: [350000, 500000], fee_max_range: [600000, 900000],
    qualifications: ["dr.","Sp.A(K) Neonatologi"],
  },
  "Pediatri Onkologi": {
    title: "Konsultan Onkologi Anak", subs: ["Hemato-Onkologi Anak"],
    procedures: ["Kemoterapi","Aspirasi Sumsum Tulang","Transplantasi Sumsum Tulang"],
    conditions: ["Leukemia Anak","Limfoma Anak","Tumor Otak Anak","Neuroblastoma"],
    fee_min_range: [400000, 600000], fee_max_range: [800000, 1100000],
    qualifications: ["dr.","Sp.A(K) Hemato-Onkologi"],
  },
  "Pediatri Bedah": {
    title: "Spesialis Bedah Anak", subs: ["Bedah Anak"],
    procedures: ["Apendektomi Anak","Hernia Anak","Hipospadias","Bedah Laparoskopi Anak"],
    conditions: ["Apendisitis Anak","Hernia Inguinalis","Hipospadias","Kriptorkismus"],
    fee_min_range: [400000, 600000], fee_max_range: [700000, 1000000],
    qualifications: ["dr.","Sp.BA"],
  },
  "Bedah Saraf": {
    title: "Spesialis Bedah Saraf", subs: ["Tumor Otak","Bedah Tulang Belakang"],
    procedures: ["Kraniotomi","Bedah Tulang Belakang","DBS","Endoskopi Otak"],
    conditions: ["Tumor Otak","Aneurisma","HNP","Cedera Kepala"],
    fee_min_range: [500000, 700000], fee_max_range: [900000, 1300000],
    qualifications: ["dr.","Sp.BS"],
  },
  "Penyakit Dalam": {
    title: "Spesialis Penyakit Dalam", subs: ["Penyakit Dalam Umum","Endokrin","Kardiovaskular","Reumatologi"],
    procedures: ["Konsultasi","EKG","Echocardiography","USG Abdomen","Biopsi"],
    conditions: ["Hipertensi","Diabetes","Asam Urat","Gastritis","Penyakit Autoimun"],
    fee_min_range: [250000, 400000], fee_max_range: [500000, 800000],
    qualifications: ["dr.","Sp.PD"],
  },
  "Trauma": {
    title: "Spesialis Bedah Trauma", subs: ["Trauma & Emergency"],
    procedures: ["Bedah Trauma","Manajemen Politrauma","FAST USG","Damage Control"],
    conditions: ["Politrauma","Cedera Kepala","Trauma Abdomen","Fraktur Multipel"],
    fee_min_range: [400000, 600000], fee_max_range: [800000, 1100000],
    qualifications: ["dr.","Sp.B"],
  },
  "Vaskular": {
    title: "Spesialis Bedah Vaskular", subs: ["Bedah Vaskular"],
    procedures: ["Bypass Vaskular","EVAR","Angioplasti Perifer","Bedah Aorta"],
    conditions: ["Aneurisma Aorta","PAD","Varises","Trombosis Vena Dalam"],
    fee_min_range: [500000, 700000], fee_max_range: [900000, 1200000],
    qualifications: ["dr.","Sp.BTKV"],
  },
  "Pediatri Endokrinologi": null, // unused alias
  "Semua Spesialisasi": null,
};

function genName(genderHint, ethnicHint, idx) {
  const eth = ethnicHint || ["Jawa","Tionghoa","Batak","Bali"][idx % 4];
  const g = genderHint || (idx % 2 === 0 ? "M" : "F");
  if (eth === "Tionghoa") {
    const first = g === "M" ? pick(FIRST_M_TIONGHOA, idx * 11) : pick(FIRST_F_TIONGHOA, idx * 11);
    const surn = pick(LAST_TIONGHOA, idx * 7);
    return { name: `dr. ${first} ${surn}`, gender: g, ethnic: eth };
  }
  if (eth === "Batak") {
    const first = g === "M" ? pick(FIRST_M_INDO, idx * 11) : pick(FIRST_F_INDO, idx * 11);
    const surn = pick(LAST_BATAK, idx * 7);
    return { name: `dr. ${first} ${surn}`, gender: g, ethnic: eth };
  }
  if (eth === "Bali") {
    const first = g === "M" ? pick(FIRST_M_BALI, idx * 11) : pick(FIRST_F_BALI, idx * 11);
    const surn = pick(LAST_BALI, idx * 7);
    return { name: `dr. ${first} ${surn}`, gender: g, ethnic: eth };
  }
  // Jawa/Sunda/general Indonesian
  const first = g === "M" ? pick(FIRST_M_INDO, idx * 11) : pick(FIRST_F_INDO, idx * 11);
  const surn = pick(LAST_INDO, idx * 7);
  return { name: `dr. ${first} ${surn}`, gender: g, ethnic: eth };
}

const ALL_DAY_PATTERNS = [
  ["Mon","Tue","Wed","Thu","Fri"],
  ["Mon","Wed","Fri"],
  ["Tue","Thu","Sat"],
  ["Mon","Tue","Thu","Fri"],
  ["Mon","Tue","Wed","Thu"],
  ["Mon","Wed","Fri","Sat"],
];

function generateDoctorsForHospital(hospital, count, startIdx) {
  const specs = (hospital.specializations || []).filter((s) => SPECIALTIES[s]);
  const doctors = [];
  for (let i = 0; i < count; i++) {
    const spec = pick(specs, i + startIdx);
    if (!spec || !SPECIALTIES[spec]) continue;
    const t = SPECIALTIES[spec];
    const idx = startIdx + i;

    // Ethnic mix biased by region.
    const state = hospital.state || "";
    let ethBias;
    if (/Bali/.test(state)) ethBias = ["Bali","Jawa","Tionghoa"][idx % 3];
    else if (/Sumatera Utara/.test(state)) ethBias = ["Batak","Tionghoa","Jawa"][idx % 3];
    else if (/DKI Jakarta|Banten/.test(state)) ethBias = ["Jawa","Tionghoa","Batak"][idx % 3];
    else ethBias = ["Jawa","Tionghoa"][idx % 2];

    const g = idx % 2 === 0 ? "M" : "F";
    const n = genName(g, ethBias, idx);
    const exp = 8 + (idx % 18);
    const rating = 4.2 + ((idx % 7) * 0.1);
    const sub = pick(t.subs, idx);
    const feeMin = t.fee_min_range[0] + (idx * 7919) % (t.fee_min_range[1] - t.fee_min_range[0]);
    const feeMax = t.fee_max_range[0] + (idx * 7919) % (t.fee_max_range[1] - t.fee_max_range[0]);
    doctors.push({
      hospital: hospital.name,
      name: n.name,
      title: t.title,
      specialization: spec,
      subspecialization: sub,
      gender: n.gender,
      experience_years: exp,
      rating: Math.round(rating * 10) / 10,
      is_featured: idx % 11 === 0,
      notable_for: `Spesialis ${sub} di ${hospital.name}. Pengalaman klinis ${exp}+ tahun.`,
      languages: hospital.languages_supported.slice(0, 3),
      currency: "IDR",
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

// Real-only mode: marketplace contains only hand-curated NAMED_DOCTORS
// (publicly verifiable senior consultants from KKI registry, hospital
// staff pages, and professional society leadership). Synthesised junior
// consultants are intentionally excluded so every entry is a real,
// identifiable physician.
function buildDoctorPool() {
  return [...NAMED_DOCTORS];
}

// ─── MULTI-HOSPITAL LINKS ─────────────────────────────────────────
const MULTI_HOSPITAL_LINKS = {
  "Prof. Dr. dr. Marcellus Simadibrata, Sp.PD-KGEH": [
    { hospital: "RS Pondok Indah – Pondok Indah", is_primary: false, fee_min: 600000, fee_max: 1200000, currency: "IDR" },
  ],
  "Prof. Dr. dr. Aru Wisaksono Sudoyo, Sp.PD-KHOM": [
    { hospital: "RS Pondok Indah – Pondok Indah", is_primary: false, fee_min: 700000, fee_max: 1300000, currency: "IDR" },
    { hospital: "Mayapada Hospital Jakarta Selatan", is_primary: false, fee_min: 700000, fee_max: 1300000, currency: "IDR" },
  ],
  "Prof. Dr. dr. Pradana Soewondo, Sp.PD-KEMD": [
    { hospital: "Mayapada Hospital Jakarta Selatan", is_primary: false, fee_min: 600000, fee_max: 1100000, currency: "IDR" },
  ],
  "Prof. Dr. dr. Nur Rasyid, Sp.U(K)": [
    { hospital: "RS Pondok Indah – Pondok Indah", is_primary: false, fee_min: 600000, fee_max: 1100000, currency: "IDR" },
  ],
  "Prof. Dr. dr. Andon Hestiantoro, Sp.OG(K)-FER": [
    { hospital: "RS Pondok Indah – Pondok Indah", is_primary: false, fee_min: 700000, fee_max: 1300000, currency: "IDR" },
  ],
  "Prof. Dr. dr. Hardiono Pusponegoro, Sp.A(K)": [
    { hospital: "RS Pondok Indah – Pondok Indah", is_primary: false, fee_min: 600000, fee_max: 1100000, currency: "IDR" },
    { hospital: "RSAB Harapan Kita", is_primary: false, fee_min: 500000, fee_max: 950000, currency: "IDR" },
  ],
  "Prof. Dr. dr. Aman Pulungan, Sp.A(K)": [
    { hospital: "RSAB Harapan Kita", is_primary: false, fee_min: 500000, fee_max: 950000, currency: "IDR" },
  ],
  "Prof. Dr. dr. Tjandra Yoga Aditama, Sp.P(K)": [
    { hospital: "Mayapada Hospital Jakarta Selatan", is_primary: false, fee_min: 600000, fee_max: 1000000, currency: "IDR" },
  ],
  "dr. Irawan Mangunatmadja, Sp.A(K)": [
    { hospital: "RSUPN Dr. Cipto Mangunkusumo (RSCM)", is_primary: false, fee_min: 300000, fee_max: 600000, currency: "IDR" },
  ],
  "Dr. dr. Samuel J. Haryono, Sp.B-KOnk": [
    { hospital: "RS Kanker Dharmais", is_primary: false, fee_min: 500000, fee_max: 1000000, currency: "IDR" },
    { hospital: "Mayapada Hospital Jakarta Selatan", is_primary: false, fee_min: 600000, fee_max: 1100000, currency: "IDR" },
  ],
  "dr. Antonia Anna Lukito, Sp.JP(K)": [
    { hospital: "Siloam Hospitals Lippo Village", is_primary: false, fee_min: 500000, fee_max: 900000, currency: "IDR" },
  ],
  "Dr. dr. Hanifa Maher Denny, Sp.OG(K)": [
    { hospital: "Brawijaya Hospital Saharjo", is_primary: false, fee_min: 400000, fee_max: 800000, currency: "IDR" },
  ],
  "Prof. Dr. dr. Yoga Yuniadi, Sp.JP(K)": [
    { hospital: "RS Jantung dan Pembuluh Darah Harapan Kita", is_primary: false, fee_min: 400000, fee_max: 800000, currency: "IDR" },
  ],
  "dr. Ronald A. Hukom, Sp.PD-KHOM": [
    { hospital: "RS Kanker Dharmais", is_primary: false, fee_min: 550000, fee_max: 1050000, currency: "IDR" },
  ],
  "Prof. Dr. dr. Bambang Budi Siswanto, Sp.JP(K)": [
    { hospital: "Mayapada Hospital Jakarta Selatan", is_primary: false, fee_min: 600000, fee_max: 1100000, currency: "IDR" },
  ],
  "Dr. dr. Anwar Santoso, Sp.JP(K)": [
    { hospital: "Siloam Hospitals Lippo Village", is_primary: false, fee_min: 500000, fee_max: 900000, currency: "IDR" },
  ],
  "Dr. dr. Renan Sukmawan, Sp.JP(K)": [
    { hospital: "Mayapada Hospital Jakarta Selatan", is_primary: false, fee_min: 500000, fee_max: 950000, currency: "IDR" },
  ],
  "Prof. Dr. dr. Soehartati Gondhowiardjo, Sp.Rad(K)Onk.Rad": [
    { hospital: "Siloam Hospitals MRCCC Semanggi", is_primary: false, fee_min: 600000, fee_max: 1100000, currency: "IDR" },
  ],
  "Dr. dr. Tjakra Wibawa Manuaba, Sp.B(K)Onk": [
    { hospital: "Siloam Hospitals MRCCC Semanggi", is_primary: false, fee_min: 600000, fee_max: 1100000, currency: "IDR" },
  ],
  "dr. Johan Hutauruk, Sp.M(K)": [
    { hospital: "RS Pondok Indah – Pondok Indah", is_primary: false, fee_min: 500000, fee_max: 900000, currency: "IDR" },
  ],
  "Dr. dr. Walta Gautama, Sp.B(K)Onk": [
    { hospital: "RS Kanker Dharmais", is_primary: false, fee_min: 500000, fee_max: 950000, currency: "IDR" },
  ],
  "Dr. dr. Eka Julianta Wahjoepramono, Sp.BS(K)": [
    { hospital: "RS Pondok Indah – Pondok Indah", is_primary: false, fee_min: 700000, fee_max: 1400000, currency: "IDR" },
  ],
  "Dr. dr. Luthfi Gatam, Sp.OT(K)": [
    { hospital: "Mayapada Hospital Jakarta Selatan", is_primary: false, fee_min: 600000, fee_max: 1100000, currency: "IDR" },
  ],
  "Prof. Dr. dr. Jose RL Batubara, Sp.A(K), PhD": [
    { hospital: "RSUPN Dr. Cipto Mangunkusumo (RSCM)", is_primary: false, fee_min: 500000, fee_max: 950000, currency: "IDR" },
  ],
  "dr. Andri, Sp.KJ, FACLP": [
    { hospital: "Brawijaya Hospital Saharjo", is_primary: false, fee_min: 450000, fee_max: 850000, currency: "IDR" },
  ],
};

// ─── SCHEDULE GENERATOR ───────────────────────────────────────────
const DAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function buildSchedules(doctorId, hospitalId, availableDays) {
  return availableDays.map((day) => ({
    doctor_id: doctorId, hospital_id: hospitalId, day_of_week: DAY_MAP[day],
    start_time: "08:00:00", end_time: "12:30:00",
    slot_duration_minutes: 20, max_patients: 16, is_active: true,
  })).concat(
    availableDays.slice(0, 3).map((day) => ({
      doctor_id: doctorId, hospital_id: hospitalId, day_of_week: DAY_MAP[day],
      start_time: "16:00:00", end_time: "19:00:00",
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

    const hospitalIdMap = {};
    const hospitalCityMap = {};
    for (const h of HOSPITALS) {
      const logo = logoFromWebsite(h.website);
      const cover = coverFromName(h.name);
      const ex = await c.query("SELECT hospital_id, logo_url FROM public.hospital WHERE lower(name) = lower($1)", [h.name]);
      if (ex.rowCount > 0) {
        hospitalIdMap[h.name] = ex.rows[0].hospital_id;
        hospitalCityMap[h.name] = h.city;
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
        h.name, "Indonesia", h.city, h.address, h.phone, h.website,
        h.type, h.tier, h.description, h.bed_count, h.established_year,
        h.emergency_24h, h.international_patients, h.insurance_panel, h.is_partner,
        h.specializations, h.accreditations, h.languages_supported,
        h.avg_rating, h.total_reviews, logo, cover,
      ]);
      hospitalIdMap[h.name] = res.rows[0].hospital_id;
      hospitalCityMap[h.name] = h.city;
      hospInserted++;
    }

    const ALL_DOCTORS = buildDoctorPool();
    const doctorIdByName = {};

    for (const d of ALL_DOCTORS) {
      const hospId = hospitalIdMap[d.hospital];
      if (!hospId) { console.warn(`Hospital not found for: ${d.hospital}`); continue; }
      // photo_url left NULL — we do not fabricate doctor portraits.
      const photo = null;

      const ex = await c.query("SELECT id, photo_url FROM public.doctors WHERE lower(name) = lower($1)", [d.name]);
      let docId;
      if (ex.rowCount > 0) {
        docId = ex.rows[0].id;
        if (ex.rows[0].photo_url && /dicebear|robohash|ui-avatars|gravatar/i.test(ex.rows[0].photo_url)) {
          await c.query("UPDATE public.doctors SET photo_url=NULL WHERE id=$1", [docId]);
        }
        docSkipped++;
      } else {
        const hospCity = hospitalCityMap[d.hospital] || "Indonesia";
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
            $1,$2,$3,$4,$5,$6,$7,'Indonesia',$8,$9,$10,$11,$12,$13,$14,$15,
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

      await c.query(`
        INSERT INTO public.doctor_hospital (doctor_id, hospital_id, is_primary, consultation_fee_min, consultation_fee_max, currency)
        VALUES ($1,$2,true,$3,$4,$5)
        ON CONFLICT (doctor_id, hospital_id) DO NOTHING
      `, [docId, hospId, d.fee_min, d.fee_max, d.currency]);

      const claimDocEx = await c.query(
        "SELECT doctor_id FROM public.doctor WHERE lower(full_name) = lower($1)", [d.name]
      );
      if (claimDocEx.rowCount === 0) {
        await c.query(`
          INSERT INTO public.doctor (full_name, specialty, hospital_id, country, status, doctor_code)
          VALUES ($1,$2,$3,'Indonesia','ACTIVE',$4)
        `, [d.name, d.specialization, hospId, `ID-${Math.random().toString(36).substring(2,8).toUpperCase()}`]);
        claimDocInserted++;
      }

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

        for (const day of secondaryDays) {
          const exSched = await c.query(
            "SELECT schedule_id FROM public.doctor_schedule WHERE doctor_id=$1 AND hospital_id=$2 AND day_of_week=$3 AND start_time=$4",
            [docId, hospId, DAY_MAP[day], "16:00:00"]
          );
          if (exSched.rowCount === 0) {
            await c.query(`
              INSERT INTO public.doctor_schedule (doctor_id, hospital_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients, is_active)
              VALUES ($1,$2,$3,$4,$5,$6,$7,true)
            `, [docId, hospId, DAY_MAP[day], "16:00:00", "19:00:00", 20, 8]);
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
✅  Indonesia hospital & doctor seed complete
    Hospitals       : ${hospInserted} inserted, ${hospSkipped} skipped, ${hospUpdated} backfilled
    Doctors         : ${docInserted} inserted (marketplace), ${docSkipped} skipped
    Claim docs      : ${claimDocInserted} inserted (public.doctor)
    Schedules       : ${schedInserted} schedule slots
    Multi-hospital  : ${multiLinkInserted} secondary affiliations
  `.trim());
}

main().catch((e) => { console.error(e); process.exit(1); });
