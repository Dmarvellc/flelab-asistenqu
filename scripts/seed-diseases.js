/* eslint-disable */
/**
 * scripts/seed-diseases.js
 * ─────────────────────────────────────────────────────────────────
 * Populate public.disease with a comprehensive Indonesian dataset
 * so the claims "Penyakit / Diagnosa" combobox has full coverage.
 *
 * Table: disease_id (serial), icd10_code (text), name (text), category (text), created_at
 *
 * Idempotent: skips names that already exist (case-insensitive).
 *
 * Usage:
 *   node scripts/seed-diseases.js
 */

const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

// [name, icd10_code, category]
const DISEASES = [
  // Penyakit Infeksi & Tropis
  ["Demam Berdarah Dengue (DBD)", "A97.0", "Infeksi & Tropis"],
  ["Demam Dengue", "A97.1", "Infeksi & Tropis"],
  ["Malaria", "B54", "Infeksi & Tropis"],
  ["Tifoid (Demam Tifoid)", "A01.0", "Infeksi & Tropis"],
  ["Paratifoid", "A01.1", "Infeksi & Tropis"],
  ["Tuberkulosis Paru", "A15.0", "Infeksi & Tropis"],
  ["Tuberkulosis Ekstra Paru", "A18", "Infeksi & Tropis"],
  ["HIV / AIDS", "B24", "Infeksi & Tropis"],
  ["Hepatitis A", "B15", "Infeksi & Tropis"],
  ["Hepatitis B", "B16", "Infeksi & Tropis"],
  ["Hepatitis C", "B17.1", "Infeksi & Tropis"],
  ["Hepatitis E", "B17.2", "Infeksi & Tropis"],
  ["Leptospirosis", "A27", "Infeksi & Tropis"],
  ["Chikungunya", "A92.0", "Infeksi & Tropis"],
  ["COVID-19", "U07.1", "Infeksi & Tropis"],
  ["Influenza", "J11", "Infeksi & Tropis"],
  ["ISPA (Infeksi Saluran Pernapasan Akut)", "J22", "Infeksi & Tropis"],
  ["Faringitis Akut", "J02.9", "Infeksi & Tropis"],
  ["Tonsilitis Akut", "J03.9", "Infeksi & Tropis"],
  ["Sinusitis Akut", "J01.9", "Infeksi & Tropis"],
  ["Otitis Media Akut", "H66.0", "Infeksi & Tropis"],
  ["Otitis Eksterna", "H60", "Infeksi & Tropis"],
  ["Konjungtivitis Infeksi", "H10.3", "Infeksi & Tropis"],
  ["Varicella (Cacar Air)", "B01", "Infeksi & Tropis"],
  ["Herpes Zoster", "B02", "Infeksi & Tropis"],
  ["Herpes Simpleks", "B00", "Infeksi & Tropis"],
  ["Campak", "B05", "Infeksi & Tropis"],
  ["Rubella", "B06", "Infeksi & Tropis"],
  ["Gondongan (Parotitis)", "B26", "Infeksi & Tropis"],
  ["Difteri", "A36", "Infeksi & Tropis"],
  ["Pertusis (Batuk Rejan)", "A37", "Infeksi & Tropis"],
  ["Tetanus", "A35", "Infeksi & Tropis"],
  ["Rabies", "A82", "Infeksi & Tropis"],
  ["Filariasis", "B74", "Infeksi & Tropis"],
  ["Skabies", "B86", "Infeksi & Tropis"],
  ["Kandidiasis", "B37", "Infeksi & Tropis"],
  ["Tinea Korporis", "B35.4", "Infeksi & Tropis"],
  ["Tinea Kapitis", "B35.0", "Infeksi & Tropis"],
  ["Tinea Pedis", "B35.3", "Infeksi & Tropis"],
  ["Cacingan (Soil-Transmitted Helminthiasis)", "B76", "Infeksi & Tropis"],
  ["Amoebiasis", "A06", "Infeksi & Tropis"],
  ["Disentri Basiler", "A03", "Infeksi & Tropis"],
  ["Kolera", "A00", "Infeksi & Tropis"],
  ["Sepsis", "A41.9", "Infeksi & Tropis"],
  ["Meningitis", "G03.9", "Infeksi & Tropis"],
  ["Ensefalitis", "G04.9", "Infeksi & Tropis"],

  // Sistem Pernapasan
  ["Pneumonia", "J18.9", "Pernapasan"],
  ["Bronkopneumonia", "J18.0", "Pernapasan"],
  ["Bronkitis Akut", "J20.9", "Pernapasan"],
  ["Bronkitis Kronik", "J42", "Pernapasan"],
  ["Asma Bronkial", "J45.9", "Pernapasan"],
  ["Asma Eksaserbasi Akut", "J45.0", "Pernapasan"],
  ["PPOK (Penyakit Paru Obstruktif Kronik)", "J44.1", "Pernapasan"],
  ["Bronkiektasis", "J47", "Pernapasan"],
  ["Efusi Pleura", "J90", "Pernapasan"],
  ["Pneumotoraks", "J93.9", "Pernapasan"],
  ["Empiema", "J86.9", "Pernapasan"],
  ["Edema Paru", "J81", "Pernapasan"],
  ["Emboli Paru", "I26.9", "Pernapasan"],
  ["Gagal Napas Akut", "J96.0", "Pernapasan"],
  ["ARDS (Acute Respiratory Distress Syndrome)", "J80", "Pernapasan"],
  ["Tonsilofaringitis", "J03.9", "Pernapasan"],
  ["Laringitis Akut", "J04.0", "Pernapasan"],
  ["Rinitis Alergi", "J30.4", "Pernapasan"],
  ["Apnea Tidur Obstruktif", "G47.3", "Pernapasan"],
  ["Kanker Paru", "C34.9", "Pernapasan"],

  // Sistem Kardiovaskular
  ["Hipertensi", "I10", "Kardiovaskular"],
  ["Hipertensi Krisis", "I10", "Kardiovaskular"],
  ["Hipotensi Ortostatik", "I95.1", "Kardiovaskular"],
  ["Penyakit Jantung Koroner", "I25.9", "Kardiovaskular"],
  ["Angina Pektoris Stabil", "I20.9", "Kardiovaskular"],
  ["Angina Pektoris Tidak Stabil", "I20.0", "Kardiovaskular"],
  ["Infark Miokard Akut (STEMI)", "I21.0", "Kardiovaskular"],
  ["Infark Miokard Akut (NSTEMI)", "I21.4", "Kardiovaskular"],
  ["Gagal Jantung Kongestif", "I50.0", "Kardiovaskular"],
  ["Aritmia", "I49.9", "Kardiovaskular"],
  ["Atrial Fibrilasi", "I48", "Kardiovaskular"],
  ["Bradikardia", "R00.1", "Kardiovaskular"],
  ["Takikardia Supraventrikular", "I47.1", "Kardiovaskular"],
  ["Penyakit Katup Jantung", "I34.9", "Kardiovaskular"],
  ["Endokarditis", "I33.0", "Kardiovaskular"],
  ["Miokarditis", "I40.9", "Kardiovaskular"],
  ["Perikarditis", "I30.9", "Kardiovaskular"],
  ["Kardiomiopati", "I42.9", "Kardiovaskular"],
  ["Penyakit Jantung Rematik", "I09.9", "Kardiovaskular"],
  ["Penyakit Jantung Bawaan", "Q24.9", "Kardiovaskular"],
  ["Aneurisma Aorta", "I71.9", "Kardiovaskular"],
  ["Diseksi Aorta", "I71.0", "Kardiovaskular"],
  ["Trombosis Vena Dalam (DVT)", "I82.9", "Kardiovaskular"],
  ["Varises Tungkai", "I83.9", "Kardiovaskular"],
  ["Penyakit Arteri Perifer", "I73.9", "Kardiovaskular"],
  ["Stroke Iskemik", "I63.9", "Kardiovaskular"],
  ["Stroke Hemoragik", "I61.9", "Kardiovaskular"],
  ["TIA (Transient Ischemic Attack)", "G45.9", "Kardiovaskular"],
  ["Henti Jantung", "I46.9", "Kardiovaskular"],

  // Sistem Pencernaan
  ["Gastritis Akut", "K29.0", "Pencernaan"],
  ["Gastritis Kronik", "K29.5", "Pencernaan"],
  ["GERD (Refluks Gastroesofageal)", "K21.0", "Pencernaan"],
  ["Tukak Lambung", "K25.9", "Pencernaan"],
  ["Tukak Duodenum", "K26.9", "Pencernaan"],
  ["Dispepsia Fungsional", "K30", "Pencernaan"],
  ["Gastroenteritis Akut", "K52.9", "Pencernaan"],
  ["Diare Akut", "A09", "Pencernaan"],
  ["Diare Kronik", "K52.9", "Pencernaan"],
  ["Konstipasi Kronik", "K59.0", "Pencernaan"],
  ["Apendisitis Akut", "K35.9", "Pencernaan"],
  ["Apendisitis Perforasi", "K35.2", "Pencernaan"],
  ["Kolesistitis", "K81.0", "Pencernaan"],
  ["Kolelitiasis (Batu Empedu)", "K80.2", "Pencernaan"],
  ["Kolangitis", "K83.0", "Pencernaan"],
  ["Pankreatitis Akut", "K85.9", "Pencernaan"],
  ["Pankreatitis Kronik", "K86.1", "Pencernaan"],
  ["Sirosis Hepatis", "K74.6", "Pencernaan"],
  ["Perlemakan Hati Non-Alkoholik (NAFLD)", "K76.0", "Pencernaan"],
  ["Abses Hepar", "K75.0", "Pencernaan"],
  ["Ileus Obstruktif", "K56.6", "Pencernaan"],
  ["Ileus Paralitik", "K56.0", "Pencernaan"],
  ["Hernia Inguinalis", "K40.9", "Pencernaan"],
  ["Hernia Umbilikalis", "K42.9", "Pencernaan"],
  ["Hernia Insisional", "K43.9", "Pencernaan"],
  ["Hemoroid", "K64.9", "Pencernaan"],
  ["Fisura Ani", "K60.2", "Pencernaan"],
  ["Fistula Ani", "K60.3", "Pencernaan"],
  ["Abses Perianal", "K61.0", "Pencernaan"],
  ["Polip Kolon", "K63.5", "Pencernaan"],
  ["Penyakit Crohn", "K50.9", "Pencernaan"],
  ["Kolitis Ulseratif", "K51.9", "Pencernaan"],
  ["Sindrom Iritasi Usus (IBS)", "K58.9", "Pencernaan"],
  ["Kanker Lambung", "C16.9", "Pencernaan"],
  ["Kanker Kolorektal", "C18.9", "Pencernaan"],
  ["Kanker Hati", "C22.0", "Pencernaan"],
  ["Kanker Pankreas", "C25.9", "Pencernaan"],
  ["Kanker Kandung Empedu", "C23", "Pencernaan"],
  ["Kanker Esofagus", "C15.9", "Pencernaan"],

  // Sistem Endokrin & Metabolik
  ["Diabetes Melitus Tipe 1", "E10.9", "Endokrin & Metabolik"],
  ["Diabetes Melitus Tipe 2", "E11.9", "Endokrin & Metabolik"],
  ["Ketoasidosis Diabetik", "E11.1", "Endokrin & Metabolik"],
  ["Hipoglikemia", "E16.0", "Endokrin & Metabolik"],
  ["Hiperglikemia Hiperosmolar", "E11.0", "Endokrin & Metabolik"],
  ["Hipertiroid (Penyakit Graves)", "E05.0", "Endokrin & Metabolik"],
  ["Hipotiroid", "E03.9", "Endokrin & Metabolik"],
  ["Tiroiditis", "E06.9", "Endokrin & Metabolik"],
  ["Goiter (Struma)", "E04.9", "Endokrin & Metabolik"],
  ["Sindrom Cushing", "E24.9", "Endokrin & Metabolik"],
  ["Penyakit Addison", "E27.1", "Endokrin & Metabolik"],
  ["Hiperparatiroidisme", "E21.3", "Endokrin & Metabolik"],
  ["Hipoparatiroidisme", "E20.9", "Endokrin & Metabolik"],
  ["Obesitas", "E66.9", "Endokrin & Metabolik"],
  ["Dislipidemia", "E78.5", "Endokrin & Metabolik"],
  ["Hiperkolesterolemia", "E78.0", "Endokrin & Metabolik"],
  ["Hipertrigliseridemia", "E78.1", "Endokrin & Metabolik"],
  ["Asam Urat (Gout)", "M10.9", "Endokrin & Metabolik"],
  ["Sindrom Metabolik", "E88.81", "Endokrin & Metabolik"],
  ["Kanker Tiroid", "C73", "Endokrin & Metabolik"],

  // Sistem Saraf
  ["Migrain", "G43.9", "Saraf"],
  ["Sakit Kepala Tipe Tegang", "G44.2", "Saraf"],
  ["Vertigo", "H81.1", "Saraf"],
  ["Vertigo Posisional Paroksismal Jinak (BPPV)", "H81.1", "Saraf"],
  ["Epilepsi", "G40.9", "Saraf"],
  ["Status Epileptikus", "G41.9", "Saraf"],
  ["Kejang Demam", "R56.0", "Saraf"],
  ["Penyakit Parkinson", "G20", "Saraf"],
  ["Demensia Alzheimer", "G30.9", "Saraf"],
  ["Neuropati Perifer", "G62.9", "Saraf"],
  ["Neuropati Diabetik", "E11.4", "Saraf"],
  ["Bell's Palsy", "G51.0", "Saraf"],
  ["Neuralgia Trigeminal", "G50.0", "Saraf"],
  ["Sindrom Carpal Tunnel", "G56.0", "Saraf"],
  ["HNP (Hernia Nukleus Pulposus) Servikal", "M50.1", "Saraf"],
  ["HNP (Hernia Nukleus Pulposus) Lumbal", "M51.1", "Saraf"],
  ["Spondilosis Servikal", "M47.8", "Saraf"],
  ["Spondilosis Lumbal", "M47.8", "Saraf"],
  ["Perdarahan Subaraknoid", "I60.9", "Saraf"],
  ["Perdarahan Intrakranial", "I61.9", "Saraf"],
  ["Tumor Otak", "D43.2", "Saraf"],

  // Kesehatan Jiwa
  ["Gangguan Cemas Menyeluruh", "F41.1", "Kesehatan Jiwa"],
  ["Gangguan Panik", "F41.0", "Kesehatan Jiwa"],
  ["Depresi", "F32.9", "Kesehatan Jiwa"],
  ["Gangguan Bipolar", "F31.9", "Kesehatan Jiwa"],
  ["Skizofrenia", "F20.9", "Kesehatan Jiwa"],
  ["Insomnia", "G47.0", "Kesehatan Jiwa"],
  ["Gangguan Stres Pasca-Trauma (PTSD)", "F43.1", "Kesehatan Jiwa"],
  ["Gangguan Penyesuaian", "F43.2", "Kesehatan Jiwa"],

  // Genitourinaria
  ["Infeksi Saluran Kemih (ISK)", "N39.0", "Genitourinaria"],
  ["Pielonefritis", "N10", "Genitourinaria"],
  ["Sistitis", "N30.0", "Genitourinaria"],
  ["Uretritis", "N34.1", "Genitourinaria"],
  ["Glomerulonefritis", "N05.9", "Genitourinaria"],
  ["Sindrom Nefrotik", "N04.9", "Genitourinaria"],
  ["Penyakit Ginjal Kronik", "N18.9", "Genitourinaria"],
  ["Gagal Ginjal Akut", "N17.9", "Genitourinaria"],
  ["Batu Ginjal (Nefrolitiasis)", "N20.0", "Genitourinaria"],
  ["Batu Ureter", "N20.1", "Genitourinaria"],
  ["Pembesaran Prostat Jinak (BPH)", "N40", "Genitourinaria"],
  ["Prostatitis", "N41.0", "Genitourinaria"],
  ["Kanker Prostat", "C61", "Genitourinaria"],
  ["Kanker Ginjal", "C64", "Genitourinaria"],
  ["Kanker Kandung Kemih", "C67.9", "Genitourinaria"],
  ["Inkontinensia Urin", "N39.3", "Genitourinaria"],

  // Kandungan & Kehamilan
  ["Mioma Uteri", "D25.9", "Kandungan & Kehamilan"],
  ["Kista Ovarium", "N83.2", "Kandungan & Kehamilan"],
  ["Endometriosis", "N80.9", "Kandungan & Kehamilan"],
  ["Sindrom Ovarium Polikistik (PCOS)", "E28.2", "Kandungan & Kehamilan"],
  ["Penyakit Radang Panggul", "N73.9", "Kandungan & Kehamilan"],
  ["Servisitis", "N72", "Kandungan & Kehamilan"],
  ["Kanker Serviks", "C53.9", "Kandungan & Kehamilan"],
  ["Kanker Payudara", "C50.9", "Kandungan & Kehamilan"],
  ["Kanker Ovarium", "C56", "Kandungan & Kehamilan"],
  ["Kanker Endometrium", "C54.1", "Kandungan & Kehamilan"],
  ["Hiperemesis Gravidarum", "O21.1", "Kandungan & Kehamilan"],
  ["Preeklampsia", "O14.9", "Kandungan & Kehamilan"],
  ["Eklampsia", "O15.9", "Kandungan & Kehamilan"],
  ["Diabetes Gestasional", "O24.4", "Kandungan & Kehamilan"],
  ["Plasenta Previa", "O44.1", "Kandungan & Kehamilan"],
  ["Solusio Plasenta", "O45.9", "Kandungan & Kehamilan"],
  ["Abortus Spontan", "O03.9", "Kandungan & Kehamilan"],
  ["Abortus Inkomplit", "O06.4", "Kandungan & Kehamilan"],
  ["Kehamilan Ektopik", "O00.9", "Kandungan & Kehamilan"],
  ["Persalinan Prematur", "O60.1", "Kandungan & Kehamilan"],
  ["Ketuban Pecah Dini", "O42.9", "Kandungan & Kehamilan"],
  ["Atonia Uteri", "O62.2", "Kandungan & Kehamilan"],
  ["Perdarahan Postpartum", "O72.1", "Kandungan & Kehamilan"],
  ["Mastitis", "N61", "Kandungan & Kehamilan"],
  ["Tumor Payudara Jinak (FAM)", "D24", "Kandungan & Kehamilan"],

  // Muskuloskeletal
  ["Osteoartritis", "M19.9", "Muskuloskeletal"],
  ["Artritis Reumatoid", "M06.9", "Muskuloskeletal"],
  ["Lupus Eritematosus Sistemik (SLE)", "M32.9", "Muskuloskeletal"],
  ["Spondiloartritis", "M45", "Muskuloskeletal"],
  ["Osteoporosis", "M81.0", "Muskuloskeletal"],
  ["Osteomielitis", "M86.9", "Muskuloskeletal"],
  ["Skoliosis", "M41.9", "Muskuloskeletal"],
  ["Low Back Pain", "M54.5", "Muskuloskeletal"],
  ["Frozen Shoulder", "M75.0", "Muskuloskeletal"],
  ["Tendinitis", "M77.9", "Muskuloskeletal"],
  ["Bursitis", "M71.9", "Muskuloskeletal"],
  ["Sprain (Keseleo)", "S93.4", "Muskuloskeletal"],
  ["Strain Otot", "T14.3", "Muskuloskeletal"],
  ["Fraktur Tertutup", "T14.2", "Muskuloskeletal"],
  ["Fraktur Terbuka", "T14.2", "Muskuloskeletal"],
  ["Fraktur Kompresi Vertebra", "M48.4", "Muskuloskeletal"],
  ["Dislokasi Sendi", "T14.3", "Muskuloskeletal"],
  ["Cedera Ligamen Lutut (ACL/MCL)", "S83.5", "Muskuloskeletal"],
  ["Cedera Meniskus", "S83.2", "Muskuloskeletal"],
  ["Robekan Tendon", "T14.3", "Muskuloskeletal"],

  // Trauma & Kedaruratan
  ["Cedera Kepala Ringan", "S09.9", "Trauma & Kedaruratan"],
  ["Cedera Kepala Sedang", "S09.9", "Trauma & Kedaruratan"],
  ["Cedera Kepala Berat", "S09.9", "Trauma & Kedaruratan"],
  ["Luka Bakar Derajat I", "T30.1", "Trauma & Kedaruratan"],
  ["Luka Bakar Derajat II", "T30.2", "Trauma & Kedaruratan"],
  ["Luka Bakar Derajat III", "T30.3", "Trauma & Kedaruratan"],
  ["Luka Robek (Vulnus Laceratum)", "T14.1", "Trauma & Kedaruratan"],
  ["Cedera Multiple Trauma", "T07", "Trauma & Kedaruratan"],
  ["Anafilaksis", "T78.2", "Trauma & Kedaruratan"],
  ["Syok Hipovolemik", "R57.1", "Trauma & Kedaruratan"],
  ["Syok Septik", "R57.2", "Trauma & Kedaruratan"],
  ["Syok Kardiogenik", "R57.0", "Trauma & Kedaruratan"],
  ["Dehidrasi", "E86.0", "Trauma & Kedaruratan"],
  ["Heat Stroke", "T67.0", "Trauma & Kedaruratan"],
  ["Keracunan Makanan", "T62.9", "Trauma & Kedaruratan"],
  ["Keracunan Obat", "T50.9", "Trauma & Kedaruratan"],
  ["Gigitan Ular Berbisa", "T63.0", "Trauma & Kedaruratan"],
  ["Gigitan Hewan", "T14.1", "Trauma & Kedaruratan"],
  ["Tenggelam (Near Drowning)", "T75.1", "Trauma & Kedaruratan"],

  // Kulit
  ["Dermatitis Atopik", "L20.9", "Kulit"],
  ["Dermatitis Kontak Alergi", "L23.9", "Kulit"],
  ["Dermatitis Seboroik", "L21.9", "Kulit"],
  ["Psoriasis", "L40.9", "Kulit"],
  ["Urtikaria", "L50.9", "Kulit"],
  ["Akne Vulgaris", "L70.0", "Kulit"],
  ["Selulitis", "L03.9", "Kulit"],
  ["Erisipelas", "A46", "Kulit"],
  ["Impetigo", "L01.0", "Kulit"],
  ["Furunkel / Karbunkel", "L02.9", "Kulit"],
  ["Vitiligo", "L80", "Kulit"],
  ["Melanoma", "C43.9", "Kulit"],
  ["Karsinoma Sel Basal", "C44.9", "Kulit"],
  ["Karsinoma Sel Skuamosa Kulit", "C44.9", "Kulit"],

  // Mata
  ["Katarak", "H26.9", "Mata"],
  ["Glaukoma", "H40.9", "Mata"],
  ["Retinopati Diabetik", "E11.3", "Mata"],
  ["Retinopati Hipertensi", "H35.0", "Mata"],
  ["Ablasio Retina", "H33.0", "Mata"],
  ["Degenerasi Makula Terkait Usia", "H35.3", "Mata"],
  ["Pterigium", "H11.0", "Mata"],
  ["Keratitis", "H16.9", "Mata"],
  ["Uveitis", "H20.9", "Mata"],
  ["Hordeolum", "H00.0", "Mata"],
  ["Kalazion", "H00.1", "Mata"],
  ["Konjungtivitis Alergi", "H10.1", "Mata"],

  // THT
  ["Tuli Sensorineural", "H90.3", "THT"],
  ["Tuli Konduktif", "H90.0", "THT"],
  ["Tinnitus", "H93.1", "THT"],
  ["Polip Hidung", "J33.0", "THT"],
  ["Deviasi Septum Nasi", "J34.2", "THT"],
  ["Epistaksis", "R04.0", "THT"],
  ["Tonsilitis Kronik", "J35.0", "THT"],
  ["Labirinitis", "H83.0", "THT"],

  // Hematologi & Onkologi
  ["Anemia Defisiensi Besi", "D50.9", "Hematologi & Onkologi"],
  ["Anemia Aplastik", "D61.9", "Hematologi & Onkologi"],
  ["Anemia Hemolitik", "D59.9", "Hematologi & Onkologi"],
  ["Talasemia", "D56.9", "Hematologi & Onkologi"],
  ["Hemofilia", "D66", "Hematologi & Onkologi"],
  ["Trombositopenia", "D69.6", "Hematologi & Onkologi"],
  ["ITP (Idiopathic Thrombocytopenic Purpura)", "D69.3", "Hematologi & Onkologi"],
  ["Leukemia Limfositik Akut", "C91.0", "Hematologi & Onkologi"],
  ["Leukemia Mieloid Akut", "C92.0", "Hematologi & Onkologi"],
  ["Leukemia Limfositik Kronik", "C91.1", "Hematologi & Onkologi"],
  ["Leukemia Mieloid Kronik", "C92.1", "Hematologi & Onkologi"],
  ["Limfoma Hodgkin", "C81.9", "Hematologi & Onkologi"],
  ["Limfoma Non-Hodgkin", "C85.9", "Hematologi & Onkologi"],
  ["Multiple Myeloma", "C90.0", "Hematologi & Onkologi"],
  ["Kanker Nasofaring", "C11.9", "Hematologi & Onkologi"],
  ["Kanker Rongga Mulut", "C06.9", "Hematologi & Onkologi"],
  ["Sarkoma Jaringan Lunak", "C49.9", "Hematologi & Onkologi"],

  // Pediatri
  ["Diare Akut pada Anak", "A09", "Pediatri"],
  ["Demam Tanpa Sebab Jelas", "R50.9", "Pediatri"],
  ["Gizi Buruk", "E43", "Pediatri"],
  ["Stunting", "E45", "Pediatri"],
  ["Kejang Demam Sederhana", "R56.0", "Pediatri"],
  ["Bronkiolitis", "J21.9", "Pediatri"],
  ["Croup (Laringotrakeobronkitis)", "J05.0", "Pediatri"],
  ["Asfiksia Neonatorum", "P21.9", "Pediatri"],
  ["Hiperbilirubinemia Neonatal (Ikterus)", "P59.9", "Pediatri"],
  ["Berat Bayi Lahir Rendah (BBLR)", "P07.1", "Pediatri"],
  ["Sepsis Neonatorum", "P36.9", "Pediatri"],
];

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const c = await pool.connect();
  let inserted = 0;
  let skipped = 0;
  try {
    await c.query("BEGIN");

    for (const [name, icd10_code, category] of DISEASES) {
      const existing = await c.query(
        "SELECT disease_id FROM public.disease WHERE lower(name) = lower($1)",
        [name],
      );
      if (existing.rowCount > 0) {
        skipped++;
        continue;
      }
      await c.query(
        "INSERT INTO public.disease (name, category) VALUES ($1, $2)",
        [name, category],
      );
      inserted++;
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

  // count total
  const pool2 = new Pool({ connectionString: DATABASE_URL });
  try {
    const r = await pool2.query("SELECT COUNT(*)::int AS n FROM public.disease");
    console.log(
      `Diseases seed done — inserted ${inserted}, already present ${skipped}, total in DB ${r.rows[0].n}.`,
    );
  } finally {
    await pool2.end();
  }
}

main();
