/**
 * Seed: Marketplace data — More doctors, multi-hospital links, schedules
 * Run: npx tsx db/seed_marketplace.ts
 */
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres.jzupwygwzatugbrmqjau:NkCvIb9EHcGApN93@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres",
});

// Day constants: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6;

// ─── Additional Doctors ────────────────────────────────────
const NEW_DOCTORS = [
  // More SG doctors
  { name: "Dr. Peter Ang", title: "Senior Consultant Medical Oncologist", specialization: "Onkologi", subspecialization: "Breast & Lung Oncology", country: "Singapore", experience_years: 20, rating: 4.7, is_featured: true, notable_for: "Leader in precision oncology and immunotherapy clinical trials for lung and breast cancer.", languages: ["English", "Mandarin"], currency: "SGD", fee_min: 250, fee_max: 550, qualifications: ["MBBS (NUS)", "MRCP (UK)", "FAMS (Medical Oncology)"], procedures: ["Chemotherapy", "Immunotherapy", "Targeted Therapy", "Genetic Profiling"], conditions: ["Lung Cancer", "Breast Cancer", "Stomach Cancer", "Lymphoma"], telemedicine: true, gender: "M", patients_treated: 8500, total_reviews: 420 },
  { name: "Dr. Lim Lay Hooi", title: "Senior Consultant Endocrinologist", specialization: "Penyakit Infeksi", subspecialization: "Endocrinology & Diabetes", country: "Singapore", experience_years: 18, rating: 4.5, is_featured: false, notable_for: "Specialist in diabetes management, thyroid disorders, and hormonal imbalances.", languages: ["English", "Mandarin", "Malay"], currency: "SGD", fee_min: 180, fee_max: 400, qualifications: ["MBBS (NUS)", "MRCP (UK)", "FACE"], procedures: ["Insulin Pump Management", "Thyroid Biopsy", "Bone Density Testing"], conditions: ["Diabetes Type 1/2", "Thyroid Disease", "Osteoporosis", "PCOS", "Adrenal Disorders"], telemedicine: true, gender: "F", patients_treated: 6200, total_reviews: 310 },
  { name: "Dr. James Tan", title: "Consultant Plastic Surgeon", specialization: "Dermatologi", subspecialization: "Reconstructive & Aesthetic Surgery", country: "Singapore", experience_years: 15, rating: 4.6, is_featured: false, notable_for: "Expert in microsurgery and breast reconstruction after cancer. Trained at Memorial Sloan Kettering.", languages: ["English", "Mandarin"], currency: "SGD", fee_min: 300, fee_max: 700, qualifications: ["MBBS (NUS)", "FRCS (Plast)", "Fellowship (MSK, USA)"], procedures: ["Breast Reconstruction", "Microsurgery", "Rhinoplasty", "Hand Surgery"], conditions: ["Post-Cancer Reconstruction", "Burns", "Congenital Defects", "Skin Cancer"], telemedicine: false, gender: "M", patients_treated: 3800, total_reviews: 195 },
  { name: "Dr. Wong Seng Weng", title: "Senior Consultant Medical Oncologist", specialization: "Onkologi", subspecialization: "Gastrointestinal Oncology", country: "Singapore", experience_years: 22, rating: 4.8, is_featured: true, notable_for: "Leading GI oncologist in Southeast Asia. Pioneered multiple clinical trials for colorectal and liver cancer.", languages: ["English", "Mandarin", "Cantonese"], currency: "SGD", fee_min: 280, fee_max: 600, qualifications: ["MBBS (NUS)", "MRCP (UK)", "FAMS", "PhD (Oncology)"], procedures: ["Chemotherapy", "Immunotherapy", "Clinical Trials", "Tumor Board"], conditions: ["Colorectal Cancer", "Liver Cancer", "Stomach Cancer", "Pancreatic Cancer"], telemedicine: true, gender: "M", patients_treated: 12000, total_reviews: 680 },
  { name: "Dr. Yvonne Lim", title: "Consultant Pediatric Surgeon", specialization: "Pediatri", subspecialization: "Neonatal & Pediatric Surgery", country: "Singapore", experience_years: 16, rating: 4.7, is_featured: true, notable_for: "Specialist in minimally invasive pediatric surgery and neonatal surgical emergencies.", languages: ["English", "Mandarin"], currency: "SGD", fee_min: 200, fee_max: 450, qualifications: ["MBBS (NUS)", "FRCS (Paed Surg)", "Fellowship (Great Ormond Street)"], procedures: ["Laparoscopic Surgery", "Neonatal Surgery", "Hernia Repair", "Appendectomy"], conditions: ["Congenital Anomalies", "Pediatric Tumors", "Pyloric Stenosis", "Intussusception"], telemedicine: false, gender: "F", patients_treated: 4200, total_reviews: 250 },

  // More MY doctors
  { name: "Dr. Loh Keh Chuan", title: "Consultant Nephrologist", specialization: "Urologi", subspecialization: "Nephrology & Transplant", country: "Malaysia", experience_years: 21, rating: 4.6, is_featured: true, notable_for: "Pioneer of kidney transplant program at Sunway. Over 200 transplants performed.", languages: ["English", "Mandarin", "Malay"], currency: "MYR", fee_min: 120, fee_max: 280, qualifications: ["MBBS (UM)", "MRCP (UK)", "Fellowship (Nephrology, Australia)"], procedures: ["Kidney Transplant", "Dialysis", "Renal Biopsy", "Peritoneal Dialysis"], conditions: ["Chronic Kidney Disease", "Kidney Stones", "Glomerulonephritis", "Lupus Nephritis"], telemedicine: true, gender: "M", patients_treated: 7500, total_reviews: 380 },
  { name: "Dr. Aisha Ibrahim", title: "Consultant Obstetrician & Gynecologist", specialization: "Pediatri", subspecialization: "Maternal-Fetal Medicine", country: "Malaysia", experience_years: 14, rating: 4.5, is_featured: false, notable_for: "High-risk pregnancy specialist. Expert in fetal medicine and prenatal diagnosis.", languages: ["English", "Malay", "Arabic"], currency: "MYR", fee_min: 100, fee_max: 250, qualifications: ["MBBS (IIUM)", "MRCOG (UK)", "Fellowship (Fetal Medicine, London)"], procedures: ["High-Risk Obstetrics", "Fetal Echocardiography", "Amniocentesis", "C-Section"], conditions: ["High-Risk Pregnancy", "Preeclampsia", "Gestational Diabetes", "Fetal Abnormalities"], telemedicine: true, gender: "F", patients_treated: 5800, total_reviews: 290 },
  { name: "Dr. Tan Sri Dr. Jeyaindran", title: "Senior Consultant Cardiologist", specialization: "Kardiologi", subspecialization: "Heart Failure & Transplant", country: "Malaysia", experience_years: 30, rating: 4.8, is_featured: true, notable_for: "Former Director General of Health Malaysia. Expert in heart failure management and cardiac transplant.", languages: ["English", "Malay", "Tamil"], currency: "MYR", fee_min: 200, fee_max: 400, qualifications: ["MBBS (Malaya)", "MRCP (London)", "FACC", "FESC"], procedures: ["Heart Failure Management", "Cardiac Catheterization", "Device Therapy", "Cardiac Rehabilitation"], conditions: ["Heart Failure", "Cardiomyopathy", "Arrhythmia", "Post-Transplant Care"], telemedicine: true, gender: "M", patients_treated: 15000, total_reviews: 720 },
  { name: "Dr. Sharmilla Kanagasundram", title: "Consultant Dermatologist", specialization: "Dermatologi", subspecialization: "Medical & Cosmetic Dermatology", country: "Malaysia", experience_years: 12, rating: 4.4, is_featured: false, notable_for: "Expert in autoimmune skin diseases and advanced laser treatments.", languages: ["English", "Malay", "Tamil"], currency: "MYR", fee_min: 80, fee_max: 200, qualifications: ["MBBS (UM)", "MRCP (Dermatology)", "Diploma Aesthetic Medicine"], procedures: ["Laser Treatment", "Skin Biopsy", "Chemical Peel", "Botox", "Fillers"], conditions: ["Psoriasis", "Eczema", "Acne", "Vitiligo", "Skin Cancer"], telemedicine: true, gender: "F", patients_treated: 9200, total_reviews: 450 },
  { name: "Dr. Azizi Abu Bakar", title: "Consultant ENT Surgeon", specialization: "Pediatri", subspecialization: "ENT & Head-Neck Surgery", country: "Malaysia", experience_years: 17, rating: 4.5, is_featured: false, notable_for: "Specialist in endoscopic sinus surgery and pediatric ENT. Cochlear implant surgeon.", languages: ["English", "Malay"], currency: "MYR", fee_min: 100, fee_max: 250, qualifications: ["MBBS (UKM)", "MS ORL-HNS", "Fellowship (Otology, Japan)"], procedures: ["FESS", "Tonsillectomy", "Cochlear Implant", "Thyroidectomy", "Laryngoscopy"], conditions: ["Sinusitis", "Hearing Loss", "Sleep Apnea", "Head & Neck Tumors", "Tonsillitis"], telemedicine: false, gender: "M", patients_treated: 6800, total_reviews: 340 },

  // More ID doctors
  { name: "Dr. Hanifa Maher Denny, SpOG(K)", title: "Konsultan Obstetri & Ginekologi", specialization: "Pediatri", subspecialization: "Obstetri & Ginekologi", country: "Indonesia", experience_years: 20, rating: 4.5, is_featured: false, notable_for: "Spesialis kebidanan dan kandungan dengan keahlian khusus kehamilan risiko tinggi dan bedah laparoskopi.", languages: ["Indonesian", "English"], currency: "IDR", fee_min: 350000, fee_max: 750000, qualifications: ["SpOG(K) (UI)", "Fellowship (Japan)"], procedures: ["Laparoskopi", "Operasi Caesar", "Histeroskopi", "USG 4D"], conditions: ["Kehamilan Risiko Tinggi", "Mioma Uteri", "Endometriosis", "Kanker Serviks"], telemedicine: true, gender: "F", patients_treated: 11000, total_reviews: 520 },
  { name: "Dr. Samuel J. Haryono, SpB-KOnk", title: "Konsultan Bedah Onkologi", specialization: "Onkologi", subspecialization: "Bedah Onkologi", country: "Indonesia", experience_years: 18, rating: 4.6, is_featured: true, notable_for: "Spesialis bedah kanker payudara dan saluran cerna. Pioneer nipple-sparing mastectomy di Indonesia.", languages: ["Indonesian", "English"], currency: "IDR", fee_min: 500000, fee_max: 1000000, qualifications: ["SpB-KOnk (UI)"], procedures: ["Mastektomi", "Bedah Payudara Konservatif", "Sentinel Node Biopsy", "Gastrektomi"], conditions: ["Kanker Payudara", "Kanker Lambung", "Kanker Usus Besar", "Sarkoma"], telemedicine: false, gender: "M", patients_treated: 5500, total_reviews: 280 },
  { name: "Dr. Andri, SpKJ", title: "Konsultan Psikiater", specialization: "Neurologi", subspecialization: "Psikiatri", country: "Indonesia", experience_years: 15, rating: 4.4, is_featured: false, notable_for: "Psikiater terkenal yang aktif di media edukasi kesehatan mental. Spesialis gangguan kecemasan dan depresi.", languages: ["Indonesian", "English"], currency: "IDR", fee_min: 400000, fee_max: 800000, qualifications: ["SpKJ (UI)"], procedures: ["Psikoterapi", "CBT", "Farmakologi Psikiatri", "Konseling"], conditions: ["Depresi", "Gangguan Kecemasan", "Bipolar", "PTSD", "OCD"], telemedicine: true, gender: "M", patients_treated: 8000, total_reviews: 620 },
];

// Hospital name → hospitals where each doctor practices (multi-hospital)
// Key = doctor name, Value = array of {hospital, is_primary, fee_min, fee_max, currency, schedules}
const MULTI_HOSPITAL_LINKS: Record<string, {
  hospital: string; is_primary: boolean; fee_min: number; fee_max: number; currency: string;
  room?: string; floor?: string;
  schedules: { day: number; start: string; end: string; max_patients?: number }[];
}[]> = {
  // SG doctors practicing at multiple hospitals
  "Dr. Lim Ing Haan": [
    { hospital: "Mount Elizabeth Hospital", is_primary: true, fee_min: 200, fee_max: 500, currency: "SGD", room: "Suite 17-01", floor: "17",
      schedules: [{ day: MON, start: "08:30", end: "12:30" }, { day: TUE, start: "08:30", end: "12:30" }, { day: WED, start: "14:00", end: "17:00" }, { day: THU, start: "08:30", end: "12:30" }, { day: FRI, start: "08:30", end: "12:30" }] },
    { hospital: "Mount Elizabeth Novena Hospital", is_primary: false, fee_min: 200, fee_max: 500, currency: "SGD", room: "Suite 06-08", floor: "6",
      schedules: [{ day: WED, start: "08:30", end: "12:30" }, { day: SAT, start: "09:00", end: "12:00" }] },
  ],
  "Dr. Ang Peng Tiam": [
    { hospital: "Mount Elizabeth Hospital", is_primary: true, fee_min: 250, fee_max: 600, currency: "SGD", room: "Suite 17-05", floor: "17",
      schedules: [{ day: MON, start: "09:00", end: "13:00" }, { day: TUE, start: "09:00", end: "13:00" }, { day: WED, start: "09:00", end: "13:00" }, { day: THU, start: "09:00", end: "13:00" }, { day: FRI, start: "09:00", end: "13:00" }] },
    { hospital: "Gleneagles Hospital Singapore", is_primary: false, fee_min: 250, fee_max: 600, currency: "SGD", room: "Suite 02-30", floor: "2",
      schedules: [{ day: SAT, start: "09:00", end: "12:00" }] },
  ],
  "Dr. Ooi Yau Wei": [
    { hospital: "Gleneagles Hospital Singapore", is_primary: true, fee_min: 200, fee_max: 450, currency: "SGD",
      schedules: [{ day: MON, start: "09:00", end: "13:00" }, { day: TUE, start: "09:00", end: "13:00" }, { day: THU, start: "09:00", end: "13:00" }, { day: FRI, start: "09:00", end: "13:00" }] },
    { hospital: "Mount Elizabeth Novena Hospital", is_primary: false, fee_min: 200, fee_max: 450, currency: "SGD",
      schedules: [{ day: WED, start: "09:00", end: "13:00" }, { day: SAT, start: "09:00", end: "11:30" }] },
  ],
  "Dr. Wong Seng Weng": [
    { hospital: "Mount Elizabeth Hospital", is_primary: true, fee_min: 280, fee_max: 600, currency: "SGD", room: "Suite 17-08", floor: "17",
      schedules: [{ day: MON, start: "08:30", end: "12:30" }, { day: TUE, start: "14:00", end: "17:00" }, { day: WED, start: "08:30", end: "12:30" }, { day: THU, start: "14:00", end: "17:00" }, { day: FRI, start: "08:30", end: "12:30" }] },
    { hospital: "Gleneagles Hospital Singapore", is_primary: false, fee_min: 280, fee_max: 600, currency: "SGD",
      schedules: [{ day: TUE, start: "08:30", end: "12:30" }, { day: THU, start: "08:30", end: "12:30" }] },
  ],
  "Dr. Peter Ang": [
    { hospital: "Mount Elizabeth Novena Hospital", is_primary: true, fee_min: 250, fee_max: 550, currency: "SGD",
      schedules: [{ day: MON, start: "08:00", end: "13:00" }, { day: TUE, start: "08:00", end: "13:00" }, { day: WED, start: "08:00", end: "13:00" }, { day: THU, start: "08:00", end: "13:00" }, { day: FRI, start: "08:00", end: "13:00" }] },
    { hospital: "Raffles Hospital", is_primary: false, fee_min: 250, fee_max: 550, currency: "SGD",
      schedules: [{ day: SAT, start: "09:00", end: "12:00" }] },
  ],
  "Dr. Yvonne Lim": [
    { hospital: "National University Hospital", is_primary: true, fee_min: 200, fee_max: 450, currency: "SGD",
      schedules: [{ day: MON, start: "08:00", end: "12:00" }, { day: TUE, start: "13:00", end: "17:00" }, { day: WED, start: "08:00", end: "12:00" }, { day: THU, start: "08:00", end: "12:00" }, { day: FRI, start: "13:00", end: "17:00" }] },
  ],
  // MY doctors multi-hospital
  "Dato' Dr. Yoong Boon Keng": [
    { hospital: "Sunway Medical Centre", is_primary: true, fee_min: 150, fee_max: 350, currency: "MYR",
      schedules: [{ day: MON, start: "08:00", end: "13:00" }, { day: TUE, start: "08:00", end: "13:00" }, { day: WED, start: "08:00", end: "13:00" }, { day: THU, start: "08:00", end: "13:00" }] },
    { hospital: "Subang Jaya Medical Centre", is_primary: false, fee_min: 150, fee_max: 350, currency: "MYR",
      schedules: [{ day: FRI, start: "09:00", end: "13:00" }, { day: SAT, start: "09:00", end: "12:00" }] },
  ],
  "Dr. Tan Sri Dr. Jeyaindran": [
    { hospital: "Prince Court Medical Centre", is_primary: true, fee_min: 200, fee_max: 400, currency: "MYR",
      schedules: [{ day: MON, start: "09:00", end: "13:00" }, { day: WED, start: "09:00", end: "13:00" }, { day: FRI, start: "09:00", end: "13:00" }] },
    { hospital: "Gleneagles Hospital Kuala Lumpur", is_primary: false, fee_min: 200, fee_max: 400, currency: "MYR",
      schedules: [{ day: TUE, start: "09:00", end: "13:00" }, { day: THU, start: "09:00", end: "13:00" }] },
  ],
  "Dr. Loh Keh Chuan": [
    { hospital: "Sunway Medical Centre", is_primary: true, fee_min: 120, fee_max: 280, currency: "MYR",
      schedules: [{ day: MON, start: "08:30", end: "12:30" }, { day: TUE, start: "14:00", end: "17:00" }, { day: WED, start: "08:30", end: "12:30" }, { day: THU, start: "14:00", end: "17:00" }, { day: FRI, start: "08:30", end: "12:30" }] },
  ],
  "Dr. Sharmilla Kanagasundram": [
    { hospital: "Pantai Hospital Kuala Lumpur", is_primary: true, fee_min: 80, fee_max: 200, currency: "MYR",
      schedules: [{ day: MON, start: "09:00", end: "13:00" }, { day: TUE, start: "09:00", end: "13:00" }, { day: WED, start: "14:00", end: "17:00" }, { day: THU, start: "09:00", end: "13:00" }, { day: FRI, start: "09:00", end: "13:00" }] },
    { hospital: "KPJ Tawakkal Specialist Hospital", is_primary: false, fee_min: 80, fee_max: 200, currency: "MYR",
      schedules: [{ day: WED, start: "09:00", end: "12:00" }, { day: SAT, start: "09:00", end: "12:00" }] },
  ],
  // Existing doctors without multi-hospital (just schedules for primary)
  "Dr. Teo Cheng Peng": [
    { hospital: "Mount Elizabeth Hospital", is_primary: true, fee_min: 300, fee_max: 700, currency: "SGD", room: "Suite 09-03", floor: "9",
      schedules: [{ day: MON, start: "09:00", end: "13:00" }, { day: WED, start: "09:00", end: "13:00" }, { day: FRI, start: "09:00", end: "13:00" }] },
  ],
  "Dr. Tan Yu Meng": [
    { hospital: "Gleneagles Hospital Singapore", is_primary: true, fee_min: 250, fee_max: 550, currency: "SGD",
      schedules: [{ day: MON, start: "08:30", end: "12:00" }, { day: TUE, start: "08:30", end: "12:00" }, { day: THU, start: "08:30", end: "12:00" }, { day: FRI, start: "08:30", end: "12:00" }] },
  ],
  "Dr. Hardev Singh": [
    { hospital: "Sunway Medical Centre", is_primary: true, fee_min: 150, fee_max: 300, currency: "MYR",
      schedules: [{ day: MON, start: "09:00", end: "13:00" }, { day: TUE, start: "09:00", end: "13:00" }, { day: WED, start: "14:00", end: "17:00" }, { day: FRI, start: "09:00", end: "13:00" }] },
  ],
  "Dr. Teh Mei Sze": [
    { hospital: "Sunway Medical Centre", is_primary: true, fee_min: 120, fee_max: 280, currency: "MYR",
      schedules: [{ day: MON, start: "08:00", end: "12:00" }, { day: TUE, start: "08:00", end: "12:00" }, { day: WED, start: "08:00", end: "12:00" }, { day: THU, start: "08:00", end: "12:00" }, { day: FRI, start: "08:00", end: "12:00" }] },
  ],
  "Dato' Dr. Mohamed Ezani Md Taib": [
    { hospital: "Prince Court Medical Centre", is_primary: true, fee_min: 200, fee_max: 400, currency: "MYR",
      schedules: [{ day: MON, start: "09:00", end: "13:00" }, { day: WED, start: "09:00", end: "13:00" }, { day: THU, start: "14:00", end: "17:00" }, { day: FRI, start: "09:00", end: "13:00" }] },
  ],
  "Dr. Teguh Karjadi, SpJP(K)": [
    { hospital: "RS Pondok Indah - Pondok Indah", is_primary: true, fee_min: 500000, fee_max: 1000000, currency: "IDR",
      schedules: [{ day: MON, start: "08:00", end: "12:00" }, { day: TUE, start: "13:00", end: "16:00" }, { day: WED, start: "08:00", end: "12:00" }, { day: THU, start: "08:00", end: "12:00" }, { day: FRI, start: "13:00", end: "16:00" }] },
    { hospital: "Siloam Hospitals Semanggi", is_primary: false, fee_min: 500000, fee_max: 1000000, currency: "IDR",
      schedules: [{ day: SAT, start: "09:00", end: "12:00" }] },
  ],
  "Dr. Samuel J. Haryono, SpB-KOnk": [
    { hospital: "RS Pondok Indah - Pondok Indah", is_primary: true, fee_min: 500000, fee_max: 1000000, currency: "IDR",
      schedules: [{ day: MON, start: "10:00", end: "14:00" }, { day: WED, start: "10:00", end: "14:00" }, { day: FRI, start: "10:00", end: "14:00" }] },
  ],
  "Dr. Andri, SpKJ": [
    { hospital: "Siloam Hospitals Semanggi", is_primary: true, fee_min: 400000, fee_max: 800000, currency: "IDR",
      schedules: [{ day: MON, start: "09:00", end: "14:00" }, { day: TUE, start: "09:00", end: "14:00" }, { day: WED, start: "09:00", end: "14:00" }, { day: THU, start: "09:00", end: "14:00" }, { day: FRI, start: "09:00", end: "14:00" }] },
  ],
};

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get hospital name→id map
    const hosRes = await client.query("SELECT hospital_id, name FROM public.hospital WHERE status = 'ACTIVE'");
    const hospitalMap = new Map<string, string>();
    hosRes.rows.forEach((r: { hospital_id: string; name: string }) => hospitalMap.set(r.name, r.hospital_id));

    // Insert new doctors
    let docCount = 0;
    for (const d of NEW_DOCTORS) {
      const existsRes = await client.query("SELECT id FROM public.doctors WHERE name = $1", [d.name]);
      if (existsRes.rows.length > 0) continue;

      await client.query(
        `INSERT INTO public.doctors (
          name, title, specialization, subspecialization, hospital,
          hospital_location, country, experience_years, rating,
          is_featured, notable_for, languages, currency,
          consultation_fee_min, consultation_fee_max, qualifications,
          procedures_offered, conditions_treated,
          telemedicine_available, gender, patients_treated, total_reviews
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
        [
          d.name, d.title, d.specialization, d.subspecialization,
          "Multiple Hospitals", // will be linked via doctor_hospital
          `${d.country}`, d.country, d.experience_years, d.rating,
          d.is_featured, d.notable_for, d.languages, d.currency,
          d.fee_min, d.fee_max, d.qualifications,
          d.procedures, d.conditions,
          d.telemedicine, d.gender, d.patients_treated, d.total_reviews,
        ]
      );
      docCount++;
    }
    console.log(`Inserted ${docCount} new doctors`);

    // Get all doctor name→id
    const allDocs = await client.query("SELECT id, name FROM public.doctors");
    const doctorMap = new Map<string, string>();
    allDocs.rows.forEach((r: { id: string; name: string }) => doctorMap.set(r.name, r.id));

    // Insert multi-hospital links + schedules
    let linkCount = 0, schedCount = 0;
    for (const [doctorName, hospitals] of Object.entries(MULTI_HOSPITAL_LINKS)) {
      const doctorId = doctorMap.get(doctorName);
      if (!doctorId) { console.warn(`Doctor not found: ${doctorName}`); continue; }

      // Update doctor's primary hospital info
      const primaryHospital = hospitals.find(h => h.is_primary);
      if (primaryHospital) {
        const hospitalId = hospitalMap.get(primaryHospital.hospital);
        if (hospitalId) {
          await client.query(
            `UPDATE public.doctors SET hospital = $1, hospital_id = $2, hospital_location = (SELECT city || ', ' || country FROM public.hospital WHERE hospital_id = $2) WHERE id = $3`,
            [primaryHospital.hospital, hospitalId, doctorId]
          );
        }
      }

      for (const h of hospitals) {
        const hospitalId = hospitalMap.get(h.hospital);
        if (!hospitalId) { console.warn(`Hospital not found: ${h.hospital}`); continue; }

        // Insert doctor_hospital link
        await client.query(
          `INSERT INTO public.doctor_hospital (doctor_id, hospital_id, is_primary, consultation_fee_min, consultation_fee_max, currency, room_number, floor)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (doctor_id, hospital_id) DO NOTHING`,
          [doctorId, hospitalId, h.is_primary, h.fee_min, h.fee_max, h.currency, h.room || null, h.floor || null]
        );
        linkCount++;

        // Insert schedules
        for (const s of h.schedules) {
          await client.query(
            `INSERT INTO public.doctor_schedule (doctor_id, hospital_id, day_of_week, start_time, end_time, max_patients)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [doctorId, hospitalId, s.day, s.start, s.end, s.max_patients || 20]
          );
          schedCount++;
        }
      }
    }
    console.log(`Inserted ${linkCount} doctor-hospital links`);
    console.log(`Inserted ${schedCount} schedule entries`);

    // Update patients_treated and total_reviews for existing doctors that don't have them
    await client.query(`
      UPDATE public.doctors SET
        patients_treated = CASE
          WHEN experience_years >= 25 THEN 10000 + floor(random() * 5000)
          WHEN experience_years >= 15 THEN 5000 + floor(random() * 5000)
          ELSE 2000 + floor(random() * 3000)
        END,
        total_reviews = CASE
          WHEN rating >= 4.7 THEN 400 + floor(random() * 300)
          WHEN rating >= 4.5 THEN 200 + floor(random() * 200)
          ELSE 100 + floor(random() * 200)
        END
      WHERE (patients_treated IS NULL OR patients_treated = 0)
    `);

    await client.query("COMMIT");
    console.log("\n✅ Marketplace seed completed!");

    // Print summary
    const [dc, hc, lc, sc] = await Promise.all([
      client.query("SELECT COUNT(*) FROM public.doctors"),
      client.query("SELECT COUNT(*) FROM public.hospital WHERE status = 'ACTIVE'"),
      client.query("SELECT COUNT(*) FROM public.doctor_hospital"),
      client.query("SELECT COUNT(*) FROM public.doctor_schedule"),
    ]);
    console.log(`Total: ${dc.rows[0].count} doctors, ${hc.rows[0].count} hospitals, ${lc.rows[0].count} practice links, ${sc.rows[0].count} schedule slots`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
