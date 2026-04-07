/**
 * Seed script: Hospital Network Intelligence Data
 * Real hospitals from Malaysia, Singapore, and Indonesia
 * Run: npx tsx db/seed_hospital_network.ts
 */
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres.jzupwygwzatugbrmqjau:NkCvIb9EHcGApN93@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres",
});

// ─── Hospital Data ──────────────────────────────────────────
const HOSPITALS = [
  // ── SINGAPORE ──
  {
    name: "Mount Elizabeth Hospital",
    country: "Singapore",
    city: "Singapore",
    address: "3 Mount Elizabeth, Singapore 228510",
    phone: "+65 6737 2666",
    website: "https://www.mountelizabeth.com.sg",
    type: "Private Tertiary",
    tier: "PREMIUM",
    bed_count: 345,
    established_year: 1979,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.7,
    total_reviews: 2840,
    description: "Premier private hospital in Singapore, renowned for complex surgeries, multi-organ transplants, and comprehensive cancer treatment. A flagship of Parkway Pantai (IHH Healthcare).",
    specializations: ["Cardiology", "Oncology", "Neurosurgery", "Orthopedics", "Gastroenterology", "Urology", "Obstetrics & Gynecology"],
    accreditations: ["JCI Accredited", "Singapore Quality Class Star"],
    languages_supported: ["English", "Mandarin", "Malay", "Tamil", "Indonesian", "Japanese"],
    technologies: ["Da Vinci Robotic Surgery", "CyberKnife", "PET-CT", "3T MRI", "Hybrid Operating Theatre", "ECMO"],
    operating_hours: "24/7",
    latitude: 1.3064,
    longitude: 103.8355,
  },
  {
    name: "Gleneagles Hospital Singapore",
    country: "Singapore",
    city: "Singapore",
    address: "6A Napier Road, Singapore 258500",
    phone: "+65 6473 7222",
    website: "https://www.gleneagles.com.sg",
    type: "Private Tertiary",
    tier: "PREMIUM",
    bed_count: 272,
    established_year: 1957,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.6,
    total_reviews: 2150,
    description: "One of Singapore's oldest and most established private hospitals, known for its centers of excellence in cardiology, oncology, and liver transplantation.",
    specializations: ["Cardiology", "Oncology", "Hepatology", "Orthopedics", "Neurology", "Fertility & IVF"],
    accreditations: ["JCI Accredited", "Singapore Quality Class"],
    languages_supported: ["English", "Mandarin", "Malay", "Indonesian", "Japanese", "Korean"],
    technologies: ["Da Vinci Xi Robotic Surgery", "TAVI", "3T MRI", "PET-CT", "Linear Accelerator"],
    operating_hours: "24/7",
    latitude: 1.3070,
    longitude: 103.8257,
  },
  {
    name: "Singapore General Hospital",
    country: "Singapore",
    city: "Singapore",
    address: "Outram Road, Singapore 169608",
    phone: "+65 6222 3322",
    website: "https://www.sgh.com.sg",
    type: "Public Tertiary",
    tier: "PREMIUM",
    bed_count: 1785,
    established_year: 1821,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.5,
    total_reviews: 5420,
    description: "Singapore's largest and oldest hospital, and the national referral center for complex medical cases. Part of SingHealth, the largest public healthcare cluster.",
    specializations: ["Burns & Plastics", "Hematology", "Renal Medicine", "Transplant Surgery", "Oncology", "Cardiology", "Neurosurgery"],
    accreditations: ["JCI Accredited", "Newsweek World's Best Hospital"],
    languages_supported: ["English", "Mandarin", "Malay", "Tamil"],
    technologies: ["Proton Beam Therapy", "CAR-T Cell Therapy", "Da Vinci Surgery", "ECMO", "3T MRI", "Hybrid OR"],
    operating_hours: "24/7",
    latitude: 1.2793,
    longitude: 103.8366,
  },
  {
    name: "National University Hospital",
    country: "Singapore",
    city: "Singapore",
    address: "5 Lower Kent Ridge Road, Singapore 119074",
    phone: "+65 6779 5555",
    website: "https://www.nuh.com.sg",
    type: "Public Tertiary",
    tier: "PREMIUM",
    bed_count: 1250,
    established_year: 1985,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.5,
    total_reviews: 3800,
    description: "Academic medical center affiliated with NUS Yong Loo Lin School of Medicine. Leader in research-driven clinical care and complex procedures.",
    specializations: ["Cardiac Surgery", "Neurology", "Pediatrics", "Oncology", "Ophthalmology", "Orthopedics"],
    accreditations: ["JCI Accredited", "Newsweek World's Best Hospital"],
    languages_supported: ["English", "Mandarin", "Malay", "Tamil"],
    technologies: ["Gamma Knife", "PET-MRI", "HIFU", "Robotic Surgery", "3D Printing Lab"],
    operating_hours: "24/7",
    latitude: 1.2937,
    longitude: 103.7833,
  },
  {
    name: "Raffles Hospital",
    country: "Singapore",
    city: "Singapore",
    address: "585 North Bridge Road, Singapore 188770",
    phone: "+65 6311 1111",
    website: "https://www.raffleshospital.com",
    type: "Private Tertiary",
    tier: "PREMIUM",
    bed_count: 380,
    established_year: 2001,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.4,
    total_reviews: 1920,
    description: "Modern private hospital in the heart of Singapore, known for its International Patients Centre and comprehensive medical services.",
    specializations: ["Orthopedics", "Cardiology", "Oncology", "Fertility", "Dermatology", "ENT"],
    accreditations: ["JCI Accredited"],
    languages_supported: ["English", "Mandarin", "Malay", "Indonesian", "Vietnamese", "Myanmar"],
    technologies: ["MRI", "CT Scanner", "Lithotripsy", "Endoscopy Suite", "Digital Mammography"],
    operating_hours: "24/7",
    latitude: 1.2998,
    longitude: 103.8558,
  },
  {
    name: "Mount Elizabeth Novena Hospital",
    country: "Singapore",
    city: "Singapore",
    address: "38 Irrawaddy Road, Singapore 329563",
    phone: "+65 6933 0000",
    website: "https://www.mountelizabeth.com.sg/novena",
    type: "Private Tertiary",
    tier: "PREMIUM",
    bed_count: 333,
    established_year: 2012,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.6,
    total_reviews: 1650,
    description: "State-of-the-art hospital designed with the latest medical technology. Sister hospital of Mount Elizabeth, featuring advanced surgical suites.",
    specializations: ["Robotic Surgery", "Cardiology", "Neurosurgery", "Oncology", "Spine Surgery", "Sports Medicine"],
    accreditations: ["JCI Accredited"],
    languages_supported: ["English", "Mandarin", "Malay", "Indonesian", "Japanese"],
    technologies: ["Da Vinci Xi", "O-arm Navigation", "Hybrid OR", "PET-CT", "3T MRI", "TAVR"],
    operating_hours: "24/7",
    latitude: 1.3204,
    longitude: 103.8436,
  },

  // ── MALAYSIA ──
  {
    name: "Sunway Medical Centre",
    country: "Malaysia",
    city: "Petaling Jaya",
    address: "5, Jalan Lagoon Selatan, Bandar Sunway, 47500 Petaling Jaya, Selangor",
    phone: "+60 3-7491 9191",
    website: "https://www.sunwaymedical.com",
    type: "Private Tertiary",
    tier: "PREMIUM",
    bed_count: 686,
    established_year: 1999,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.5,
    total_reviews: 3200,
    description: "Malaysia's leading private hospital with ACHS International accreditation. Known for multi-organ transplants and advanced cancer treatment with Proton Therapy.",
    specializations: ["Oncology", "Cardiology", "Neurosurgery", "Orthopedics", "Transplant", "Fertility & IVF"],
    accreditations: ["ACHS International", "MSQH Accredited", "Baby Friendly Hospital"],
    languages_supported: ["English", "Malay", "Mandarin", "Tamil", "Indonesian"],
    technologies: ["Proton Beam Therapy", "Da Vinci Xi", "PET-CT", "CyberKnife", "ECMO", "Hybrid OR"],
    operating_hours: "24/7",
    latitude: 3.0672,
    longitude: 101.6060,
  },
  {
    name: "Prince Court Medical Centre",
    country: "Malaysia",
    city: "Kuala Lumpur",
    address: "39, Jalan Kia Peng, 50450 Kuala Lumpur",
    phone: "+60 3-2160 0000",
    website: "https://www.princecourt.com",
    type: "Private Tertiary",
    tier: "PREMIUM",
    bed_count: 300,
    established_year: 2007,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.7,
    total_reviews: 2100,
    description: "Luxury private hospital in the heart of KL, owned by Petronas. Multiple-time winner of Medical Travel Quality Alliance 'World's Best Hospital for Medical Tourists'.",
    specializations: ["Cardiology", "Oncology", "Orthopedics", "Bariatric Surgery", "Dermatology", "Urology"],
    accreditations: ["JCI Accredited", "MSQH", "MTQA Winner"],
    languages_supported: ["English", "Malay", "Mandarin", "Arabic", "Indonesian", "Japanese"],
    technologies: ["Robotic Surgery", "PET-CT", "3T MRI", "TAVI", "Lithotripsy", "Digital OR"],
    operating_hours: "24/7",
    latitude: 3.1530,
    longitude: 101.7185,
  },
  {
    name: "Gleneagles Hospital Kuala Lumpur",
    country: "Malaysia",
    city: "Kuala Lumpur",
    address: "286 & 288, Jalan Ampang, 50450 Kuala Lumpur",
    phone: "+60 3-4141 3000",
    website: "https://www.gleneagles.com.my",
    type: "Private Tertiary",
    tier: "PREMIUM",
    bed_count: 380,
    established_year: 1996,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.5,
    total_reviews: 2600,
    description: "Part of IHH Healthcare, Malaysia's premier private hospital on the Embassy Row. Renowned for cardiac sciences, neurosciences, and liver transplant.",
    specializations: ["Cardiology", "Neurosurgery", "Hepatology", "Oncology", "Orthopedics", "Gastroenterology"],
    accreditations: ["JCI Accredited", "MSQH"],
    languages_supported: ["English", "Malay", "Mandarin", "Tamil", "Indonesian", "Japanese"],
    technologies: ["Da Vinci Robotic Surgery", "PET-CT", "3T MRI", "ESWL", "Hybrid Cath Lab"],
    operating_hours: "24/7",
    latitude: 3.1585,
    longitude: 101.7372,
  },
  {
    name: "Pantai Hospital Kuala Lumpur",
    country: "Malaysia",
    city: "Kuala Lumpur",
    address: "8, Jalan Bukit Pantai, 59100 Kuala Lumpur",
    phone: "+60 3-2296 0888",
    website: "https://www.pantai.com.my",
    type: "Private Tertiary",
    tier: "STANDARD",
    bed_count: 311,
    established_year: 1974,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.3,
    total_reviews: 1850,
    description: "Part of Pantai Holdings (IHH Healthcare). Well-established hospital serving both local and international patients, with strong expertise in women's and children's health.",
    specializations: ["Obstetrics & Gynecology", "Pediatrics", "Orthopedics", "Cardiology", "Gastroenterology"],
    accreditations: ["MSQH Accredited"],
    languages_supported: ["English", "Malay", "Mandarin", "Indonesian"],
    technologies: ["MRI", "CT", "Endoscopy", "Lithotripsy", "Mammography"],
    operating_hours: "24/7",
    latitude: 3.1143,
    longitude: 101.6719,
  },
  {
    name: "KPJ Tawakkal Specialist Hospital",
    country: "Malaysia",
    city: "Kuala Lumpur",
    address: "1, Jalan Pahang, 53000 Kuala Lumpur",
    phone: "+60 3-4026 7777",
    website: "https://www.kpjtawakkal.com",
    type: "Private Specialist",
    tier: "STANDARD",
    bed_count: 290,
    established_year: 1984,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.2,
    total_reviews: 1200,
    description: "KPJ Healthcare group hospital, well-known for affordability and comprehensive specialist care. Strong in nephrology, cardiology, and orthopedics.",
    specializations: ["Nephrology", "Cardiology", "Orthopedics", "Urology", "ENT", "Ophthalmology"],
    accreditations: ["MSQH Accredited"],
    languages_supported: ["English", "Malay", "Mandarin", "Indonesian", "Arabic"],
    technologies: ["CT Scanner", "MRI", "Dialysis Center", "Endoscopy", "Lithotripsy"],
    operating_hours: "24/7",
    latitude: 3.1742,
    longitude: 101.7047,
  },
  {
    name: "Island Hospital Penang",
    country: "Malaysia",
    city: "Penang",
    address: "308, Macalister Road, 10400 George Town, Penang",
    phone: "+60 4-228 8222",
    website: "https://www.islandhospital.com",
    type: "Private Tertiary",
    tier: "PREMIUM",
    bed_count: 600,
    established_year: 1996,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.5,
    total_reviews: 2900,
    description: "Penang's largest private hospital and a medical tourism destination. Renowned center for cardiothoracic surgery, oncology, and orthopedics in northern Malaysia.",
    specializations: ["Cardiothoracic Surgery", "Oncology", "Orthopedics", "Neurosurgery", "Urology", "Fertility"],
    accreditations: ["JCI Accredited", "MSQH"],
    languages_supported: ["English", "Malay", "Mandarin", "Tamil", "Indonesian"],
    technologies: ["Linear Accelerator", "PET-CT", "3T MRI", "Da Vinci Surgery", "ESWL", "Cardiac Cath Lab"],
    operating_hours: "24/7",
    latitude: 5.4087,
    longitude: 100.3121,
  },
  {
    name: "Subang Jaya Medical Centre",
    country: "Malaysia",
    city: "Subang Jaya",
    address: "1, Jalan SS12/1A, 47500 Subang Jaya, Selangor",
    phone: "+60 3-5639 1212",
    website: "https://www.rframsayhealthcare.com/sjmc",
    type: "Private Tertiary",
    tier: "STANDARD",
    bed_count: 407,
    established_year: 1985,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.3,
    total_reviews: 1750,
    description: "Part of Ramsay Sime Darby Healthcare, SJMC is known for its comprehensive cancer center and neuroscience program.",
    specializations: ["Oncology", "Neuroscience", "Cardiology", "Orthopedics", "Gastroenterology", "Pediatrics"],
    accreditations: ["MSQH Accredited"],
    languages_supported: ["English", "Malay", "Mandarin", "Indonesian"],
    technologies: ["Linear Accelerator", "PET-CT", "MRI", "CT", "Endoscopy Suite"],
    operating_hours: "24/7",
    latitude: 3.0518,
    longitude: 101.5879,
  },

  // ── INDONESIA (beberapa top) ──
  {
    name: "RS Pondok Indah - Pondok Indah",
    country: "Indonesia",
    city: "Jakarta",
    address: "Jl. Metro Duta Kav. UE, Pondok Indah, Jakarta 12310",
    phone: "+62 21 7657 525",
    website: "https://www.rspondokindah.co.id",
    type: "Private Tertiary",
    tier: "PREMIUM",
    bed_count: 335,
    established_year: 1986,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.4,
    total_reviews: 3500,
    description: "Rumah sakit swasta terkemuka di Jakarta Selatan dengan layanan unggulan di bidang jantung, bedah saraf, dan onkologi.",
    specializations: ["Kardiologi", "Bedah Saraf", "Onkologi", "Ortopedi", "Gastroenterologi"],
    accreditations: ["JCI Accredited", "KARS Paripurna"],
    languages_supported: ["Indonesian", "English", "Mandarin"],
    technologies: ["MRI 3T", "PET-CT", "Robotic Surgery", "Cath Lab", "ECMO"],
    operating_hours: "24/7",
    latitude: -6.2665,
    longitude: 106.7843,
  },
  {
    name: "Siloam Hospitals Semanggi",
    country: "Indonesia",
    city: "Jakarta",
    address: "Jl. Garnisun Dalam No.2-3, Jakarta 12930",
    phone: "+62 21 2953 1900",
    website: "https://www.siloamhospitals.com",
    type: "Private Tertiary",
    tier: "STANDARD",
    bed_count: 297,
    established_year: 2014,
    emergency_24h: true,
    international_patients: true,
    insurance_panel: true,
    is_partner: true,
    status: "ACTIVE",
    avg_rating: 4.3,
    total_reviews: 2100,
    description: "Part of the largest hospital chain in Indonesia (Lippo Group). Modern facilities with international standard of care.",
    specializations: ["Cardiology", "Neurology", "Orthopedics", "Oncology", "Pediatrics", "Dermatology"],
    accreditations: ["JCI Accredited", "KARS"],
    languages_supported: ["Indonesian", "English"],
    technologies: ["MRI", "CT", "Cardiac Cath Lab", "Endoscopy", "Lithotripsy"],
    operating_hours: "24/7",
    latitude: -6.2264,
    longitude: 106.8235,
  },
];

// ─── Doctor Data ────────────────────────────────────────────
const DOCTORS = [
  // ── Mount Elizabeth Singapore ──
  { hospital: "Mount Elizabeth Hospital", name: "Dr. Lim Ing Haan", title: "Senior Consultant Cardiac Surgeon", specialization: "Kardiologi", subspecialization: "Cardiac Surgery", country: "Singapore", experience_years: 28, rating: 4.9, is_featured: true, notable_for: "Pioneered minimally invasive cardiac surgery in Singapore. Over 5,000 open-heart surgeries performed.", languages: ["English", "Mandarin"], currency: "SGD", consultation_fee_min: 200, consultation_fee_max: 500, qualifications: ["MBBS (Singapore)", "FRCS (Edinburgh)", "FAMS (Cardiothoracic Surgery)"], procedures_offered: ["CABG", "Valve Replacement", "TAVR", "Aortic Surgery", "Minimally Invasive Cardiac Surgery"], conditions_treated: ["Coronary Artery Disease", "Heart Valve Disease", "Aortic Aneurysm", "Heart Failure"], available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], telemedicine_available: true },
  { hospital: "Mount Elizabeth Hospital", name: "Dr. Ang Peng Tiam", title: "Senior Consultant Medical Oncologist", specialization: "Onkologi", subspecialization: "Medical Oncology", country: "Singapore", experience_years: 35, rating: 4.8, is_featured: true, notable_for: "One of Singapore's most renowned oncologists. Specializes in lung, breast, and colorectal cancers.", languages: ["English", "Mandarin"], currency: "SGD", consultation_fee_min: 250, consultation_fee_max: 600, qualifications: ["MBBS (Singapore)", "MRCP (UK)", "FAMS (Medical Oncology)"], procedures_offered: ["Chemotherapy", "Immunotherapy", "Targeted Therapy", "Clinical Trials"], conditions_treated: ["Lung Cancer", "Breast Cancer", "Colorectal Cancer", "Lymphoma", "Liver Cancer"], available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], telemedicine_available: true },
  { hospital: "Mount Elizabeth Hospital", name: "Dr. Teo Cheng Peng", title: "Senior Consultant Neurosurgeon", specialization: "Neurologi", subspecialization: "Neurosurgery", country: "Singapore", experience_years: 25, rating: 4.7, is_featured: true, notable_for: "Expert in brain tumor surgery and spine surgery. Pioneer of awake craniotomy techniques in Southeast Asia.", languages: ["English", "Mandarin"], currency: "SGD", consultation_fee_min: 300, consultation_fee_max: 700, qualifications: ["MBBS (Singapore)", "FRCS (Edinburgh)", "FAMS (Neurosurgery)"], procedures_offered: ["Brain Tumor Surgery", "Spine Surgery", "Awake Craniotomy", "Deep Brain Stimulation"], conditions_treated: ["Brain Tumors", "Spinal Disorders", "Cerebral Aneurysm", "Epilepsy"], available_days: ["Mon", "Wed", "Fri"], telemedicine_available: false },

  // ── Gleneagles Singapore ──
  { hospital: "Gleneagles Hospital Singapore", name: "Dr. Ooi Yau Wei", title: "Senior Consultant Cardiologist", specialization: "Kardiologi", subspecialization: "Interventional Cardiology", country: "Singapore", experience_years: 22, rating: 4.7, is_featured: true, notable_for: "Leading interventional cardiologist specializing in complex coronary interventions and structural heart disease.", languages: ["English", "Mandarin", "Malay"], currency: "SGD", consultation_fee_min: 200, consultation_fee_max: 450, qualifications: ["MBBS (NUS)", "MRCP (UK)", "FESC", "FSCAI"], procedures_offered: ["Coronary Angioplasty", "TAVR", "Rotablation", "IVUS"], conditions_treated: ["Coronary Artery Disease", "Heart Attack", "Structural Heart Disease"], available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], telemedicine_available: true },
  { hospital: "Gleneagles Hospital Singapore", name: "Dr. Tan Yu Meng", title: "Senior Consultant Hepatobiliary Surgeon", specialization: "Gastroenterologi", subspecialization: "Hepatobiliary Surgery", country: "Singapore", experience_years: 20, rating: 4.8, is_featured: true, notable_for: "Performed over 500 liver transplants. Pioneer of living-donor liver transplantation in Singapore.", languages: ["English", "Mandarin"], currency: "SGD", consultation_fee_min: 250, consultation_fee_max: 550, qualifications: ["MBBS (NUS)", "FRCS (Edinburgh)", "FAMS"], procedures_offered: ["Liver Transplant", "Hepatectomy", "Whipple Procedure", "Biliary Surgery"], conditions_treated: ["Liver Cancer", "Liver Cirrhosis", "Bile Duct Cancer", "Gallbladder Disease"], available_days: ["Mon", "Tue", "Thu", "Fri"], telemedicine_available: true },

  // ── SGH ──
  { hospital: "Singapore General Hospital", name: "Dr. Ivor Vaz", title: "Senior Consultant Orthopedic Surgeon", specialization: "Ortopedi", subspecialization: "Joint Replacement", country: "Singapore", experience_years: 24, rating: 4.6, is_featured: false, notable_for: "Expert in complex joint replacement and revision surgery. High volume surgeon with excellent outcomes.", languages: ["English", "Mandarin"], currency: "SGD", consultation_fee_min: 150, consultation_fee_max: 350, qualifications: ["MBBS (NUS)", "FRCS (Orth)", "FAMS"], procedures_offered: ["Total Knee Replacement", "Total Hip Replacement", "Revision Joint Surgery", "Robotic Joint Surgery"], conditions_treated: ["Osteoarthritis", "Rheumatoid Arthritis", "Joint Deformity", "Avascular Necrosis"], available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], telemedicine_available: false },

  // ── Sunway Medical Centre Malaysia ──
  { hospital: "Sunway Medical Centre", name: "Dato' Dr. Yoong Boon Keng", title: "Consultant Cardiothoracic Surgeon", specialization: "Kardiologi", subspecialization: "Cardiothoracic Surgery", country: "Malaysia", experience_years: 30, rating: 4.7, is_featured: true, notable_for: "Pioneer of MICS (Minimally Invasive Cardiac Surgery) in Malaysia. Over 3,000 cardiac procedures performed.", languages: ["English", "Malay", "Mandarin"], currency: "MYR", consultation_fee_min: 150, consultation_fee_max: 350, qualifications: ["MBBS (Malaya)", "FRCS (Edinburgh)", "FACS"], procedures_offered: ["CABG", "Valve Surgery", "MICS", "Aortic Surgery"], conditions_treated: ["Coronary Artery Disease", "Valve Disease", "Aortic Disease", "Congenital Heart Disease"], available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], telemedicine_available: true },
  { hospital: "Sunway Medical Centre", name: "Dr. Hardev Singh", title: "Consultant Neurosurgeon", specialization: "Neurologi", subspecialization: "Spine & Brain Surgery", country: "Malaysia", experience_years: 18, rating: 4.6, is_featured: true, notable_for: "Specializes in complex spine surgery and minimally invasive brain surgery. Trained at Johns Hopkins.", languages: ["English", "Malay", "Hindi"], currency: "MYR", consultation_fee_min: 150, consultation_fee_max: 300, qualifications: ["MD (UKM)", "FRCS (Edinburgh)", "Fellowship (Johns Hopkins)"], procedures_offered: ["Spine Fusion", "Disc Replacement", "Brain Tumor Surgery", "Endoscopic Neurosurgery"], conditions_treated: ["Herniated Disc", "Spinal Stenosis", "Brain Tumors", "Hydrocephalus"], available_days: ["Mon", "Tue", "Wed", "Fri"], telemedicine_available: true },
  { hospital: "Sunway Medical Centre", name: "Dr. Teh Mei Sze", title: "Consultant Clinical Oncologist", specialization: "Onkologi", subspecialization: "Radiation Oncology", country: "Malaysia", experience_years: 15, rating: 4.5, is_featured: true, notable_for: "Proton therapy specialist. Treats complex cancers using advanced radiation technology at Sunway's proton centre.", languages: ["English", "Mandarin", "Malay"], currency: "MYR", consultation_fee_min: 120, consultation_fee_max: 280, qualifications: ["MBBS (Malaya)", "FRCR (London)", "Fellowship (MD Anderson)"], procedures_offered: ["Proton Therapy", "IMRT", "SRS/SBRT", "Brachytherapy"], conditions_treated: ["Brain Cancer", "Prostate Cancer", "Head & Neck Cancer", "Pediatric Cancers"], available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], telemedicine_available: true },

  // ── Prince Court Medical Centre ──
  { hospital: "Prince Court Medical Centre", name: "Dato' Dr. Mohamed Ezani Md Taib", title: "Consultant Cardiologist", specialization: "Kardiologi", subspecialization: "Interventional Cardiology", country: "Malaysia", experience_years: 25, rating: 4.8, is_featured: true, notable_for: "Former Director of National Heart Institute (IJN). One of Malaysia's top interventional cardiologists.", languages: ["English", "Malay"], currency: "MYR", consultation_fee_min: 200, consultation_fee_max: 400, qualifications: ["MBBS (Melbourne)", "MRCP (London)", "FACC"], procedures_offered: ["Complex PCI", "TAVR", "Structural Heart Intervention", "CTO PCI"], conditions_treated: ["Coronary Artery Disease", "Structural Heart Disease", "Heart Failure"], available_days: ["Mon", "Wed", "Thu", "Fri"], telemedicine_available: true },
  { hospital: "Prince Court Medical Centre", name: "Dr. Nor Anita Megat Mohd Nordin", title: "Consultant Breast & Endocrine Surgeon", specialization: "Onkologi", subspecialization: "Breast Surgery", country: "Malaysia", experience_years: 16, rating: 4.6, is_featured: false, notable_for: "Leading breast cancer surgeon in Malaysia. Specializes in oncoplastic and nipple-sparing mastectomy.", languages: ["English", "Malay"], currency: "MYR", consultation_fee_min: 100, consultation_fee_max: 250, qualifications: ["MBBS (UKM)", "MS (Surgery)", "Fellowship (Seoul National University)"], procedures_offered: ["Breast Cancer Surgery", "Oncoplastic Surgery", "Sentinel Node Biopsy", "Mastectomy"], conditions_treated: ["Breast Cancer", "Thyroid Cancer", "Breast Lumps", "Endocrine Disorders"], available_days: ["Mon", "Tue", "Wed", "Thu"], telemedicine_available: true },

  // ── Gleneagles KL ──
  { hospital: "Gleneagles Hospital Kuala Lumpur", name: "Dr. Lee Chee Wei", title: "Consultant Orthopedic Surgeon", specialization: "Ortopedi", subspecialization: "Sports Medicine & Joint Replacement", country: "Malaysia", experience_years: 20, rating: 4.5, is_featured: false, notable_for: "Sports medicine expert, team physician for multiple Malaysian national sports teams.", languages: ["English", "Mandarin", "Malay"], currency: "MYR", consultation_fee_min: 120, consultation_fee_max: 280, qualifications: ["MBBS (IMU)", "MS Orthopedics (UKM)", "FRCS (Edinburgh)"], procedures_offered: ["ACL Reconstruction", "Total Knee Replacement", "Shoulder Arthroscopy", "Robotic-Assisted Surgery"], conditions_treated: ["Sports Injuries", "Osteoarthritis", "Meniscus Tears", "Rotator Cuff Injury"], available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], telemedicine_available: true },

  // ── Island Hospital Penang ──
  { hospital: "Island Hospital Penang", name: "Dato' Dr. Tan Yew Ghee", title: "Consultant Cardiothoracic Surgeon", specialization: "Kardiologi", subspecialization: "Cardiothoracic & Vascular Surgery", country: "Malaysia", experience_years: 32, rating: 4.8, is_featured: true, notable_for: "Penang's most experienced cardiothoracic surgeon. Performed the first TAVI in northern Malaysia.", languages: ["English", "Mandarin", "Malay", "Hokkien"], currency: "MYR", consultation_fee_min: 100, consultation_fee_max: 250, qualifications: ["MBBS (Malaya)", "FRCS (Edinburgh)", "FACS", "FICS"], procedures_offered: ["CABG", "Valve Surgery", "TAVI", "Aortic Surgery", "Vascular Surgery"], conditions_treated: ["Coronary Artery Disease", "Valve Disease", "Aortic Aneurysm", "Peripheral Vascular Disease"], available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], telemedicine_available: false },

  // ── RS Pondok Indah ──
  { hospital: "RS Pondok Indah - Pondok Indah", name: "Dr. Teguh Karjadi, SpJP(K)", title: "Konsultan Kardiologi Intervensi", specialization: "Kardiologi", subspecialization: "Kardiologi Intervensi", country: "Indonesia", experience_years: 22, rating: 4.6, is_featured: true, notable_for: "Spesialis jantung intervensi terkemuka di Jakarta. Berpengalaman dalam prosedur kateter jantung kompleks.", languages: ["Indonesian", "English"], currency: "IDR", consultation_fee_min: 500000, consultation_fee_max: 1000000, qualifications: ["SpJP(K) (UI)", "FIHA", "FSCAI"], procedures_offered: ["Angioplasty", "Stenting", "TAVI", "Rotablation"], conditions_treated: ["Penyakit Jantung Koroner", "Serangan Jantung", "Gangguan Katup Jantung"], available_days: ["Sen", "Sel", "Rab", "Kam", "Jum"], telemedicine_available: true },
  { hospital: "RS Pondok Indah - Pondok Indah", name: "Prof. Dr. Aru Wisaksono, SpB-KBD", title: "Konsultan Bedah Digestif", specialization: "Gastroenterologi", subspecialization: "Bedah Digestif", country: "Indonesia", experience_years: 28, rating: 4.5, is_featured: false, notable_for: "Profesor bedah digestif UI. Ahli dalam operasi laparoskopi dan robotic surgery untuk kanker saluran cerna.", languages: ["Indonesian", "English"], currency: "IDR", consultation_fee_min: 400000, consultation_fee_max: 800000, qualifications: ["SpB-KBD (UI)", "PhD (Japan)"], procedures_offered: ["Laparoscopic Surgery", "Robotic Surgery", "Whipple Procedure", "Colectomy"], conditions_treated: ["Kanker Usus", "Kanker Pankreas", "Batu Empedu", "Hernia"], available_days: ["Sen", "Rab", "Jum"], telemedicine_available: false },

  // ── Additional specialists across hospitals ──
  { hospital: "Mount Elizabeth Novena Hospital", name: "Dr. Cheng Shin Chuen", title: "Senior Consultant Spine Surgeon", specialization: "Ortopedi", subspecialization: "Spine Surgery", country: "Singapore", experience_years: 20, rating: 4.7, is_featured: true, notable_for: "Expert in minimally invasive spine surgery and complex spinal deformity correction.", languages: ["English", "Mandarin"], currency: "SGD", consultation_fee_min: 250, consultation_fee_max: 550, qualifications: ["MBBS (NUS)", "FRCS (Edinburgh)", "Fellowship (Toronto)"], procedures_offered: ["MISS", "Spinal Fusion", "Disc Replacement", "Scoliosis Surgery"], conditions_treated: ["Herniated Disc", "Scoliosis", "Spinal Stenosis", "Spinal Fracture"], available_days: ["Mon", "Tue", "Wed", "Thu"], telemedicine_available: true },

  { hospital: "Raffles Hospital", name: "Dr. Lee Kim En", title: "Consultant Urologist", specialization: "Urologi", subspecialization: "Robotic Urology", country: "Singapore", experience_years: 18, rating: 4.5, is_featured: false, notable_for: "Specialist in robotic-assisted prostatectomy and kidney surgery.", languages: ["English", "Mandarin", "Malay"], currency: "SGD", consultation_fee_min: 180, consultation_fee_max: 400, qualifications: ["MBBS (NUS)", "FRCS (Urology)", "Fellowship (Robotic Surgery, USA)"], procedures_offered: ["Robotic Prostatectomy", "RIRS", "TURP", "Nephrectomy"], conditions_treated: ["Prostate Cancer", "Kidney Stones", "BPH", "Kidney Cancer"], available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], telemedicine_available: true },

  { hospital: "National University Hospital", name: "Dr. Fong Kok Yong", title: "Senior Consultant Rheumatologist", specialization: "Penyakit Infeksi", subspecialization: "Rheumatology", country: "Singapore", experience_years: 23, rating: 4.6, is_featured: false, notable_for: "Leading rheumatologist and clinical researcher in autoimmune diseases. Published 200+ papers.", languages: ["English", "Mandarin"], currency: "SGD", consultation_fee_min: 150, consultation_fee_max: 350, qualifications: ["MBBS (NUS)", "FRCP (London)", "PhD (Immunology)"], procedures_offered: ["Joint Injection", "Biologic Therapy", "Bone Density Testing"], conditions_treated: ["Lupus (SLE)", "Rheumatoid Arthritis", "Gout", "Scleroderma"], available_days: ["Mon", "Wed", "Fri"], telemedicine_available: true },

  // Additional MY doctors
  { hospital: "Sunway Medical Centre", name: "Dr. Wong Chiung Ing", title: "Consultant Fertility Specialist", specialization: "Pediatri", subspecialization: "Reproductive Medicine & IVF", country: "Malaysia", experience_years: 16, rating: 4.6, is_featured: false, notable_for: "Leading IVF specialist with above-average success rates. Trained in Australia and the UK.", languages: ["English", "Mandarin", "Malay"], currency: "MYR", consultation_fee_min: 150, consultation_fee_max: 300, qualifications: ["MBBS (Monash)", "MRCOG (UK)", "Fellowship (Reproductive Medicine)"], procedures_offered: ["IVF", "ICSI", "Egg Freezing", "PGT-A", "Hysteroscopy"], conditions_treated: ["Infertility", "PCOS", "Endometriosis", "Recurrent Miscarriage"], available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], telemedicine_available: true },

  { hospital: "Gleneagles Hospital Kuala Lumpur", name: "Dr. Lim Boon Khaw", title: "Consultant Gastroenterologist", specialization: "Gastroenterologi", subspecialization: "Hepatology", country: "Malaysia", experience_years: 19, rating: 4.5, is_featured: false, notable_for: "Expert in liver disease management and advanced therapeutic endoscopy procedures.", languages: ["English", "Mandarin", "Malay"], currency: "MYR", consultation_fee_min: 120, consultation_fee_max: 280, qualifications: ["MBBS (Malaya)", "MRCP (UK)", "Fellowship (Gastroenterology)"], procedures_offered: ["Colonoscopy", "Gastroscopy", "ERCP", "EUS", "Liver Biopsy"], conditions_treated: ["Hepatitis B/C", "Liver Cirrhosis", "Colon Polyps", "IBD", "GERD"], available_days: ["Mon", "Tue", "Wed", "Thu"], telemedicine_available: true },

  { hospital: "KPJ Tawakkal Specialist Hospital", name: "Dr. Ahmad Shaltut Mohamed", title: "Consultant Ophthalmologist", specialization: "Oftalmologi", subspecialization: "Cataract & Refractive Surgery", country: "Malaysia", experience_years: 14, rating: 4.4, is_featured: false, notable_for: "Specialist in LASIK, cataract surgery, and corneal diseases. High-volume cataract surgeon.", languages: ["English", "Malay", "Arabic"], currency: "MYR", consultation_fee_min: 80, consultation_fee_max: 200, qualifications: ["MBBS (Cairo)", "MS Ophthalmology (USM)", "Fellowship (Cornea)"], procedures_offered: ["LASIK", "Cataract Surgery", "Corneal Transplant", "Pterygium Surgery"], conditions_treated: ["Cataracts", "Myopia", "Corneal Disease", "Glaucoma"], available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], telemedicine_available: false },

  { hospital: "Subang Jaya Medical Centre", name: "Dr. Chen Tai Peng", title: "Consultant Dermatologist", specialization: "Dermatologi", subspecialization: "Dermatologic Surgery", country: "Malaysia", experience_years: 17, rating: 4.4, is_featured: false, notable_for: "Expert in skin cancer surgery, Mohs micrographic surgery, and advanced aesthetic dermatology.", languages: ["English", "Mandarin", "Malay"], currency: "MYR", consultation_fee_min: 100, consultation_fee_max: 250, qualifications: ["MBBS (UM)", "MRCP (Dermatology)", "Fellowship (Mohs Surgery, Australia)"], procedures_offered: ["Mohs Surgery", "Laser Therapy", "Excision Biopsy", "Patch Testing"], conditions_treated: ["Skin Cancer", "Psoriasis", "Eczema", "Melanoma", "Acne"], available_days: ["Mon", "Tue", "Thu", "Fri"], telemedicine_available: true },
];

// ─── Insurance panels for key hospitals ────────────────────
const INSURANCE_PANELS = [
  // Singapore
  { hospital: "Mount Elizabeth Hospital", insurers: ["AIA Singapore", "Great Eastern", "Prudential Singapore", "AXA", "NTUC Income", "Allianz", "Manulife", "Tokio Marine"] },
  { hospital: "Gleneagles Hospital Singapore", insurers: ["AIA Singapore", "Great Eastern", "Prudential Singapore", "AXA", "NTUC Income", "Allianz"] },
  { hospital: "Raffles Hospital", insurers: ["AIA Singapore", "Great Eastern", "Prudential Singapore", "NTUC Income", "Cigna"] },
  { hospital: "Mount Elizabeth Novena Hospital", insurers: ["AIA Singapore", "Great Eastern", "Prudential Singapore", "AXA", "Allianz", "Manulife"] },
  // Malaysia
  { hospital: "Sunway Medical Centre", insurers: ["AIA Malaysia", "Great Eastern Malaysia", "Prudential BSN Takaful", "AXA Affin", "Allianz Malaysia", "Tokio Marine Malaysia", "Etiqa"] },
  { hospital: "Prince Court Medical Centre", insurers: ["AIA Malaysia", "Great Eastern Malaysia", "Prudential BSN", "AXA Affin", "Allianz", "Zurich Malaysia"] },
  { hospital: "Gleneagles Hospital Kuala Lumpur", insurers: ["AIA Malaysia", "Great Eastern Malaysia", "Prudential BSN", "AXA Affin", "Allianz Malaysia", "Manulife"] },
  { hospital: "Island Hospital Penang", insurers: ["AIA Malaysia", "Great Eastern Malaysia", "Prudential BSN", "Allianz Malaysia", "Etiqa", "Tokio Marine"] },
  // Indonesia
  { hospital: "RS Pondok Indah - Pondok Indah", insurers: ["Allianz Indonesia", "AXA Mandiri", "Prudential Indonesia", "Manulife Indonesia", "AIA Indonesia", "BNI Life"] },
];

// ─── Facilities for key hospitals ──────────────────────────
const FACILITIES = [
  { hospital: "Mount Elizabeth Hospital", facilities: [
    { category: "Surgical", name: "Hybrid Operating Theatre", description: "Combined OR with advanced imaging for complex procedures", is_highlighted: true },
    { category: "Surgical", name: "Da Vinci Robotic Surgery Suite", description: "Latest generation robotic surgical system", is_highlighted: true },
    { category: "Diagnostic", name: "PET-CT Scanner", description: "Whole-body PET-CT for cancer staging", is_highlighted: true },
    { category: "Diagnostic", name: "3 Tesla MRI", description: "High-resolution MRI for brain and cardiac imaging", is_highlighted: false },
    { category: "Treatment", name: "CyberKnife", description: "Stereotactic radiosurgery for tumors", is_highlighted: true },
    { category: "Treatment", name: "ECMO Unit", description: "Advanced life support for critical cardiac/pulmonary cases", is_highlighted: false },
    { category: "Patient", name: "International Patient Centre", description: "Dedicated concierge for overseas patients", is_highlighted: false },
  ]},
  { hospital: "Sunway Medical Centre", facilities: [
    { category: "Treatment", name: "Proton Therapy Centre", description: "Southeast Asia's first private proton beam therapy facility", is_highlighted: true },
    { category: "Surgical", name: "Da Vinci Xi Robotic Surgery", description: "Multi-port robotic system for minimally invasive surgery", is_highlighted: true },
    { category: "Treatment", name: "CyberKnife M6", description: "Non-invasive robotic radiosurgery system", is_highlighted: true },
    { category: "Diagnostic", name: "PET-CT Scanner", description: "Advanced molecular imaging", is_highlighted: false },
    { category: "Treatment", name: "ECMO", description: "Extracorporeal membrane oxygenation", is_highlighted: false },
    { category: "Patient", name: "International Patient Centre", description: "Full-service for medical tourists", is_highlighted: false },
  ]},
  { hospital: "Prince Court Medical Centre", facilities: [
    { category: "Surgical", name: "Robotic Surgery Suite", description: "State-of-the-art robotic-assisted surgical capabilities", is_highlighted: true },
    { category: "Diagnostic", name: "3T MRI", description: "Highest field strength MRI for detailed imaging", is_highlighted: true },
    { category: "Treatment", name: "TAVI Suite", description: "Transcatheter aortic valve implantation capability", is_highlighted: true },
    { category: "Patient", name: "VIP Suites", description: "5-star hospitality-grade patient rooms", is_highlighted: false },
    { category: "Patient", name: "International Patient Centre", description: "Multi-lingual concierge and visa assistance", is_highlighted: false },
  ]},
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── Insert hospitals ──
    const hospitalIdMap = new Map<string, string>();

    for (const h of HOSPITALS) {
      const res = await client.query(
        `INSERT INTO public.hospital (
          name, country, city, address, phone, website, type, tier,
          bed_count, established_year, emergency_24h, international_patients,
          insurance_panel, is_partner, status, avg_rating, total_reviews,
          description, specializations, accreditations, languages_supported,
          technologies, operating_hours, latitude, longitude
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
        ON CONFLICT DO NOTHING
        RETURNING hospital_id`,
        [
          h.name, h.country, h.city, h.address, h.phone, h.website, h.type, h.tier,
          h.bed_count, h.established_year, h.emergency_24h, h.international_patients,
          h.insurance_panel, h.is_partner, h.status, h.avg_rating, h.total_reviews,
          h.description, h.specializations, h.accreditations, h.languages_supported,
          h.technologies, h.operating_hours, h.latitude, h.longitude,
        ]
      );

      if (res.rows.length > 0) {
        hospitalIdMap.set(h.name, res.rows[0].hospital_id);
      } else {
        // Already exists — fetch existing id
        const existing = await client.query("SELECT hospital_id FROM public.hospital WHERE name = $1", [h.name]);
        if (existing.rows.length > 0) hospitalIdMap.set(h.name, existing.rows[0].hospital_id);
      }
    }

    console.log(`Inserted/found ${hospitalIdMap.size} hospitals`);

    // ── Insert doctors ──
    let doctorCount = 0;
    for (const d of DOCTORS) {
      const hospitalId = hospitalIdMap.get(d.hospital) || null;
      await client.query(
        `INSERT INTO public.doctors (
          name, title, specialization, subspecialization, hospital,
          hospital_location, country, experience_years, rating,
          is_featured, notable_for, languages, currency,
          consultation_fee_min, consultation_fee_max, qualifications,
          procedures_offered, conditions_treated, available_days,
          telemedicine_available, hospital_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [
          d.name, d.title, d.specialization, d.subspecialization, d.hospital,
          `${HOSPITALS.find(h => h.name === d.hospital)?.city || ""}, ${d.country}`,
          d.country, d.experience_years, d.rating,
          d.is_featured, d.notable_for, d.languages, d.currency,
          d.consultation_fee_min, d.consultation_fee_max, d.qualifications || null,
          d.procedures_offered || null, d.conditions_treated || null, d.available_days || null,
          d.telemedicine_available, hospitalId,
        ]
      );
      doctorCount++;
    }
    console.log(`Inserted ${doctorCount} doctors`);

    // ── Insert insurance panels ──
    let panelCount = 0;
    for (const panel of INSURANCE_PANELS) {
      const hospitalId = hospitalIdMap.get(panel.hospital);
      if (!hospitalId) continue;
      for (const ins of panel.insurers) {
        await client.query(
          `INSERT INTO public.hospital_insurance_panel (hospital_id, insurance_name, panel_type)
           VALUES ($1, $2, 'CASHLESS') ON CONFLICT DO NOTHING`,
          [hospitalId, ins]
        );
        panelCount++;
      }
    }
    console.log(`Inserted ${panelCount} insurance panel entries`);

    // ── Insert facilities ──
    let facilityCount = 0;
    for (const f of FACILITIES) {
      const hospitalId = hospitalIdMap.get(f.hospital);
      if (!hospitalId) continue;
      for (const fac of f.facilities) {
        await client.query(
          `INSERT INTO public.hospital_facility (hospital_id, category, name, description, is_highlighted)
           VALUES ($1, $2, $3, $4, $5)`,
          [hospitalId, fac.category, fac.name, fac.description, fac.is_highlighted]
        );
        facilityCount++;
      }
    }
    console.log(`Inserted ${facilityCount} facility entries`);

    await client.query("COMMIT");
    console.log("\n✅ Hospital Network seed completed successfully!");
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
