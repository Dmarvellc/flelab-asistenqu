/* eslint-disable */
/**
 * scripts/seed-malaysia.js
 * ─────────────────────────────────────────────────────────────────
 * Seed comprehensive Malaysian hospital + doctor + schedule data.
 *
 * Tables populated:
 *   public.hospital          – hospital master (also used by claims)
 *   public.doctors           – marketplace doctor profiles
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

// ─── HOSPITALS ────────────────────────────────────────────────────
// Fields: name, country, city, address, phone, type, tier, website,
//         description, bed_count, established_year, emergency_24h,
//         international_patients, insurance_panel, is_partner,
//         specializations, accreditations, languages_supported
const HOSPITALS = [
  // ── KUALA LUMPUR ─────────────────────────────────────────────
  {
    name: "Gleneagles Hospital Kuala Lumpur", city: "Kuala Lumpur", state: "Kuala Lumpur",
    address: "286 & 288, Jalan Ampang, 50450 Kuala Lumpur",
    phone: "+60 3-4141 3000", website: "https://www.gleneagles.com.my",
    type: "PRIVATE", tier: "PREMIUM", bed_count: 380, established_year: 1996,
    description: "One of Malaysia's leading private hospitals, part of the IHH Healthcare group. Renowned for cardiology, oncology and orthopaedics.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Onkologi","Ortopedi","Neurologi","Gastroenterologi","Obstetri & Ginekologi","Nefrologi","Bedah Umum"],
    accreditations: ["JCI","MSQH"],
    languages_supported: ["English","Malay","Mandarin","Cantonese","Tamil"],
    avg_rating: 4.6, total_reviews: 3200,
  },
  {
    name: "Prince Court Medical Centre", city: "Kuala Lumpur", state: "Kuala Lumpur",
    address: "39, Jalan Kia Peng, 50450 Kuala Lumpur",
    phone: "+60 3-2160 0000", website: "https://www.princecourt.com",
    type: "PRIVATE", tier: "PREMIUM", bed_count: 257, established_year: 2008,
    description: "Award-winning private hospital consistently ranked among Asia's best. Known for exceptional patient experience and complex procedures.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Bedah Jantung","Onkologi","Neurologi","Ortopedi","Transplantasi","Bedah Robotik"],
    accreditations: ["JCI","MSQH"],
    languages_supported: ["English","Malay","Mandarin","Arabic","Japanese"],
    avg_rating: 4.8, total_reviews: 2800,
  },
  {
    name: "Pantai Hospital Kuala Lumpur", city: "Kuala Lumpur", state: "Kuala Lumpur",
    address: "8, Jalan Bukit Pantai, 59100 Kuala Lumpur",
    phone: "+60 3-2296 0888", website: "https://www.pantai.com.my",
    type: "PRIVATE", tier: "PREMIUM", bed_count: 450, established_year: 1974,
    description: "Malaysia's oldest private hospital, part of Pantai Holdings (IHH). Comprehensive medical services with strong cardiology and oncology units.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Onkologi","Bedah Umum","Ortopedi","Obstetri & Ginekologi","Pediatri","THT","Dermatologi"],
    accreditations: ["MSQH","ISO 9001"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.5, total_reviews: 4100,
  },
  {
    name: "Hospital Kuala Lumpur (HKL)", city: "Kuala Lumpur", state: "Kuala Lumpur",
    address: "Jalan Pahang, 50586 Kuala Lumpur",
    phone: "+60 3-2615 5555", website: "https://hkl.moh.gov.my",
    type: "GOVERNMENT", tier: "TERTIARY", bed_count: 2500, established_year: 1870,
    description: "Malaysia's largest and oldest government hospital. Premier referral centre for complex and specialist cases.",
    emergency_24h: true, international_patients: false, insurance_panel: false, is_partner: false,
    specializations: ["Semua Spesialisasi","Bedah Jantung","Transplantasi","Neurologi","Onkologi","Ortopedi","Neonatologi"],
    accreditations: ["MSQH","ISO 15189"],
    languages_supported: ["Malay","English"],
    avg_rating: 3.9, total_reviews: 5600,
  },
  {
    name: "Hospital Putrajaya", city: "Putrajaya", state: "Putrajaya",
    address: "Presint 7, 62250 Putrajaya",
    phone: "+60 3-8887 5000", website: "https://hpj.moh.gov.my",
    type: "GOVERNMENT", tier: "TERTIARY", bed_count: 700, established_year: 2010,
    description: "Modern government hospital serving Putrajaya and surrounding areas with comprehensive specialist services.",
    emergency_24h: true, international_patients: false, insurance_panel: false, is_partner: false,
    specializations: ["Kardiologi","Neurologi","Ortopedi","Pediatri","Obstetri & Ginekologi","Bedah Umum"],
    accreditations: ["MSQH"],
    languages_supported: ["Malay","English"],
    avg_rating: 4.1, total_reviews: 1800,
  },
  {
    name: "KPJ Tawakkal Specialist Hospital", city: "Kuala Lumpur", state: "Kuala Lumpur",
    address: "202, Jalan Pahang, 53000 Kuala Lumpur",
    phone: "+60 3-4023 3599", website: "https://www.kpj.com.my/tawakkal",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 244, established_year: 1994,
    description: "KPJ group hospital specialising in cardiac surgery, neurosciences and oncology in Kuala Lumpur.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Bedah Jantung","Neurologi","Onkologi","Ortopedi","Gastroenterologi"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.4, total_reviews: 1500,
  },

  // ── SELANGOR ─────────────────────────────────────────────────
  {
    name: "Sunway Medical Centre", city: "Subang Jaya", state: "Selangor",
    address: "No 5, Jalan Lagoon Selatan, Bandar Sunway, 47500 Subang Jaya",
    phone: "+60 3-7491 9191", website: "https://www.sunwaymedical.com",
    type: "PRIVATE", tier: "PREMIUM", bed_count: 760, established_year: 1999,
    description: "One of Malaysia's largest private hospitals. Renowned for minimally invasive surgery, cardiology and oncology.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Bedah Jantung","Onkologi","Ortopedi","Neurologi","Fertilitas","Bedah Robotik","Nefrologi"],
    accreditations: ["JCI","MSQH"],
    languages_supported: ["English","Malay","Mandarin","Cantonese","Tamil"],
    avg_rating: 4.7, total_reviews: 4800,
  },
  {
    name: "Subang Jaya Medical Centre (SJMC)", city: "Subang Jaya", state: "Selangor",
    address: "1, Jalan SS 12/1A, 47500 Subang Jaya",
    phone: "+60 3-5639 1212", website: "https://www.sjmc.com.my",
    type: "PRIVATE", tier: "PREMIUM", bed_count: 420, established_year: 1987,
    description: "Leading private hospital in the Klang Valley, known for cancer care, orthopaedics and general medicine.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Onkologi","Ortopedi","Kardiologi","Bedah Umum","Pediatri","Obstetri & Ginekologi"],
    accreditations: ["MSQH","ISO 9001"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.5, total_reviews: 3100,
  },
  {
    name: "Beacon Hospital", city: "Petaling Jaya", state: "Selangor",
    address: "1, Jalan 215, Section 51, 46050 Petaling Jaya",
    phone: "+60 3-7787 8000", website: "https://www.beaconhospital.com.my",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 200, established_year: 2010,
    description: "Malaysia's leading cancer specialist hospital. Affiliated with MD Anderson Cancer Center USA.",
    emergency_24h: false, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Onkologi","Hematologi","Bedah Onkologi","Radioterapi","Kemoterapi"],
    accreditations: ["MSQH","JCI"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.8, total_reviews: 1900,
  },
  {
    name: "KPJ Ampang Puteri Specialist Hospital", city: "Ampang", state: "Selangor",
    address: "1, Jalan Mamanda 9, Ampang Point, 68000 Ampang",
    phone: "+60 3-4270 2500", website: "https://www.kpj.com.my/ampang",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 253, established_year: 1994,
    description: "Specialist hospital serving Ampang and East Kuala Lumpur, strong in orthopaedics and women's health.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Ortopedi","Obstetri & Ginekologi","Kardiologi","Pediatri","Bedah Umum","Gastroenterologi"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.4, total_reviews: 2000,
  },
  {
    name: "KPJ Damansara Specialist Hospital", city: "Petaling Jaya", state: "Selangor",
    address: "119, Jalan SS 20/10, Damansara Utama, 47400 Petaling Jaya",
    phone: "+60 3-7718 1000", website: "https://www.kpj.com.my/damansara",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 250, established_year: 1995,
    description: "KPJ Damansara serves Petaling Jaya with comprehensive specialist and emergency services.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Neurologi","Ortopedi","Onkologi","Urologi","Bedah Umum"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.3, total_reviews: 1700,
  },
  {
    name: "Thomson Hospital Kota Damansara", city: "Kota Damansara", state: "Selangor",
    address: "11, Jalan Teknologi, Taman Sains Selangor 1, Kota Damansara, 47810 Petaling Jaya",
    phone: "+60 3-6287 1000", website: "https://www.thomsonhospital.com",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 320, established_year: 2011,
    description: "Modern hospital in Kota Damansara known for fertility treatment, paediatrics and advanced surgical care.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Fertilitas","Pediatri","Obstetri & Ginekologi","Kardiologi","Ortopedi","Bedah Umum"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.5, total_reviews: 2200,
  },
  {
    name: "Tropicana Medical Centre", city: "Petaling Jaya", state: "Selangor",
    address: "Lot 2687, Jalan Teknologi 3/1, Tropicana Indah Resort Homes, 47410 Petaling Jaya",
    phone: "+60 3-7806 2000", website: "https://www.tropicanamed.com",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 200, established_year: 2007,
    description: "Modern private hospital in Petaling Jaya with comprehensive specialist services.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Gastroenterologi","Ortopedi","Obstetri & Ginekologi","Pediatri"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.3, total_reviews: 1200,
  },
  {
    name: "Hospital Selayang", city: "Batu Caves", state: "Selangor",
    address: "Lebuhraya Selayang-Kepong, 68100 Batu Caves",
    phone: "+60 3-6120 5555", website: "https://hsy.moh.gov.my",
    type: "GOVERNMENT", tier: "TERTIARY", bed_count: 900, established_year: 2000,
    description: "One of Malaysia's premier government tertiary hospitals, the national centre for liver transplantation.",
    emergency_24h: true, international_patients: false, insurance_panel: false, is_partner: false,
    specializations: ["Transplantasi Hati","Hepatologi","Gastroenterologi","Neurologi","Bedah Umum","Pediatri"],
    accreditations: ["MSQH"],
    languages_supported: ["Malay","English"],
    avg_rating: 4.0, total_reviews: 2900,
  },

  // ── PENANG ───────────────────────────────────────────────────
  {
    name: "Gleneagles Hospital Penang", city: "George Town", state: "Penang",
    address: "1, Jalan Pangkor, 10050 George Town, Penang",
    phone: "+60 4-222 9111", website: "https://www.gleneagles.com.my/penang",
    type: "PRIVATE", tier: "PREMIUM", bed_count: 380, established_year: 1973,
    description: "One of Penang's leading private hospitals, part of IHH Healthcare. Known for cardiology, oncology and orthopaedics.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Onkologi","Ortopedi","Neurologi","Bedah Umum","Obstetri & Ginekologi"],
    accreditations: ["MSQH","JCI"],
    languages_supported: ["English","Malay","Mandarin","Hokkien","Tamil"],
    avg_rating: 4.6, total_reviews: 3600,
  },
  {
    name: "Penang Adventist Hospital", city: "George Town", state: "Penang",
    address: "465, Jalan Burma, 10350 George Town, Penang",
    phone: "+60 4-222 7200", website: "https://www.pah.com.my",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 260, established_year: 1924,
    description: "One of Penang's oldest and most trusted private hospitals. Strong focus on holistic patient care and cardiology.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Bedah Umum","Ortopedi","Obstetri & Ginekologi","Pediatri","Oftalmologi"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil","Hokkien"],
    avg_rating: 4.4, total_reviews: 2100,
  },
  {
    name: "Island Hospital Penang", city: "George Town", state: "Penang",
    address: "308, Macalister Road, 10450 George Town, Penang",
    phone: "+60 4-228 8222", website: "https://www.islandhospital.com",
    type: "PRIVATE", tier: "PREMIUM", bed_count: 350, established_year: 1996,
    description: "Award-winning private hospital known for cancer care, cardiac surgery and international patient services.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Onkologi","Kardiologi","Bedah Jantung","Ortopedi","Neurologi","Gastroenterologi"],
    accreditations: ["MSQH","ISO 9001"],
    languages_supported: ["English","Malay","Mandarin","Hokkien","Tamil"],
    avg_rating: 4.5, total_reviews: 2800,
  },
  {
    name: "KPJ Penang Specialist Hospital", city: "Bukit Mertajam", state: "Penang",
    address: "2, Jalan Baru, 14000 Bukit Mertajam, Penang",
    phone: "+60 4-549 5666", website: "https://www.kpj.com.my/penang",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 180, established_year: 2004,
    description: "Serves the Seberang Perai area with comprehensive specialist medical care.",
    emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true,
    specializations: ["Ortopedi","Kardiologi","Gastroenterologi","Obstetri & Ginekologi","Pediatri"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.2, total_reviews: 900,
  },

  // ── JOHOR ────────────────────────────────────────────────────
  {
    name: "Pantai Hospital Johor Bahru", city: "Johor Bahru", state: "Johor",
    address: "Lorong Bahtera, Taman Abad, 80250 Johor Bahru",
    phone: "+60 7-223 9222", website: "https://www.pantai.com.my/johor-bahru",
    type: "PRIVATE", tier: "PREMIUM", bed_count: 310, established_year: 1986,
    description: "Leading private hospital in Johor serving both Malaysian and Singaporean patients. Known for cardiology.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Onkologi","Ortopedi","Neurologi","Bedah Umum","Obstetri & Ginekologi"],
    accreditations: ["MSQH","ISO 9001"],
    languages_supported: ["English","Malay","Mandarin","Cantonese","Tamil"],
    avg_rating: 4.5, total_reviews: 3400,
  },
  {
    name: "Regency Specialist Hospital", city: "Johor Bahru", state: "Johor",
    address: "Jalan Dato Sulaiman, Century Garden, 80250 Johor Bahru",
    phone: "+60 7-333 8888", website: "https://www.regencyspecialist.com",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 220, established_year: 2007,
    description: "Modern specialist hospital in JB, popular among both Malaysians and Singaporeans.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Ortopedi","Onkologi","Gastroenterologi","Urologi","Bedah Umum"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.4, total_reviews: 1800,
  },
  {
    name: "Columbia Asia Hospital Johor Bahru", city: "Johor Bahru", state: "Johor",
    address: "Block A, Persiaran Permas 10, Bandar Baru Permas Jaya, 81750 Johor Bahru",
    phone: "+60 7-388 9999", website: "https://www.columbiaasia.com",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 148, established_year: 2003,
    description: "Part of the Columbia Asia chain, offering accessible specialist care in southern Johor.",
    emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true,
    specializations: ["Bedah Umum","Obstetri & Ginekologi","Ortopedi","Pediatri","Kardiologi"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.2, total_reviews: 1100,
  },

  // ── IPOH / PERAK ─────────────────────────────────────────────
  {
    name: "KPJ Ipoh Specialist Hospital", city: "Ipoh", state: "Perak",
    address: "26, Jalan Raja Dihilir, 30350 Ipoh, Perak",
    phone: "+60 5-240 8777", website: "https://www.kpj.com.my/ipoh",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 193, established_year: 1994,
    description: "Leading specialist hospital in Perak state, offering a full range of medical specialties.",
    emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Ortopedi","Gastroenterologi","Onkologi","Neurologi","Obstetri & Ginekologi"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.3, total_reviews: 1300,
  },
  {
    name: "Fatimah Hospital", city: "Ipoh", state: "Perak",
    address: "1, Jalan Dato Lau Pak Khuan, 30450 Ipoh, Perak",
    phone: "+60 5-545 5777", website: "https://www.fatimah.com.my",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 250, established_year: 1939,
    description: "One of Perak's oldest and largest private hospitals, trusted for generations of healthcare.",
    emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true,
    specializations: ["Bedah Umum","Ortopedi","Obstetri & Ginekologi","Kardiologi","Pediatri","ENT"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil","Hokkien"],
    avg_rating: 4.3, total_reviews: 1600,
  },

  // ── MELAKA ───────────────────────────────────────────────────
  {
    name: "Mahkota Medical Centre", city: "Melaka", state: "Melaka",
    address: "3, Mahkota Melaka, Jalan Mufti Haji Khalil, 75000 Melaka",
    phone: "+60 6-285 2999", website: "https://www.mahkotamedical.com",
    type: "PRIVATE", tier: "PREMIUM", bed_count: 388, established_year: 1994,
    description: "Melaka's premier private hospital and leading medical tourism destination. Accredited by JCI.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Onkologi","Ortopedi","Neurologi","Gastroenterologi","Oftalmologi","Bedah Robotik"],
    accreditations: ["JCI","MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil","Arabic","Indonesian"],
    avg_rating: 4.6, total_reviews: 2500,
  },

  // ── KOTA KINABALU / SABAH ────────────────────────────────────
  {
    name: "KPJ Sabah Specialist Hospital", city: "Kota Kinabalu", state: "Sabah",
    address: "Riverson Walk, Jalan Coastal Highway, 88100 Kota Kinabalu",
    phone: "+60 88-322 000", website: "https://www.kpj.com.my/sabah",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 180, established_year: 2010,
    description: "The leading private specialist hospital in Sabah, serving East Malaysia's growing healthcare needs.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Ortopedi","Gastroenterologi","Onkologi","Obstetri & Ginekologi","Bedah Umum"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Kadazan","Mandarin","Filipino"],
    avg_rating: 4.4, total_reviews: 1100,
  },
  {
    name: "Queen Elizabeth Hospital Kota Kinabalu", city: "Kota Kinabalu", state: "Sabah",
    address: "Jalan Penampang, 88200 Kota Kinabalu, Sabah",
    phone: "+60 88-218 166", website: "https://hqe.moh.gov.my",
    type: "GOVERNMENT", tier: "TERTIARY", bed_count: 973, established_year: 1956,
    description: "Largest government hospital in Sabah, the main referral centre for East Malaysia.",
    emergency_24h: true, international_patients: false, insurance_panel: false, is_partner: false,
    specializations: ["Semua Spesialisasi","Bedah Jantung","Neurologi","Neonatologi","Ortopedi","Onkologi"],
    accreditations: ["MSQH"],
    languages_supported: ["Malay","English","Kadazan"],
    avg_rating: 3.8, total_reviews: 2400,
  },

  // ── KUCHING / SARAWAK ────────────────────────────────────────
  {
    name: "KPJ Kuching Specialist Hospital", city: "Kuching", state: "Sarawak",
    address: "Lot 10768, Section 64 KTLD, Jalan Tun Jugah, 93350 Kuching",
    phone: "+60 82-371 877", website: "https://www.kpj.com.my/kuching",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 200, established_year: 2008,
    description: "Premier private specialist hospital in Sarawak offering comprehensive medical care.",
    emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Ortopedi","Gastroenterologi","Onkologi","Bedah Umum","Obstetri & Ginekologi"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Iban"],
    avg_rating: 4.3, total_reviews: 800,
  },
  {
    name: "Normah Medical Specialist Centre", city: "Kuching", state: "Sarawak",
    address: "Lot 937, Section 30, Jalan Tun Abdul Razak, 93050 Kuching",
    phone: "+60 82-440 055", website: "https://www.normah.com",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 221, established_year: 1994,
    description: "Kuching's pioneering specialist hospital known for cardiac surgery and orthopaedic excellence.",
    emergency_24h: true, international_patients: true, insurance_panel: true, is_partner: true,
    specializations: ["Bedah Jantung","Kardiologi","Ortopedi","Neurologi","Obstetri & Ginekologi","Bedah Umum"],
    accreditations: ["MSQH","ISO 9001"],
    languages_supported: ["English","Malay","Mandarin","Iban"],
    avg_rating: 4.5, total_reviews: 1000,
  },

  // ── NEGERI SEMBILAN ──────────────────────────────────────────
  {
    name: "KPJ Seremban Specialist Hospital", city: "Seremban", state: "Negeri Sembilan",
    address: "Jalan Rasah, 70300 Seremban, Negeri Sembilan",
    phone: "+60 6-769 3333", website: "https://www.kpj.com.my/seremban",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 214, established_year: 1994,
    description: "Leading private hospital in Negeri Sembilan, offering comprehensive specialist care.",
    emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Ortopedi","Onkologi","Gastroenterologi","Obstetri & Ginekologi","Pediatri"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin","Tamil"],
    avg_rating: 4.3, total_reviews: 900,
  },

  // ── PAHANG ───────────────────────────────────────────────────
  {
    name: "KPJ Pahang Specialist Hospital", city: "Kuantan", state: "Pahang",
    address: "Jalan Tanah Putih, 25250 Kuantan, Pahang",
    phone: "+60 9-516 8888", website: "https://www.kpj.com.my/pahang",
    type: "PRIVATE", tier: "SPECIALIST", bed_count: 163, established_year: 1994,
    description: "KPJ Pahang serves the east coast region with specialist medical care.",
    emergency_24h: true, international_patients: false, insurance_panel: true, is_partner: true,
    specializations: ["Kardiologi","Ortopedi","Gastroenterologi","Bedah Umum","Obstetri & Ginekologi"],
    accreditations: ["MSQH"],
    languages_supported: ["English","Malay","Mandarin"],
    avg_rating: 4.2, total_reviews: 700,
  },
];

// ─── DOCTORS ──────────────────────────────────────────────────────
// Linked by hospital name for easy lookup
const DOCTORS = [
  // ── GLENEAGLES KL ──────────────────────────────────────────
  { hospital: "Gleneagles Hospital Kuala Lumpur", name: "Dato' Dr. Wan Azman Wan Ahmad", title: "Senior Consultant Cardiologist", specialization: "Kardiologi", subspecialization: "Interventional Cardiology", gender: "M", experience_years: 28, rating: 4.9, is_featured: true, notable_for: "Pioneer of complex coronary interventions in Malaysia. Over 6,000 angioplasty procedures performed.", languages: ["English","Malay"], currency: "MYR", fee_min: 200, fee_max: 450, qualifications: ["MBBS (Malaya)","MRCP (UK)","FACC","Fellowship (Interventional Cardiology, Paris)"], procedures_offered: ["Coronary Angioplasty","Complex PCI","TAVI","Rotablation","IVUS/OCT"], conditions_treated: ["Coronary Artery Disease","Heart Attack","Structural Heart Disease","Heart Failure"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 8500, total_reviews: 620 },
  { hospital: "Gleneagles Hospital Kuala Lumpur", name: "Dr. Lim Tze Woei", title: "Consultant Oncologist & Haematologist", specialization: "Onkologi", subspecialization: "Medical Oncology & Haematology", gender: "M", experience_years: 18, rating: 4.8, is_featured: true, notable_for: "Expert in lymphoma, leukemia and lung cancer. Pioneer of immunotherapy programs in Malaysia.", languages: ["English","Malay","Mandarin"], currency: "MYR", fee_min: 250, fee_max: 500, qualifications: ["MBBS (Malaya)","MRCP (UK)","FAMS (Haematology)","Fellowship (Memorial Sloan Kettering)"], procedures_offered: ["Chemotherapy","Immunotherapy","CAR-T Cell Therapy","Bone Marrow Biopsy","PICC Line"], conditions_treated: ["Lymphoma","Leukemia","Lung Cancer","Breast Cancer","Multiple Myeloma"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4200, total_reviews: 380 },
  { hospital: "Gleneagles Hospital Kuala Lumpur", name: "Dato' Dr. Zulkifli Mohd Zainudin", title: "Senior Consultant Orthopaedic Surgeon", specialization: "Ortopedi", subspecialization: "Spine Surgery", gender: "M", experience_years: 30, rating: 4.8, is_featured: true, notable_for: "Malaysia's leading spine surgeon. Performed over 4,000 spinal surgeries including complex deformity corrections.", languages: ["English","Malay"], currency: "MYR", fee_min: 200, fee_max: 450, qualifications: ["MBBS (Malaya)","MS Orthopaedic (Malaya)","Fellowship (Spine Surgery, Germany)","FRCS"], procedures_offered: ["Spinal Fusion","MISS (Minimally Invasive Spine Surgery)","Disc Replacement","Scoliosis Correction","Vertebroplasty"], conditions_treated: ["Herniated Disc","Spinal Stenosis","Scoliosis","Spinal Fracture","Degenerative Disc Disease"], available_days: ["Mon","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 5100, total_reviews: 490 },
  { hospital: "Gleneagles Hospital Kuala Lumpur", name: "Dr. Heng Joo Nee", title: "Consultant Neurologist", specialization: "Neurologi", subspecialization: "Stroke & Epilepsy", gender: "F", experience_years: 15, rating: 4.7, is_featured: false, notable_for: "Expert in acute stroke management and epilepsy. Heads the stroke unit at Gleneagles KL.", languages: ["English","Malay","Mandarin","Cantonese"], currency: "MYR", fee_min: 180, fee_max: 380, qualifications: ["MBBS (Malaya)","MRCP (UK)","Fellowship (Neurology, National Neuroscience Institute Singapore)"], procedures_offered: ["Stroke Thrombolysis","EEG","EMG","Nerve Conduction Study","Lumbar Puncture"], conditions_treated: ["Stroke","Epilepsy","Migraine","Parkinson's Disease","Multiple Sclerosis"], available_days: ["Mon","Tue","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3800, total_reviews: 280 },

  // ── PRINCE COURT ───────────────────────────────────────────
  { hospital: "Prince Court Medical Centre", name: "Dato' Dr. Mohamed Ezani Md Taib", title: "Senior Consultant Cardiologist", specialization: "Kardiologi", subspecialization: "Interventional Cardiology", gender: "M", experience_years: 28, rating: 4.9, is_featured: true, notable_for: "Former Director of National Heart Institute (IJN). One of Malaysia's most experienced interventional cardiologists.", languages: ["English","Malay"], currency: "MYR", fee_min: 250, fee_max: 500, qualifications: ["MBBS (Melbourne)","MRCP (London)","FACC","FSCAI"], procedures_offered: ["Complex PCI","TAVI","CTO PCI","Structural Heart Intervention","Coronary Angiography"], conditions_treated: ["Coronary Artery Disease","Heart Failure","Structural Heart Disease","Hypertension"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 7200, total_reviews: 540 },
  { hospital: "Prince Court Medical Centre", name: "Dr. Lim Soo Kun", title: "Consultant Gastroenterologist & Hepatologist", specialization: "Gastroenterologi", subspecialization: "Hepatology & Advanced Endoscopy", gender: "M", experience_years: 22, rating: 4.8, is_featured: true, notable_for: "Leading hepatologist in Malaysia. Expert in ERCP, EUS and liver disease management.", languages: ["English","Malay","Mandarin"], currency: "MYR", fee_min: 200, fee_max: 420, qualifications: ["MBBS (Malaya)","MRCP (UK)","FRCP (Edinburgh)","Fellowship (Advanced Endoscopy, Japan)"], procedures_offered: ["ERCP","EUS","Colonoscopy","Gastroscopy","Liver Biopsy"], conditions_treated: ["Hepatitis B/C","Liver Cirrhosis","Pancreatic Disease","IBD","Colon Cancer"], available_days: ["Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 5600, total_reviews: 430 },
  { hospital: "Prince Court Medical Centre", name: "Prof. Dr. Jeyaindran Sinnadurai", title: "Senior Consultant Neurologist & Stroke Physician", specialization: "Neurologi", subspecialization: "Stroke Medicine & Neurorehabilitation", gender: "M", experience_years: 32, rating: 4.9, is_featured: true, notable_for: "Malaysia's foremost stroke physician. Former head of neurology at HUKM. Established Malaysia's first stroke registry.", languages: ["English","Malay","Tamil"], currency: "MYR", fee_min: 300, fee_max: 600, qualifications: ["MBBS (London)","MRCP (UK)","PhD Neuroscience","FRCP"], procedures_offered: ["Stroke Management","tPA Thrombolysis","Mechanical Thrombectomy coordination","EEG","Neurological Rehabilitation"], conditions_treated: ["Stroke","TIA","Parkinson's Disease","Epilepsy","Dementia"], available_days: ["Mon","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 9800, total_reviews: 720 },

  // ── SUNWAY MEDICAL ─────────────────────────────────────────
  { hospital: "Sunway Medical Centre", name: "Dato' Dr. Yoong Boon Keng", title: "Consultant Cardiothoracic Surgeon", specialization: "Kardiologi", subspecialization: "Cardiothoracic & Vascular Surgery", gender: "M", experience_years: 30, rating: 4.8, is_featured: true, notable_for: "Pioneer of minimally invasive cardiac surgery in Malaysia. Over 3,500 cardiac procedures.", languages: ["English","Mandarin","Malay"], currency: "MYR", fee_min: 200, fee_max: 450, qualifications: ["MBBS (Malaya)","FRCS (Edinburgh)","FACS","Fellowship (Cardiac Surgery, Germany)"], procedures_offered: ["CABG","Valve Surgery","MICS","Aortic Surgery","TAVI"], conditions_treated: ["Coronary Artery Disease","Valve Disease","Aortic Aneurysm","Atrial Fibrillation"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 4800, total_reviews: 360 },
  { hospital: "Sunway Medical Centre", name: "Prof. Dr. Goh Khean Jin", title: "Senior Consultant Neurologist", specialization: "Neurologi", subspecialization: "Neuromuscular & Movement Disorders", gender: "M", experience_years: 25, rating: 4.7, is_featured: true, notable_for: "Expert in Parkinson's disease and neuromuscular disorders. Professor at University of Malaya.", languages: ["English","Malay","Mandarin","Cantonese"], currency: "MYR", fee_min: 200, fee_max: 400, qualifications: ["MBBS (Malaya)","MRCP (UK)","PhD (Neurology)","FRSM"], procedures_offered: ["Botox for Dystonia","EMG/NCS","Deep Brain Stimulation Assessment","Nerve Biopsy"], conditions_treated: ["Parkinson's Disease","Motor Neuron Disease","Myasthenia Gravis","Peripheral Neuropathy"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 6100, total_reviews: 450 },
  { hospital: "Sunway Medical Centre", name: "Dr. Nur Hafizah Abdullah", title: "Consultant Obstetrician & Gynaecologist", specialization: "Obstetri & Ginekologi", subspecialization: "Maternal-Fetal Medicine", gender: "F", experience_years: 14, rating: 4.8, is_featured: false, notable_for: "High-risk pregnancy specialist with expertise in fetal medicine and minimally invasive gynaecological surgery.", languages: ["English","Malay"], currency: "MYR", fee_min: 150, fee_max: 320, qualifications: ["MBBS (UKM)","MObGyn (Malaya)","Fellowship (Maternal-Fetal Medicine, UK)"], procedures_offered: ["Fetal Anomaly Scan","Amniocentesis","Laparoscopic Surgery","Hysteroscopy","LSCS"], conditions_treated: ["High-Risk Pregnancy","Gestational Diabetes","PCOS","Endometriosis","Fibroids"], available_days: ["Mon","Tue","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3200, total_reviews: 290 },
  { hospital: "Sunway Medical Centre", name: "Dr. Loh Keh Chuan", title: "Senior Consultant Nephrologist", specialization: "Nefrologi", subspecialization: "Nephrology & Kidney Transplant", gender: "M", experience_years: 22, rating: 4.7, is_featured: true, notable_for: "Pioneer of kidney transplant program at Sunway. Over 250 successful transplants performed.", languages: ["English","Mandarin","Malay"], currency: "MYR", fee_min: 150, fee_max: 350, qualifications: ["MBBS (Malaya)","MRCP (UK)","Fellowship (Nephrology, Australia)"], procedures_offered: ["Kidney Transplant","Hemodialysis","Peritoneal Dialysis","Renal Biopsy","Plasmapheresis"], conditions_treated: ["Chronic Kidney Disease","Kidney Failure","IgA Nephropathy","Lupus Nephritis","Glomerulonephritis"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4800, total_reviews: 380 },

  // ── BEACON HOSPITAL ────────────────────────────────────────
  { hospital: "Beacon Hospital", name: "Dr. Looi Lai Meng", title: "Senior Consultant Clinical Oncologist", specialization: "Onkologi", subspecialization: "Radiation Oncology", gender: "F", experience_years: 24, rating: 4.9, is_featured: true, notable_for: "Malaysia's leading radiation oncologist. Pioneer of IMRT and stereotactic radiotherapy techniques.", languages: ["English","Malay","Mandarin"], currency: "MYR", fee_min: 300, fee_max: 600, qualifications: ["MBBS (Malaya)","FRCR (UK)","FRCP (Edinburgh)"], procedures_offered: ["IMRT","SBRT/SABR","Proton Therapy Assessment","Brachytherapy","Palliative Radiotherapy"], conditions_treated: ["Breast Cancer","Lung Cancer","Prostate Cancer","Head & Neck Cancer","Brain Tumour"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 5800, total_reviews: 510 },
  { hospital: "Beacon Hospital", name: "Prof. Dr. Goh Bak Siew", title: "Senior Consultant Medical Oncologist", specialization: "Onkologi", subspecialization: "Medical Oncology", gender: "M", experience_years: 26, rating: 4.8, is_featured: true, notable_for: "Head of oncology at Beacon. Expert in targeted therapy and immunotherapy for solid tumors.", languages: ["English","Malay","Mandarin","Cantonese"], currency: "MYR", fee_min: 280, fee_max: 550, qualifications: ["MBBS (Malaya)","MRCP (UK)","FAMS (Medical Oncology)","Fellowship (MD Anderson)"], procedures_offered: ["Chemotherapy","Targeted Therapy","Immunotherapy","Clinical Trials","Bone Marrow Biopsy"], conditions_treated: ["Colorectal Cancer","Breast Cancer","Gastric Cancer","Lymphoma","Lung Cancer"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 6500, total_reviews: 580 },

  // ── PANTAI HOSPITAL KL ─────────────────────────────────────
  { hospital: "Pantai Hospital Kuala Lumpur", name: "Dato' Dr. Roslan Johari Mohamad Ghazali", title: "Senior Consultant Cardiothoracic Surgeon", specialization: "Kardiologi", subspecialization: "Cardiothoracic Surgery", gender: "M", experience_years: 32, rating: 4.9, is_featured: true, notable_for: "Former Director of Institut Jantung Negara. Over 7,000 cardiac surgeries performed.", languages: ["English","Malay"], currency: "MYR", fee_min: 250, fee_max: 500, qualifications: ["MBBS (Malaya)","FRCS (Edinburgh)","Fellowship (Cardiac Surgery, Houston)"], procedures_offered: ["CABG","Valve Surgery","Heart Transplant Assessment","Aortic Surgery","ECMO"], conditions_treated: ["End-Stage Heart Disease","Valve Disease","Coronary Artery Disease","Aortic Aneurysm"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: false, accepting_new_patients: false, patients_treated: 9200, total_reviews: 680 },
  { hospital: "Pantai Hospital Kuala Lumpur", name: "Dr. Siti Aishah Mahmud", title: "Consultant Dermatologist", specialization: "Dermatologi", subspecialization: "Aesthetic & Medical Dermatology", gender: "F", experience_years: 16, rating: 4.7, is_featured: false, notable_for: "Expert in psoriasis, eczema and cosmetic dermatology. Pioneer of biologic therapy for psoriasis.", languages: ["English","Malay"], currency: "MYR", fee_min: 150, fee_max: 350, qualifications: ["MBBS (UPM)","MMed Dermatology (Malaya)","Fellowship (Cosmetic Dermatology, USA)"], procedures_offered: ["Laser Treatment","Botox & Fillers","Chemical Peel","Biologic Therapy","Patch Testing"], conditions_treated: ["Psoriasis","Eczema","Acne","Rosacea","Vitiligo"], available_days: ["Mon","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4100, total_reviews: 320 },

  // ── ISLAND HOSPITAL PENANG ─────────────────────────────────
  { hospital: "Island Hospital Penang", name: "Dr. Tan Yew Ghee", title: "Consultant Cardiothoracic Surgeon", specialization: "Kardiologi", subspecialization: "Cardiothoracic & Vascular Surgery", gender: "M", experience_years: 32, rating: 4.8, is_featured: true, notable_for: "Most experienced cardiothoracic surgeon in Penang. Performed the first TAVI in northern Malaysia.", languages: ["English","Mandarin","Malay","Hokkien"], currency: "MYR", fee_min: 180, fee_max: 420, qualifications: ["MBBS (Malaya)","FRCS (Edinburgh)","FACS","FICS"], procedures_offered: ["CABG","Valve Surgery","TAVI","Aortic Surgery","Vascular Surgery"], conditions_treated: ["Coronary Artery Disease","Valve Disease","Aortic Aneurysm","Peripheral Vascular Disease"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 5800, total_reviews: 440 },
  { hospital: "Island Hospital Penang", name: "Dr. Wong Chee Yong", title: "Consultant Orthopaedic Surgeon", specialization: "Ortopedi", subspecialization: "Joint Replacement & Sports Medicine", gender: "M", experience_years: 18, rating: 4.7, is_featured: false, notable_for: "Expert in minimally invasive hip and knee replacement. Sports medicine physician for national athletes.", languages: ["English","Mandarin","Malay","Hokkien"], currency: "MYR", fee_min: 160, fee_max: 350, qualifications: ["MBBS (Malaya)","MS Orthopaedics","Fellowship (Arthroplasty, UK)","FRCS"], procedures_offered: ["Total Knee Replacement","Total Hip Replacement","Arthroscopy","ACL Reconstruction","Cartilage Repair"], conditions_treated: ["Osteoarthritis","Rheumatoid Arthritis","Sports Injuries","Knee Pain","Hip Dysplasia"], available_days: ["Mon","Tue","Wed","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3900, total_reviews: 310 },

  // ── GLENEAGLES PENANG ──────────────────────────────────────
  { hospital: "Gleneagles Hospital Penang", name: "Dr. Ooi Yau Wei", title: "Senior Consultant Interventional Cardiologist", specialization: "Kardiologi", subspecialization: "Interventional Cardiology", gender: "M", experience_years: 22, rating: 4.8, is_featured: true, notable_for: "Leading interventional cardiologist in Penang. Expert in complex coronary and structural heart interventions.", languages: ["English","Mandarin","Malay"], currency: "MYR", fee_min: 200, fee_max: 420, qualifications: ["MBBS (NUS)","MRCP (UK)","FESC","FSCAI"], procedures_offered: ["Coronary Angioplasty","TAVI","Rotablation","IVUS","CTO PCI"], conditions_treated: ["Coronary Artery Disease","Heart Attack","Structural Heart Disease"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 5200, total_reviews: 410 },
  { hospital: "Gleneagles Hospital Penang", name: "Dr. Lim Ing Haan", title: "Consultant Gastroenterologist", specialization: "Gastroenterologi", subspecialization: "Advanced Endoscopy", gender: "F", experience_years: 14, rating: 4.6, is_featured: false, notable_for: "Expert in therapeutic endoscopy, ERCP and GI cancer screening.", languages: ["English","Mandarin","Malay","Hokkien"], currency: "MYR", fee_min: 150, fee_max: 320, qualifications: ["MBBS (Malaya)","MRCP (UK)","Fellowship (Endoscopy, Japan)"], procedures_offered: ["ERCP","Colonoscopy","Gastroscopy","Polypectomy","Capsule Endoscopy"], conditions_treated: ["Hepatitis B","Colon Cancer Screening","GERD","IBD","Liver Disease"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 2800, total_reviews: 220 },

  // ── PANTAI HOSPITAL JB ─────────────────────────────────────
  { hospital: "Pantai Hospital Johor Bahru", name: "Dr. Rajesh Kumar Muniandy", title: "Consultant Orthopaedic Surgeon", specialization: "Ortopedi", subspecialization: "Trauma & Joint Replacement", gender: "M", experience_years: 17, rating: 4.7, is_featured: false, notable_for: "Expert in complex trauma, joint replacement and sports injuries. Serves Singaporean patients.", languages: ["English","Malay","Tamil"], currency: "MYR", fee_min: 180, fee_max: 380, qualifications: ["MBBS (Malaya)","MS Orthopaedic (Malaya)","Fellowship (Arthroplasty, Germany)"], procedures_offered: ["Total Knee Replacement","Total Hip Replacement","Trauma Surgery","ACL Reconstruction","Limb Lengthening"], conditions_treated: ["Osteoarthritis","Fractures","Sports Injuries","Osteonecrosis","Bone Tumours"], available_days: ["Mon","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3500, total_reviews: 280 },
  { hospital: "Pantai Hospital Johor Bahru", name: "Dr. Ng Wei Sheng", title: "Consultant Obstetrician & Gynaecologist", specialization: "Obstetri & Ginekologi", subspecialization: "Reproductive Medicine & IVF", gender: "M", experience_years: 19, rating: 4.8, is_featured: true, notable_for: "IVF specialist serving both Johor Bahru and Singapore patients. High success rates in assisted reproduction.", languages: ["English","Mandarin","Malay","Cantonese"], currency: "MYR", fee_min: 180, fee_max: 380, qualifications: ["MBBS (NUS)","MRCOG (UK)","Fellowship (Reproductive Medicine, Belgium)"], procedures_offered: ["IVF/ICSI","IUI","Hysteroscopy","Laparoscopy","Ovarian Stimulation"], conditions_treated: ["Infertility","PCOS","Endometriosis","Recurrent Miscarriage","Male Infertility"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4200, total_reviews: 390 },

  // ── MAHKOTA MEDICAL CENTRE ─────────────────────────────────
  { hospital: "Mahkota Medical Centre", name: "Dr. Ahmad Faris Abdul Rahim", title: "Consultant Orthopaedic & Spine Surgeon", specialization: "Ortopedi", subspecialization: "Spine Surgery", gender: "M", experience_years: 16, rating: 4.7, is_featured: true, notable_for: "Leading orthopaedic surgeon in Melaka serving medical tourists from Indonesia and Brunei.", languages: ["English","Malay","Indonesian"], currency: "MYR", fee_min: 160, fee_max: 350, qualifications: ["MBBS (IIUM)","MS Orthopaedic (UPM)","Fellowship (Spine, Australia)"], procedures_offered: ["MISS","Spinal Fusion","Disc Replacement","Vertebroplasty","Hip Replacement"], conditions_treated: ["Low Back Pain","Herniated Disc","Spinal Stenosis","Scoliosis","Osteoporosis"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3100, total_reviews: 260 },
  { hospital: "Mahkota Medical Centre", name: "Dr. Pua Kia Boon", title: "Consultant Ophthalmologist", specialization: "Oftalmologi", subspecialization: "Cataract & Refractive Surgery", gender: "M", experience_years: 21, rating: 4.8, is_featured: false, notable_for: "Expert in LASIK, phacoemulsification and corneal surgeries. Serves large Indonesian patient base.", languages: ["English","Mandarin","Malay","Hokkien"], currency: "MYR", fee_min: 150, fee_max: 350, qualifications: ["MBBS (UM)","MMed Ophthalmology (UM)","FRCS (Edinburgh)","Fellowship (Cornea, USA)"], procedures_offered: ["LASIK","LASEK","Cataract Surgery","Corneal Transplant","Pterygium Surgery"], conditions_treated: ["Cataracts","Myopia","Hyperopia","Corneal Disease","Glaucoma"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 6800, total_reviews: 540 },

  // ── KPJ TAWAKKAL ───────────────────────────────────────────
  { hospital: "KPJ Tawakkal Specialist Hospital", name: "Dato' Dr. Hasni Mohd Said", title: "Senior Consultant Cardiac Surgeon", specialization: "Kardiologi", subspecialization: "Cardiac Surgery", gender: "M", experience_years: 28, rating: 4.8, is_featured: true, notable_for: "One of Malaysia's most experienced cardiac surgeons. Expert in off-pump bypass surgery.", languages: ["English","Malay"], currency: "MYR", fee_min: 200, fee_max: 450, qualifications: ["MBBS (Malaya)","FRCS (Edinburgh)","Fellowship (Cardiac Surgery, Toronto)"], procedures_offered: ["Off-Pump CABG","Valve Surgery","Aortic Surgery","ECMO","Ventricular Assist Device"], conditions_treated: ["Coronary Artery Disease","Valve Disease","End-Stage Heart Failure","Aortic Disease"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 5600, total_reviews: 420 },

  // ── KPJ SABAH ──────────────────────────────────────────────
  { hospital: "KPJ Sabah Specialist Hospital", name: "Dr. Mohd Shafie Abdullah", title: "Consultant Cardiologist", specialization: "Kardiologi", subspecialization: "General Cardiology", gender: "M", experience_years: 14, rating: 4.6, is_featured: false, notable_for: "Leading cardiologist in Sabah. Pioneered cardiac catheterisation lab in Kota Kinabalu.", languages: ["English","Malay","Kadazan"], currency: "MYR", fee_min: 150, fee_max: 320, qualifications: ["MBBS (Malaya)","MRCP (UK)","Fellowship (Cardiology, Singapore)"], procedures_offered: ["Coronary Angiography","Angioplasty","Echocardiography","Stress Test","Pacemaker Implantation"], conditions_treated: ["Coronary Artery Disease","Heart Failure","Arrhythmia","Hypertension"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 2800, total_reviews: 210 },
  { hospital: "KPJ Sabah Specialist Hospital", name: "Dr. Susan Lee Kah Yee", title: "Consultant Paediatrician", specialization: "Pediatri", subspecialization: "General Paediatrics & Neonatology", gender: "F", experience_years: 12, rating: 4.7, is_featured: false, notable_for: "Expert in neonatology and paediatric critical care. Established NICU at KPJ Sabah.", languages: ["English","Malay","Mandarin","Kadazan"], currency: "MYR", fee_min: 120, fee_max: 280, qualifications: ["MBBS (Malaya)","MRCPCH (UK)","Fellowship (Neonatology)"], procedures_offered: ["Neonatal Resuscitation","NICU Care","Paediatric Emergency","Developmental Assessment","Vaccination"], conditions_treated: ["Premature Babies","Neonatal Jaundice","Respiratory Distress","Asthma","Childhood Infections"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3200, total_reviews: 240 },

  // ── NORMAH KUCHING ─────────────────────────────────────────
  { hospital: "Normah Medical Specialist Centre", name: "Dr. Ling Kuang Yung", title: "Consultant Cardiac Surgeon", specialization: "Kardiologi", subspecialization: "Cardiac & Thoracic Surgery", gender: "M", experience_years: 24, rating: 4.8, is_featured: true, notable_for: "Pioneer of cardiac surgery in Sarawak. First surgeon to perform CABG in East Malaysia.", languages: ["English","Malay","Mandarin","Iban"], currency: "MYR", fee_min: 180, fee_max: 400, qualifications: ["MBBS (UM)","FRCS (Edinburgh)","Fellowship (Cardiac Surgery, UK)"], procedures_offered: ["CABG","Valve Surgery","Aortic Surgery","Thoracic Surgery","Pericardial Surgery"], conditions_treated: ["Coronary Artery Disease","Valve Disease","Lung Cancer","Thoracic Tumors"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 4100, total_reviews: 310 },

  // ── SJMC ───────────────────────────────────────────────────
  { hospital: "Subang Jaya Medical Centre (SJMC)", name: "Dr. Nirmala Bhoo Pathy", title: "Senior Consultant Medical Oncologist", specialization: "Onkologi", subspecialization: "Breast Oncology & Clinical Trials", gender: "F", experience_years: 20, rating: 4.8, is_featured: true, notable_for: "Malaysia's leading breast cancer oncologist. Principal investigator for multiple international clinical trials.", languages: ["English","Malay","Tamil"], currency: "MYR", fee_min: 220, fee_max: 480, qualifications: ["MBBS (Malaya)","MRCP (UK)","PhD (Cancer Epidemiology)","FAMS"], procedures_offered: ["Chemotherapy","Hormonal Therapy","Targeted Therapy","Immunotherapy","Clinical Trial Enrolment"], conditions_treated: ["Breast Cancer","Ovarian Cancer","Cervical Cancer","Colorectal Cancer"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 4500, total_reviews: 390 },
  { hospital: "Subang Jaya Medical Centre (SJMC)", name: "Dr. Premjit Singh Rajah", title: "Consultant ENT & Skull Base Surgeon", specialization: "THT", subspecialization: "Head & Neck Surgery & Otology", gender: "M", experience_years: 18, rating: 4.7, is_featured: false, notable_for: "Expert in complex skull base tumour surgery and cochlear implantation.", languages: ["English","Malay","Punjabi"], currency: "MYR", fee_min: 160, fee_max: 350, qualifications: ["MBBS (Malaya)","MS ENT (Malaya)","Fellowship (Skull Base Surgery, USA)","FRCS (ORL-HNS)"], procedures_offered: ["Cochlear Implantation","Skull Base Surgery","Endoscopic Sinus Surgery","Thyroidectomy","Neck Dissection"], conditions_treated: ["Hearing Loss","Nasopharyngeal Carcinoma","Sinusitis","Thyroid Cancer","Acoustic Neuroma"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3600, total_reviews: 280 },

  // ── THOMSON HOSPITAL ───────────────────────────────────────
  { hospital: "Thomson Hospital Kota Damansara", name: "Dr. Mohd Farid Kamarudin", title: "Consultant Obstetrician, Gynaecologist & Fertility Specialist", specialization: "Obstetri & Ginekologi", subspecialization: "Reproductive Medicine & Laparoscopic Surgery", gender: "M", experience_years: 15, rating: 4.8, is_featured: true, notable_for: "Malaysia's leading IVF specialist. Over 3,000 IVF cycles performed with industry-leading success rates.", languages: ["English","Malay"], currency: "MYR", fee_min: 180, fee_max: 400, qualifications: ["MBBS (IIUM)","MRCOG (UK)","Fellowship (IVF, Australia)"], procedures_offered: ["IVF/ICSI","Frozen Embryo Transfer","Egg Freezing","Hysteroscopy","Laparoscopic Myomectomy"], conditions_treated: ["Infertility","PCOS","Endometriosis","Premature Ovarian Insufficiency","Male Factor Infertility"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 3800, total_reviews: 350 },

  // ── FATIMAH HOSPITAL IPOH ──────────────────────────────────
  { hospital: "Fatimah Hospital", name: "Dr. Tan Boon Cheok", title: "Consultant Orthopaedic Surgeon", specialization: "Ortopedi", subspecialization: "Joint Replacement & Trauma", gender: "M", experience_years: 22, rating: 4.6, is_featured: false, notable_for: "Most experienced orthopaedic surgeon in Ipoh. Expert in joint replacement and complex trauma cases.", languages: ["English","Mandarin","Malay","Cantonese","Hokkien"], currency: "MYR", fee_min: 150, fee_max: 320, qualifications: ["MBBS (Malaya)","MS Orthopaedic (UPM)","Fellowship (Arthroplasty, Germany)"], procedures_offered: ["Total Knee Replacement","Total Hip Replacement","Trauma Surgery","Fracture Fixation","Arthroscopy"], conditions_treated: ["Osteoarthritis","Fractures","Osteonecrosis","Sports Injuries","Bone Tumours"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 4800, total_reviews: 360 },

  // ── KPJ AMPANG PUTERI ──────────────────────────────────────
  { hospital: "KPJ Ampang Puteri Specialist Hospital", name: "Dr. Faridah Abdul Halim", title: "Consultant Paediatric Surgeon", specialization: "Pediatri", subspecialization: "Paediatric Surgery", gender: "F", experience_years: 19, rating: 4.8, is_featured: true, notable_for: "One of few female paediatric surgeons in Malaysia. Expert in minimally invasive surgery in children.", languages: ["English","Malay"], currency: "MYR", fee_min: 180, fee_max: 380, qualifications: ["MBBS (IIUM)","MS Surgery (Malaya)","Fellowship (Paediatric Surgery, Australia)","FACS"], procedures_offered: ["Appendicectomy","Laparoscopic Surgery (Paeds)","Hernia Repair","Circumcision","Intestinal Surgery"], conditions_treated: ["Appendicitis","Inguinal Hernia","Hypospadias","Intestinal Obstruction","Undescended Testis"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 2900, total_reviews: 240 },

  // ── KPJ IPOH ───────────────────────────────────────────────
  { hospital: "KPJ Ipoh Specialist Hospital", name: "Dr. Krishnamoorthy Gopal", title: "Consultant Gastroenterologist", specialization: "Gastroenterologi", subspecialization: "Hepatology & IBD", gender: "M", experience_years: 15, rating: 4.6, is_featured: false, notable_for: "Leading gastroenterologist in Perak. Expert in hepatitis B management and inflammatory bowel disease.", languages: ["English","Malay","Tamil"], currency: "MYR", fee_min: 150, fee_max: 320, qualifications: ["MBBS (Manipal)","MRCP (UK)","Fellowship (Gastroenterology, UMMC)"], procedures_offered: ["Colonoscopy","Gastroscopy","ERCP","Liver Biopsy","Capsule Endoscopy"], conditions_treated: ["Hepatitis B","IBD","GERD","Colon Cancer Screening","Liver Cirrhosis"], available_days: ["Mon","Tue","Thu","Fri"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 2600, total_reviews: 190 },

  // ── HKL ────────────────────────────────────────────────────
  { hospital: "Hospital Kuala Lumpur (HKL)", name: "Prof. Dato' Dr. Azizi Yahya", title: "Senior Consultant Endocrinologist", specialization: "Endokrinologi", subspecialization: "Diabetes & Thyroid Disease", gender: "M", experience_years: 35, rating: 4.7, is_featured: true, notable_for: "Malaysia's National Diabetes Registry founder. Leading authority on diabetes management and endocrine disorders.", languages: ["English","Malay"], currency: "MYR", fee_min: 50, fee_max: 80, qualifications: ["MBBS (Edinburgh)","MRCP (UK)","PhD Endocrinology","FRCP (Edinburgh)"], procedures_offered: ["Insulin Pump Management","Continuous Glucose Monitoring","Thyroid Biopsy","Radioiodine Therapy"], conditions_treated: ["Type 1 & 2 Diabetes","Thyroid Disease","Adrenal Disorders","Pituitary Tumour","Osteoporosis"], available_days: ["Mon","Tue","Wed","Thu","Fri"], telemedicine_available: false, accepting_new_patients: true, patients_treated: 15000, total_reviews: 1100 },

  // ── KPJ SEREMBAN ───────────────────────────────────────────
  { hospital: "KPJ Seremban Specialist Hospital", name: "Dr. Azmi Mokhtar", title: "Consultant Urologist", specialization: "Urologi", subspecialization: "Uro-Oncology & Laparoscopic Urology", gender: "M", experience_years: 17, rating: 4.6, is_featured: false, notable_for: "Expert in robotic and laparoscopic urological procedures. Pioneer of robotic prostatectomy in Negeri Sembilan.", languages: ["English","Malay"], currency: "MYR", fee_min: 160, fee_max: 340, qualifications: ["MBBS (Malaya)","MS Urology (UPM)","Fellowship (Robotic Urology, USA)"], procedures_offered: ["Robotic Prostatectomy","TURP","URS for Kidney Stones","Nephrectomy","Cystoscopy"], conditions_treated: ["Prostate Cancer","BPH","Kidney Stones","Bladder Cancer","Urinary Incontinence"], available_days: ["Mon","Tue","Wed","Thu"], telemedicine_available: true, accepting_new_patients: true, patients_treated: 2700, total_reviews: 200 },
];

// ─── SCHEDULE GENERATOR ───────────────────────────────────────────
// day_of_week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function buildSchedules(doctorId, hospitalId, availableDays) {
  return availableDays.map((day) => ({
    doctor_id: doctorId,
    hospital_id: hospitalId,
    day_of_week: DAY_MAP[day],
    start_time: "08:30:00",
    end_time: "13:00:00",
    slot_duration_minutes: 20,
    max_patients: 16,
    is_active: true,
  })).concat(
    availableDays.slice(0, 3).map((day) => ({
      doctor_id: doctorId,
      hospital_id: hospitalId,
      day_of_week: DAY_MAP[day],
      start_time: "14:30:00",
      end_time: "17:30:00",
      slot_duration_minutes: 20,
      max_patients: 8,
      is_active: true,
    }))
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────
async function main() {
  const c = await pool.connect();
  let hospInserted = 0, hospSkipped = 0;
  let docInserted = 0, docSkipped = 0;
  let claimDocInserted = 0;
  let schedInserted = 0;

  try {
    await c.query("BEGIN");

    // 1. Insert hospitals
    const hospitalIdMap = {};
    const hospitalCityMap = {};
    for (const h of HOSPITALS) {
      const ex = await c.query("SELECT hospital_id FROM public.hospital WHERE lower(name) = lower($1)", [h.name]);
      if (ex.rowCount > 0) {
        hospitalIdMap[h.name] = ex.rows[0].hospital_id;
        hospitalCityMap[h.name] = h.city;
        hospSkipped++;
        continue;
      }
      const res = await c.query(`
        INSERT INTO public.hospital (
          name, country, city, address, phone, website, type, tier,
          description, bed_count, established_year, emergency_24h,
          international_patients, insurance_panel, is_partner,
          specializations, accreditations, languages_supported,
          avg_rating, total_reviews, status
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,'ACTIVE'
        ) RETURNING hospital_id
      `, [
        h.name, "Malaysia", h.city, h.address, h.phone, h.website,
        h.type, h.tier, h.description, h.bed_count, h.established_year,
        h.emergency_24h, h.international_patients, h.insurance_panel, h.is_partner,
        h.specializations, h.accreditations, h.languages_supported,
        h.avg_rating, h.total_reviews,
      ]);
      hospitalIdMap[h.name] = res.rows[0].hospital_id;
      hospitalCityMap[h.name] = h.city;
      hospInserted++;
    }

    // 2. Insert marketplace doctors + schedules
    for (const d of DOCTORS) {
      const hospId = hospitalIdMap[d.hospital];
      if (!hospId) { console.warn(`Hospital not found for: ${d.hospital}`); continue; }

      const ex = await c.query("SELECT id FROM public.doctors WHERE lower(name) = lower($1)", [d.name]);
      let docId;
      if (ex.rowCount > 0) {
        docId = ex.rows[0].id;
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
            total_reviews, gender, bio
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,'Malaysia',$8,$9,$10,$11,$12,$13,$14,$15,
            $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
          ) RETURNING id
        `, [
          d.name, d.title, d.specialization, d.subspecialization, d.hospital,
          hospCity, hospId, hospCity, d.experience_years, d.rating, d.is_featured,
          d.notable_for, d.languages, d.currency, d.fee_min, d.fee_max,
          d.qualifications, d.procedures_offered, d.conditions_treated,
          d.available_days, d.telemedicine_available, d.accepting_new_patients,
          d.patients_treated, d.total_reviews, d.gender, d.notable_for,
        ]);
        docId = res.rows[0].id;
        docInserted++;
      }

      // 3. doctor_hospital link
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

      // 5. Schedules
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

    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    console.error("Seed failed:", e.message);
    process.exitCode = 1;
  } finally {
    c.release();
    await pool.end();
  }

  console.log(`
✅  Malaysia hospital & doctor seed complete
    Hospitals  : ${hospInserted} inserted, ${hospSkipped} skipped
    Doctors    : ${docInserted} inserted (marketplace), ${docSkipped} skipped
    Claim docs : ${claimDocInserted} inserted (public.doctor)
    Schedules  : ${schedInserted} schedule slots inserted
  `.trim());
}

main();
