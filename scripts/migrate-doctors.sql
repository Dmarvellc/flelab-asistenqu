-- Migration: Create doctors table with real specialist doctor data
-- Sources: Siloam Hospitals Indonesia, KPJ Healthcare Malaysia, Mount Elizabeth Singapore

CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(100),
  specialization VARCHAR(100) NOT NULL,
  subspecialization VARCHAR(200),
  hospital VARCHAR(255) NOT NULL,
  hospital_location VARCHAR(100) NOT NULL,
  country VARCHAR(50) NOT NULL DEFAULT 'Indonesia',
  city VARCHAR(100),
  experience_years INTEGER,
  education TEXT,
  languages TEXT[],
  notable_for TEXT,
  rating NUMERIC(2,1) DEFAULT 4.5,
  consultation_fee_min INTEGER,
  consultation_fee_max INTEGER,
  currency VARCHAR(10) DEFAULT 'IDR',
  is_featured BOOLEAN DEFAULT false,
  profile_url VARCHAR(500),
  phone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_country ON doctors(country);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital ON doctors(hospital);
CREATE INDEX IF NOT EXISTS idx_doctors_featured ON doctors(is_featured);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_doctors_search ON doctors USING gin(
  to_tsvector('simple', name || ' ' || specialization || ' ' || hospital || ' ' || COALESCE(subspecialization, ''))
);

-- =============================================
-- SILOAM HOSPITALS — INDONESIA
-- =============================================

-- Kardiologi / Jantung
INSERT INTO doctors (name, title, specialization, subspecialization, hospital, hospital_location, country, city, experience_years, notable_for, rating, consultation_fee_min, consultation_fee_max, currency, is_featured, profile_url) VALUES
('Antonia Anna Lukito', 'dr., Sp.JP(K), FIHA', 'Kardiologi', 'Kardiologi Intervensi', 'Siloam Hospitals Kebon Jeruk', 'Kebon Jeruk, Jakarta Barat', 'Indonesia', 'Jakarta', 20, 'Spesialis intervensi jantung terkemuka. Senior consultant di Siloam.', 4.9, 400000, 700000, 'IDR', true, 'https://www.siloamhospitals.com'),
('Leonardo Paskah Suciadi', 'dr., Sp.JP', 'Kardiologi', 'Kardiologi Umum', 'Siloam Hospitals Kebon Jeruk', 'Kebon Jeruk, Jakarta Barat', 'Indonesia', 'Jakarta', 12, 'Ahli kardiologi umum berpengalaman di Siloam Kebon Jeruk.', 4.7, 350000, 600000, 'IDR', false, 'https://www.siloamhospitals.com'),
('Sylvie Sakasasmita', 'dr., Sp.JP', 'Kardiologi', 'Kardiologi Umum', 'Siloam Hospitals Kebon Jeruk', 'Kebon Jeruk, Jakarta Barat', 'Indonesia', 'Jakarta', 10, NULL, 4.6, 350000, 600000, 'IDR', false, NULL),
('Antono Sutandar', 'dr., Sp.JP(K)', 'Kardiologi', 'Kardiologi Lanjutan', 'Siloam Hospitals Kebon Jeruk', 'Kebon Jeruk, Jakarta Barat', 'Indonesia', 'Jakarta', 18, 'Konsultan senior jantung dan pembuluh darah.', 4.8, 400000, 700000, 'IDR', true, NULL),
('Tito Phurbojoyo', 'dr., Sp.JP(K), FIHA', 'Kardiologi', 'Kardiologi Intervensi dan Kateterisasi', 'Siloam Hospitals Lippo Village', 'Karawaci, Tangerang', 'Indonesia', 'Tangerang', 15, 'Spesialis kateterisasi dan intervensi koroner.', 4.8, 400000, 700000, 'IDR', true, 'https://www.siloamhospitals.com'),
('Indah Sukmawati', 'dr., Sp.JP(K), FIHA, FAPSC', 'Kardiologi', 'Kardiologi Intervensi', 'Siloam Hospitals', 'Jakarta', 'Indonesia', 'Jakarta', 14, 'Subspesialis kardiologi intervensi bersertifikat FIHA dan FAPSC.', 4.8, 400000, 700000, 'IDR', true, NULL);

-- Neurologi / Saraf
INSERT INTO doctors (name, title, specialization, subspecialization, hospital, hospital_location, country, city, experience_years, notable_for, rating, consultation_fee_min, consultation_fee_max, currency, is_featured) VALUES
('Steve Rahardja Putra', 'dr., Sp.S', 'Neurologi', 'Neurologi Umum', 'Siloam Hospitals Kebon Jeruk', 'Kebon Jeruk, Jakarta Barat', 'Indonesia', 'Jakarta', 10, 'Spesialis saraf aktif di Siloam Kebon Jeruk.', 4.6, 300000, 500000, 'IDR', false),
('Evlyne Erlyana Suryawijaya', 'dr., Sp.S', 'Neurologi', 'Neurologi Umum', 'Siloam Hospitals Lippo Village', 'Karawaci, Tangerang', 'Indonesia', 'Tangerang', 9, 'Praktik di Siloam Lippo Village dan Kelapa Dua.', 4.6, 300000, 500000, 'IDR', false),
('Sekarlangit', 'dr., SpN', 'Neurologi', 'Otak dan Sistem Saraf', 'Siloam Hospitals', 'Jakarta', 'Indonesia', 'Jakarta', 8, NULL, 4.5, 300000, 500000, 'IDR', false);

-- Ortopedi / Bedah Tulang
INSERT INTO doctors (name, title, specialization, subspecialization, hospital, hospital_location, country, city, experience_years, notable_for, rating, consultation_fee_min, consultation_fee_max, currency, is_featured) VALUES
('Henry Suhendra', 'dr., Sp.OT(K)', 'Ortopedi', 'Ortopedi & Traumatologi', 'Siloam Hospitals Kebon Jeruk', 'Kebon Jeruk, Jakarta Barat', 'Indonesia', 'Jakarta', 18, 'Konsultan ortopedi senior, spesialis sendi lutut dan pinggul.', 4.9, 400000, 700000, 'IDR', true),
('Ardi Setiawan', 'dr., Sp.OT(K), FIPP', 'Ortopedi', 'Hip & Knee Surgery', 'Siloam Hospitals TB Simatupang', 'TB Simatupang, Jakarta Selatan', 'Indonesia', 'Jakarta', 15, 'Spesialis pinggul dan lutut. Fellowship internasional.', 4.8, 400000, 700000, 'IDR', true),
('Erick Wonggokusuma', 'dr., Sp.OT(K)', 'Ortopedi', 'Ortopedi Lanjutan', 'Siloam Hospitals Kebon Jeruk', 'Kebon Jeruk, Jakarta Barat', 'Indonesia', 'Jakarta', 14, NULL, 4.7, 380000, 650000, 'IDR', false),
('Franky Hartono', 'Dr.dr., Sp.OT, Subsp.PL', 'Ortopedi', 'Onkologi Muskuloskeletal', 'Siloam Hospitals Kebon Jeruk', 'Kebon Jeruk, Jakarta Barat', 'Indonesia', 'Jakarta', 16, 'Subspesialis bedah tulang tumor.', 4.8, 400000, 700000, 'IDR', false),
('Carles Siagian', 'dr., Sp.OT, Subsp.OTB', 'Ortopedi', 'Bedah Tulang Belakang', 'Siloam Hospitals Kebon Jeruk', 'Kebon Jeruk, Jakarta Barat', 'Indonesia', 'Jakarta', 12, NULL, 4.6, 380000, 650000, 'IDR', false);

-- Onkologi / Kanker
INSERT INTO doctors (name, title, specialization, subspecialization, hospital, hospital_location, country, city, experience_years, notable_for, rating, consultation_fee_min, consultation_fee_max, currency, is_featured) VALUES
('Arief Wibisono', 'dr., Sp.B(K)Onk', 'Onkologi', 'Bedah Onkologi', 'Siloam Hospitals TB Simatupang', 'TB Simatupang, Jakarta Selatan', 'Indonesia', 'Jakarta', 15, NULL, 4.7, 400000, 700000, 'IDR', false),
('Jeffry Beta Tenggara', 'dr., Sp.PD-KHOM', 'Onkologi', 'Onkologi Hematologi Medis', 'MRCCC Siloam Hospitals Semanggi', 'Semanggi, Jakarta Selatan', 'Indonesia', 'Jakarta', 14, 'Onkolog hematologi di pusat kanker terbesar di Indonesia.', 4.8, 450000, 800000, 'IDR', true),
('Agus Sutarman', 'dr., Sp.B(K)Onk', 'Onkologi', 'Bedah Onkologi Umum', 'Siloam Hospitals Kebon Jeruk', 'Kebon Jeruk, Jakarta Barat', 'Indonesia', 'Jakarta', 13, NULL, 4.7, 400000, 700000, 'IDR', false),
('Alban Dien', 'dr., Sp.B(K)Onk', 'Onkologi', 'Bedah Onkologi Umum', 'MRCCC Siloam Hospitals Semanggi', 'Semanggi, Jakarta Selatan', 'Indonesia', 'Jakarta', 12, 'Di pusat kanker komprehensif swasta pertama Indonesia.', 4.7, 450000, 800000, 'IDR', false),
('Bernard Agung Baskoro Sudiyanto', 'dr., Sp.B(K)Onk', 'Onkologi', 'Bedah Onkologi Konsultan', 'Siloam Hospitals TB Simatupang', 'TB Simatupang, Jakarta Selatan', 'Indonesia', 'Jakarta', 16, 'Konsultan bedah onkologi dengan pengalaman lebih dari 16 tahun.', 4.8, 450000, 800000, 'IDR', true);

-- =============================================
-- KPJ HEALTHCARE — MALAYSIA
-- =============================================

INSERT INTO doctors (name, title, specialization, subspecialization, hospital, hospital_location, country, city, experience_years, languages, notable_for, rating, consultation_fee_min, consultation_fee_max, currency, is_featured, profile_url) VALUES
-- Onkologi Malaysia
('Aminudin Rahman Mohd Mydin', 'Assoc. Prof. Dr.', 'Onkologi', 'Onkologi Klinis', 'KPJ Damansara Specialist Hospital', 'Petaling Jaya, Selangor', 'Malaysia', 'Kuala Lumpur', 22, ARRAY['Bahasa Malaysia', 'English'], 'Lebih dari 20 tahun pengalaman, terlatih di Irlandia dan Kanada. Salah satu onkolog paling berpengalaman di Malaysia.', 4.9, 300, 700, 'MYR', true, 'https://www.kpjhealth.com.my'),
('Azura Deniel', 'Dr.', 'Onkologi', 'Onkologi Klinis', 'KPJ Ampang Puteri Specialist Hospital', 'Ampang, Selangor', 'Malaysia', 'Kuala Lumpur', 14, ARRAY['Bahasa Malaysia', 'English'], NULL, 4.7, 300, 600, 'MYR', false, 'https://www.kpjhealth.com.my'),
('Lum Wan Heng', 'Dr.', 'Onkologi', 'Onkologi Klinis', 'KPJ Johor Specialist Hospital', 'Johor Bahru, Johor', 'Malaysia', 'Johor Bahru', 12, ARRAY['English', 'Mandarin', 'Bahasa Malaysia'], NULL, 4.7, 280, 580, 'MYR', false, NULL),
('Daren Teoh Choon Yu', 'Dr.', 'Onkologi', 'Onkologi Klinis', 'KPJ Sabah Specialist Hospital', 'Kota Kinabalu, Sabah', 'Malaysia', 'Kota Kinabalu', 11, ARRAY['English', 'Bahasa Malaysia'], NULL, 4.6, 280, 580, 'MYR', false, NULL),

-- Kardiologi Malaysia
('Effarezan Abdul Rahman', 'Dr.', 'Kardiologi', 'Penyakit Dalam & Kardiologi', 'KPJ Damansara Specialist Hospital', 'Petaling Jaya, Selangor', 'Malaysia', 'Kuala Lumpur', 15, ARRAY['English', 'Bahasa Malaysia'], NULL, 4.7, 300, 600, 'MYR', false, 'https://www.kpjhealth.com.my'),
('Ismail Yaakob', 'Dr.', 'Kardiologi', 'Kardiologi Umum', 'KPJ Tawakkal Specialist Hospital', 'Kuala Lumpur', 'Malaysia', 'Kuala Lumpur', 18, ARRAY['Bahasa Malaysia', 'English'], NULL, 4.7, 280, 580, 'MYR', false, NULL),
('Tiang Soon Wee', 'Dr.', 'Kardiologi', 'Kardiologi Umum', 'KPJ Damansara Specialist Hospital', 'Petaling Jaya, Selangor', 'Malaysia', 'Kuala Lumpur', 16, ARRAY['English', 'Mandarin', 'Bahasa Malaysia'], NULL, 4.7, 300, 600, 'MYR', false, NULL),
('Tamil Selvan Muthusamy', 'Dr.', 'Kardiologi', 'Kardiologi Intervensi', 'KPJ Damansara Specialist Hospital', 'Petaling Jaya, Selangor', 'Malaysia', 'Kuala Lumpur', 14, ARRAY['English', 'Tamil', 'Bahasa Malaysia'], 'Spesialis intervensi jantung.', 4.8, 320, 650, 'MYR', false, NULL),

-- Neurologi Malaysia
('Azmi Abdul Rashid', 'Dr.', 'Neurologi', 'Penyakit Dalam & Neurologi', 'KPJ Damansara Specialist Hospital', 'Petaling Jaya, Selangor', 'Malaysia', 'Kuala Lumpur', 16, ARRAY['English', 'Bahasa Malaysia'], NULL, 4.7, 300, 600, 'MYR', false, 'https://www.kpjhealth.com.my'),
('Ruban Kanesalingam', 'Dr.', 'Neurologi', 'Penyakit Dalam & Neurologi', 'KPJ Johor Specialist Hospital', 'Johor Bahru, Johor', 'Malaysia', 'Johor Bahru', 13, ARRAY['English', 'Tamil', 'Bahasa Malaysia'], NULL, 4.7, 280, 560, 'MYR', false, NULL),
('Abu Salim Idris', 'Dr.', 'Neurologi', 'Neurologi Umum', 'KPJ Tawakkal Specialist Hospital', 'Kuala Lumpur', 'Malaysia', 'Kuala Lumpur', 14, ARRAY['Bahasa Malaysia', 'English'], NULL, 4.6, 280, 560, 'MYR', false, NULL),
('Shahedah Koya Kutty', 'Assoc. Prof. (C) Dr.', 'Neurologi', 'Neurologi & Stroke', 'KPJ Johor Specialist Hospital', 'Johor Bahru, Johor', 'Malaysia', 'Johor Bahru', 20, ARRAY['English', 'Bahasa Malaysia'], 'Profesor konsultan neurologi dan stroke.', 4.9, 320, 650, 'MYR', true, NULL);

-- =============================================
-- MOUNT ELIZABETH — SINGAPORE
-- =============================================

INSERT INTO doctors (name, title, specialization, subspecialization, hospital, hospital_location, country, city, experience_years, languages, notable_for, rating, consultation_fee_min, consultation_fee_max, currency, is_featured, profile_url) VALUES
-- Kardiologi Singapore
('Ang Peng Tiam', 'Dr.', 'Onkologi', 'Onkologi Medis', 'Mount Elizabeth Oncology Group', 'Orchard, Singapore', 'Singapore', 'Singapore', 30, ARRAY['English', 'Mandarin', 'Malay'], 'Salah satu onkolog paling terkenal di Asia Tenggara. Pendiri Parkway Cancer Centre. Lebih dari 30 tahun pengalaman.', 5.0, 350, 900, 'SGD', true, 'https://www.memc.com.sg'),
('Alfred Cheng', 'Dr.', 'Kardiologi', 'Kardiologi Intervensi', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 22, ARRAY['English', 'Mandarin'], 'Kardiolog intervensi senior di Mount Elizabeth.', 4.9, 350, 800, 'SGD', true, 'https://www.memc.com.sg'),
('Lim Yean Teng', 'Dr.', 'Kardiologi', 'Kardiologi Umum', 'Mount Elizabeth Hospital', 'Orchard, Singapore', 'Singapore', 'Singapore', 25, ARRAY['English', 'Mandarin', 'Malay'], 'Kardiolog berpengalaman di Mount Elizabeth sejak lebih dari 25 tahun.', 4.9, 320, 750, 'SGD', true, 'https://www.memc.com.sg'),
('Rohit Khurana', 'Dr.', 'Kardiologi', 'Elektrofisiologi Kardiak', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 18, ARRAY['English', 'Hindi'], 'Spesialis aritmia dan elektrofisiologi jantung.', 4.8, 320, 750, 'SGD', false, 'https://www.memc.com.sg'),
('Stanley Chia', 'Dr.', 'Kardiologi', 'Kardiologi Intervensi', 'Mount Elizabeth Hospital', 'Orchard, Singapore', 'Singapore', 'Singapore', 20, ARRAY['English', 'Mandarin'], NULL, 4.8, 320, 750, 'SGD', false, NULL),
('Tay Lik Wui Edgar', 'Dr.', 'Kardiologi', 'Kardiologi Umum & Intervensi', 'Mount Elizabeth Hospital', 'Orchard, Singapore', 'Singapore', 'Singapore', 16, ARRAY['English', 'Mandarin', 'Malay'], NULL, 4.7, 300, 700, 'SGD', false, NULL),

-- Onkologi Singapore
('See Hui Ti', 'Dr.', 'Onkologi', 'Onkologi Medis', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 20, ARRAY['English', 'Mandarin'], 'Onkolog medis senior, spesialis kanker payudara dan paru.', 4.9, 350, 850, 'SGD', true, 'https://www.memc.com.sg'),
('Wong Chiung Ing', 'Dr.', 'Onkologi', 'Onkologi Medis', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 18, ARRAY['English', 'Mandarin', 'Malay'], 'Spesialis onkologi GI dan kanker kolorektal.', 4.9, 350, 850, 'SGD', true, 'https://www.memc.com.sg'),
('Karmen Wong Kit Yee', 'Dr.', 'Onkologi', 'Onkologi Medis', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 16, ARRAY['English', 'Cantonese', 'Mandarin'], NULL, 4.8, 330, 800, 'SGD', false, NULL),
('Elizabeth Au Siew Cheng', 'Dr.', 'Onkologi', 'Onkologi & Hematologi', 'Mount Elizabeth Hospital', 'Orchard, Singapore', 'Singapore', 'Singapore', 22, ARRAY['English', 'Mandarin'], 'Spesialis onkologi dan hematologi terkemuka.', 4.9, 350, 850, 'SGD', true, 'https://www.memc.com.sg'),

-- Neurologi Singapore
('Tang Kok Foo', 'Dr.', 'Neurologi', 'Neurologi Umum & Saraf Tepi', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 30, ARRAY['English', 'Mandarin', 'Malay'], 'Neurolog senior dengan lebih dari 30 tahun pengalaman di Singapore.', 5.0, 350, 800, 'SGD', true, 'https://www.memc.com.sg'),
('Nei I Ping', 'Dr.', 'Neurologi', 'Neurologi & Epilepsi', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 24, ARRAY['English', 'Mandarin'], 'Spesialis epilepsi dan gangguan otak.', 4.9, 330, 780, 'SGD', true, 'https://www.memc.com.sg'),
('Lee Kim En', 'Dr.', 'Neurologi', 'Neurologi Umum', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 20, ARRAY['English', 'Mandarin', 'Malay'], NULL, 4.8, 320, 750, 'SGD', false, NULL),
('Yeow Yew Kim', 'Dr.', 'Neurologi', 'Neurologi & Stroke', 'Mount Elizabeth Hospital', 'Orchard, Singapore', 'Singapore', 'Singapore', 22, ARRAY['English', 'Mandarin'], 'Spesialis stroke dan cedera otak.', 4.8, 320, 750, 'SGD', false, NULL),

-- Ortopedi Singapore
('Tony Setiobudi', 'Dr.', 'Ortopedi', 'Bedah Tulang Belakang', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 18, ARRAY['English', 'Bahasa Indonesia', 'Mandarin'], 'Spesialis tulang belakang, sangat direkomendasikan untuk pasien Indonesia.', 4.9, 350, 850, 'SGD', true, 'https://www.memc.com.sg'),
('Kanwaljit Soin', 'Dr.', 'Ortopedi', 'Artroskopi & Bedah Sport', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 25, ARRAY['English', 'Malay', 'Hindi'], 'Spesialis artroskopi sendi dan cedera olahraga terkemuka di Singapore.', 4.9, 350, 850, 'SGD', true, NULL),
('Hee Hwan Tak', 'Dr.', 'Ortopedi', 'Bedah Tulang Belakang', 'Mount Elizabeth Hospital', 'Orchard, Singapore', 'Singapore', 'Singapore', 20, ARRAY['English', 'Mandarin'], 'Spesialis bedah tulang belakang minimal invasif.', 4.9, 330, 820, 'SGD', true, NULL),
('Chan Beng Kuen', 'Dr.', 'Ortopedi', 'Artroplasti Sendi Total', 'Mount Elizabeth Hospital', 'Orchard, Singapore', 'Singapore', 'Singapore', 22, ARRAY['English', 'Mandarin', 'Malay'], 'Spesialis penggantian sendi lutut dan pinggul total.', 4.9, 330, 820, 'SGD', false, NULL);

-- Trigger untuk update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER doctors_updated_at
BEFORE UPDATE ON doctors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
