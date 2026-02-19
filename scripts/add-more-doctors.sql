-- Migration: Add more doctors — Thailand, India, and additional Indonesia/Malaysia/Singapore specialists
-- Run this after migrate-doctors.sql

-- =============================================
-- INDONESIA — Additional Specialists
-- =============================================

INSERT INTO doctors (name, title, specialization, subspecialization, hospital, hospital_location, country, city, experience_years, languages, notable_for, rating, consultation_fee_min, consultation_fee_max, currency, is_featured, profile_url) VALUES

-- Oftalmologi Indonesia
('Johan Hutauruk', 'dr., Sp.M(K)', 'Oftalmologi', 'Retina & Vitreous', 'JEC Eye Hospitals & Clinics', 'Menteng, Jakarta Pusat', 'Indonesia', 'Jakarta', 22, ARRAY['Indonesia', 'English'], 'Spesialis retina terkemuka. Konsultan JEC Jakarta sejak lebih dari 20 tahun.', 4.9, 400000, 800000, 'IDR', true, 'https://www.jec.co.id'),
('Shanti Darmastuti', 'dr., Sp.M(K)', 'Oftalmologi', 'Glaukoma', 'JEC Eye Hospitals & Clinics', 'Menteng, Jakarta Pusat', 'Indonesia', 'Jakarta', 18, ARRAY['Indonesia', 'English'], 'Subspesialis glaukoma dan katarak.', 4.8, 400000, 750000, 'IDR', false, 'https://www.jec.co.id'),
('Bonang Widjanarko', 'dr., Sp.M', 'Oftalmologi', 'Bedah Refraktif & LASIK', 'JEC Eye Hospitals & Clinics', 'Menteng, Jakarta Pusat', 'Indonesia', 'Jakarta', 15, ARRAY['Indonesia', 'English'], NULL, 4.7, 350000, 700000, 'IDR', false, NULL),

-- Pediatri Indonesia
('Hardiono Pusponegoro', 'dr., Sp.A(K)', 'Pediatri', 'Neurologi Anak', 'RSAB Harapan Kita', 'Slipi, Jakarta Barat', 'Indonesia', 'Jakarta', 30, ARRAY['Indonesia', 'English'], 'Guru besar dan konsultan neurologi anak paling senior di Indonesia.', 5.0, 500000, 900000, 'IDR', true, NULL),
('Jose Remcho Leonardus Batubara', 'Prof. Dr. dr., Sp.A(K), PhD', 'Pediatri', 'Endokrinologi Anak', 'RSCM / FKUI', 'Salemba, Jakarta Pusat', 'Indonesia', 'Jakarta', 28, ARRAY['Indonesia', 'English'], 'Guru besar endokrinologi anak. Peneliti dan dokter klinis terkemuka Indonesia.', 5.0, 450000, 850000, 'IDR', true, NULL),
('Irawan Mangunatmadja', 'dr., Sp.A(K)', 'Pediatri', 'Neurologi Anak', 'RS Pondok Indah', 'Pondok Indah, Jakarta Selatan', 'Indonesia', 'Jakarta', 20, ARRAY['Indonesia', 'English'], NULL, 4.8, 400000, 750000, 'IDR', false, NULL),

-- Gastroenterologi Indonesia
('Marcellus Simadibrata', 'Prof. Dr. dr., Sp.PD-KGEH', 'Gastroenterologi', 'Hepatologi & Gastroenterologi', 'RSCM / FKUI', 'Salemba, Jakarta Pusat', 'Indonesia', 'Jakarta', 30, ARRAY['Indonesia', 'English'], 'Pakar gastroenterologi dan hepatologi paling terkenal di Indonesia. Ketua berbagai perhimpunan medis.', 5.0, 500000, 1000000, 'IDR', true, NULL),
('Herry Koesno', 'dr., Sp.PD-KGEH', 'Gastroenterologi', 'Hepatologi', 'RS Cipto Mangunkusumo', 'Salemba, Jakarta Pusat', 'Indonesia', 'Jakarta', 20, ARRAY['Indonesia', 'English'], NULL, 4.7, 400000, 750000, 'IDR', false, NULL),

-- Urologi Indonesia
('Nur Rasyid', 'dr., Sp.U(K)', 'Urologi', 'Bedah Urologi Onkologi', 'RSCM / FKUI', 'Salemba, Jakarta Pusat', 'Indonesia', 'Jakarta', 22, ARRAY['Indonesia', 'English'], 'Konsultan urologi onkologi, spesialis kanker prostat dan ginjal.', 4.8, 450000, 800000, 'IDR', true, NULL),
('Wahyu Agustian Rusminan', 'dr., Sp.U', 'Urologi', 'Urologi Umum', 'Siloam Hospitals Kebon Jeruk', 'Kebon Jeruk, Jakarta Barat', 'Indonesia', 'Jakarta', 12, ARRAY['Indonesia', 'English'], NULL, 4.6, 350000, 650000, 'IDR', false, NULL);

-- =============================================
-- MALAYSIA — Additional Specialists
-- =============================================

INSERT INTO doctors (name, title, specialization, subspecialization, hospital, hospital_location, country, city, experience_years, languages, notable_for, rating, consultation_fee_min, consultation_fee_max, currency, is_featured, profile_url) VALUES

-- Oftalmologi Malaysia
('Choong Yean Ying', 'Dr.', 'Oftalmologi', 'Katarak & Bedah Refraktif', 'Gleneagles Hospital Kuala Lumpur', 'Kuala Lumpur', 'Malaysia', 'Kuala Lumpur', 20, ARRAY['English', 'Mandarin', 'Bahasa Malaysia'], 'Spesialis katarak dan bedah refraktif LASIK terkemuka di Malaysia.', 4.9, 300, 800, 'MYR', true, 'https://www.gleneagles.com.my'),
('Yip Weng Keong', 'Dr.', 'Oftalmologi', 'Glaukoma & Katarak', 'Sunway Medical Centre', 'Subang Jaya, Selangor', 'Malaysia', 'Kuala Lumpur', 15, ARRAY['English', 'Mandarin', 'Bahasa Malaysia'], NULL, 4.7, 250, 650, 'MYR', false, NULL),

-- Ortopedi Malaysia
('Fazir Mokhtar', 'Dr.', 'Ortopedi', 'Artroplasti Sendi', 'Prince Court Medical Centre', 'Kuala Lumpur', 'Malaysia', 'Kuala Lumpur', 20, ARRAY['Bahasa Malaysia', 'English'], 'Spesialis penggantian sendi lutut dan pinggul. Fellowship dari UK.', 4.8, 320, 700, 'MYR', true, 'https://www.princecourt.com'),
('G. Sashindran', 'Dr.', 'Ortopedi', 'Tulang Belakang & Sport', 'Pantai Hospital Kuala Lumpur', 'Bangsar, Kuala Lumpur', 'Malaysia', 'Kuala Lumpur', 18, ARRAY['English', 'Tamil', 'Bahasa Malaysia'], 'Spesialis cedera olahraga dan bedah tulang belakang.', 4.8, 300, 700, 'MYR', false, NULL),

-- Kardiologi Malaysia
('Khoo Kay Leong', 'Dr.', 'Kardiologi', 'Kardiologi Intervensi', 'Prince Court Medical Centre', 'Kuala Lumpur', 'Malaysia', 'Kuala Lumpur', 28, ARRAY['English', 'Mandarin', 'Bahasa Malaysia'], 'Salah satu kardiolog intervensi paling berpengalaman di Malaysia. Fellowship dari UK dan Australia.', 5.0, 400, 900, 'MYR', true, 'https://www.princecourt.com'),
('David Chew Soon Ping', 'Dr.', 'Kardiologi', 'Kardiologi Umum & Intervensi', 'Gleneagles Hospital Kuala Lumpur', 'Kuala Lumpur', 'Malaysia', 'Kuala Lumpur', 22, ARRAY['English', 'Mandarin', 'Malay'], NULL, 4.8, 350, 800, 'MYR', false, NULL),

-- Pediatri Malaysia
('Jeevanan Jeyaprakash', 'Dr.', 'Pediatri', 'Pediatri Umum & Neonatologi', 'Columbia Asia Hospital Seremban', 'Seremban, Negeri Sembilan', 'Malaysia', 'Seremban', 14, ARRAY['English', 'Tamil', 'Bahasa Malaysia'], NULL, 4.6, 200, 500, 'MYR', false, NULL),
('Loh Chee Cheong', 'Dr.', 'Pediatri', 'Bedah Pediatri', 'UMMC / University Hospital', 'Petaling Jaya, Selangor', 'Malaysia', 'Kuala Lumpur', 20, ARRAY['English', 'Mandarin', 'Bahasa Malaysia'], 'Pakar bedah pediatri terkemuka Malaysia.', 4.9, 300, 700, 'MYR', true, NULL);

-- =============================================
-- SINGAPORE — Additional Specialists
-- =============================================

INSERT INTO doctors (name, title, specialization, subspecialization, hospital, hospital_location, country, city, experience_years, languages, notable_for, rating, consultation_fee_min, consultation_fee_max, currency, is_featured, profile_url) VALUES

-- Pediatri Singapore
('Leong Hoe Nam', 'Dr.', 'Penyakit Infeksi', 'Penyakit Infeksi Tropis', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 18, ARRAY['English', 'Mandarin', 'Malay'], 'Pakar infeksius terkemuka, sering dikutip media untuk COVID-19 dan dengue di Asia.', 4.9, 300, 750, 'SGD', true, 'https://www.memc.com.sg'),
('Low Cze Hong', 'Dr.', 'Pediatri', 'Pediatri Umum', 'Thomson Medical Centre', 'Novena, Singapore', 'Singapore', 'Singapore', 16, ARRAY['English', 'Mandarin', 'Malay'], NULL, 4.7, 200, 550, 'SGD', false, NULL),

-- Dermatologi Singapore
('Tan Hiok Hee', 'Dr.', 'Dermatologi', 'Dermatologi Umum & Kosmetik', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 25, ARRAY['English', 'Mandarin', 'Malay'], 'Konsultan dermatologi senior, spesialis kondisi kulit kompleks dan prosedur kosmetik.', 4.9, 250, 650, 'SGD', true, 'https://www.memc.com.sg'),
('Tey Hong Liang', 'Dr.', 'Dermatologi', 'Dermatologi Medis', 'National Skin Centre / Gleneagles', 'Singapore', 'Singapore', 'Singapore', 18, ARRAY['English', 'Mandarin'], 'Ahli dermatologi medis, peneliti aktif di NSC.', 4.8, 220, 600, 'SGD', false, NULL),

-- Gastroenterologi Singapore
('Gwee Kok Ann', 'Dr.', 'Gastroenterologi', 'Gastroenterologi & Hepatologi', 'Mount Elizabeth Novena Hospital', 'Novena, Singapore', 'Singapore', 'Singapore', 25, ARRAY['English', 'Mandarin'], 'Spesialis endoskopi dan penyakit saluran cerna. Profesor klinis di NUS.', 4.9, 300, 750, 'SGD', true, 'https://www.mountelizabeth.com.sg'),
('Christopher Khor Jin Liang', 'Dr.', 'Gastroenterologi', 'Koloproktologi', 'Mount Elizabeth Medical Centre', 'Orchard, Singapore', 'Singapore', 'Singapore', 20, ARRAY['English', 'Mandarin'], 'Spesialis bedah kolorektral dan penyakit anorektal.', 4.8, 280, 700, 'SGD', false, NULL);

-- =============================================
-- THAILAND — Bumrungrad & Bangkok Hospital
-- =============================================

INSERT INTO doctors (name, title, specialization, subspecialization, hospital, hospital_location, country, city, experience_years, languages, notable_for, rating, consultation_fee_min, consultation_fee_max, currency, is_featured, profile_url) VALUES

-- Kardiologi Thailand
('Smonporn Boonyaratavej', 'Prof. Dr.', 'Kardiologi', 'Kardiologi Elektrofisiologi', 'Bumrungrad International Hospital', 'Sukhumvit, Bangkok', 'Thailand', 'Bangkok', 28, ARRAY['Thai', 'English'], 'Guru besar dan kepala divisi elektrofisiologi di Bumrungrad. Salah satu yang terbaik di Asia.', 5.0, 3000, 8000, 'THB', true, 'https://www.bumrungrad.com'),
('Pinyong Thanattiraporn', 'Dr.', 'Kardiologi', 'Kardiologi Intervensi', 'Bumrungrad International Hospital', 'Sukhumvit, Bangkok', 'Thailand', 'Bangkok', 18, ARRAY['Thai', 'English'], 'Spesialis kardiologi intervensi dengan fellowship Amerika.', 4.8, 2500, 7000, 'THB', false, 'https://www.bumrungrad.com'),
('Wanchai Silaruks', 'Dr.', 'Kardiologi', 'Kardiologi Umum', 'Bangkok Hospital', 'Phetchaburi, Bangkok', 'Thailand', 'Bangkok', 20, ARRAY['Thai', 'English'], NULL, 4.7, 2000, 6000, 'THB', false, 'https://www.bangkokhospital.com'),

-- Onkologi Thailand
('Suda Vanadurongwan', 'Dr.', 'Onkologi', 'Onkologi Klinis & Radio', 'Bumrungrad International Hospital', 'Sukhumvit, Bangkok', 'Thailand', 'Bangkok', 22, ARRAY['Thai', 'English'], 'Spesialis radioterapi dan onkologi klinis. Fellowship dari UK.', 4.9, 3000, 8000, 'THB', true, 'https://www.bumrungrad.com'),
('Shanop Shuangshoti', 'Prof. Dr.', 'Onkologi', 'Neuropatologi & Onkologi Otak', 'Bumrungrad International Hospital', 'Sukhumvit, Bangkok', 'Thailand', 'Bangkok', 25, ARRAY['Thai', 'English'], 'Pakar neuropatologi dan tumor otak, guru besar di Chulalongkorn University.', 4.9, 3500, 9000, 'THB', true, NULL),

-- Ortopedi Thailand
('Kovit Chanlalit', 'Dr.', 'Ortopedi', 'Arthroplasti & Sport', 'Samitivej Sukhumvit Hospital', 'Sukhumvit, Bangkok', 'Thailand', 'Bangkok', 20, ARRAY['Thai', 'English'], 'Spesialis penggantian sendi dan cedera olahraga, fellowship dari USA.', 4.8, 2500, 7000, 'THB', true, 'https://www.samitivej.co.th'),
('Naraporn Prayoonwiwat', 'Dr.', 'Neurologi', 'Multiple Sclerosis & Neurologi Imunologi', 'Siriraj Hospital / Bumrungrad', 'Bangkok', 'Thailand', 'Bangkok', 24, ARRAY['Thai', 'English'], 'Spesialis multiple sclerosis dan neurologi imunologi kelas dunia.', 4.9, 3000, 8000, 'THB', true, 'https://www.bumrungrad.com');

-- =============================================
-- INDIA — Apollo, Fortis & AIIMS
-- =============================================

INSERT INTO doctors (name, title, specialization, subspecialization, hospital, hospital_location, country, city, experience_years, languages, notable_for, rating, consultation_fee_min, consultation_fee_max, currency, is_featured, profile_url) VALUES

-- Kardiologi India
('Devi Prasad Shetty', 'Dr.', 'Kardiologi', 'Bedah Jantung', 'Narayana Health', 'Bommasandra, Bengaluru', 'India', 'Bengaluru', 35, ARRAY['English', 'Hindi', 'Kannada'], 'Salah satu ahli bedah jantung paling terkenal di dunia. Mendirikan Narayana Health untuk bedah jantung berbiaya rendah.', 5.0, 1500, 4000, 'INR', true, 'https://www.narayanahealth.org'),
('Ashok Seth', 'Prof. Dr.', 'Kardiologi', 'Kardiologi Intervensi', 'Fortis Escorts Heart Institute', 'Okhla, New Delhi', 'India', 'New Delhi', 35, ARRAY['English', 'Hindi'], 'Penerima Padma Bhushan. Pelopor kardiologi intervensi di India. Lebih dari 50.000 prosedur.', 5.0, 2000, 5000, 'INR', true, 'https://www.fortishealthcare.com'),
('P. Venugopal', 'Prof. Dr.', 'Kardiologi', 'Bedah Jantung', 'All India Institute of Medical Sciences (AIIMS)', 'Ansari Nagar, New Delhi', 'India', 'New Delhi', 40, ARRAY['English', 'Hindi', 'Malayalam'], 'Mantan direktur AIIMS. Lebih dari 40 tahun pengalaman bedah jantung.', 5.0, 2000, 5000, 'INR', true, NULL),

-- Onkologi India
('Shyam Aggarwal', 'Dr.', 'Onkologi', 'Onkologi Medis', 'Sir Ganga Ram Hospital', 'Rajinder Nagar, New Delhi', 'India', 'New Delhi', 28, ARRAY['English', 'Hindi'], 'Spesialis onkologi medis terkenal, fellowship dari MD Anderson USA.', 4.9, 1500, 4500, 'INR', true, 'https://www.sgrh.com'),
('Nirmala Bhoot', 'Dr.', 'Onkologi', 'Radioterapi', 'Apollo Hospitals', 'Sarita Vihar, New Delhi', 'India', 'New Delhi', 20, ARRAY['English', 'Hindi'], NULL, 4.7, 1200, 3500, 'INR', false, 'https://www.apollohospitals.com'),
('Suresh H. Advani', 'Prof. Dr.', 'Onkologi', 'Onkologi Hematologi', 'Jaslok Hospital & Research Centre', 'Pedder Road, Mumbai', 'India', 'Mumbai', 40, ARRAY['English', 'Hindi', 'Marathi'], 'Pelopor onkologi India. Lebih dari 40 tahun membentuk onkologi modern di India.', 5.0, 2000, 5000, 'INR', true, NULL),

-- Neurologi India
('Vinit Suri', 'Dr.', 'Neurologi', 'Neurologi Klinis & Stroke', 'Indraprastha Apollo Hospital', 'Sarita Vihar, New Delhi', 'India', 'New Delhi', 22, ARRAY['English', 'Hindi'], 'Spesialis stroke dan neurologi klinis, fellowship dari UK.', 4.8, 1500, 4000, 'INR', true, 'https://www.apollohospitals.com'),
('Shailesh M. Hadda', 'Dr.', 'Neurologi', 'Epilepsi & Elektroensefalografi', 'AIIMS New Delhi', 'Ansari Nagar, New Delhi', 'India', 'New Delhi', 18, ARRAY['English', 'Hindi'], NULL, 4.7, 1200, 3500, 'INR', false, NULL),

-- Ortopedi India
('Surya Bhan', 'Prof. Dr.', 'Ortopedi', 'Bedah Tulang Belakang', 'AIIMS New Delhi', 'Ansari Nagar, New Delhi', 'India', 'New Delhi', 35, ARRAY['English', 'Hindi'], 'Kepala ortopedi AIIMS New Delhi. Otoritas bedah tulang belakang di India.', 5.0, 2000, 5000, 'INR', true, NULL),
('Rajiv Thukral', 'Dr.', 'Ortopedi', 'Artroplasti Sendi Total', 'Fortis Memorial Research Institute', 'Gurugram, Haryana', 'India', 'Gurugram', 22, ARRAY['English', 'Hindi', 'Punjabi'], 'Spesialis penggantian sendi lutut dan pinggul dengan volume tertinggi di India Utara.', 4.9, 1500, 4500, 'INR', true, 'https://www.fortishealthcare.com'),

-- Oftalmologi India
('Lalit Verma', 'Prof. Dr.', 'Oftalmologi', 'Retina & Vitreoretina', 'Sir Ganga Ram Hospital', 'Rajinder Nagar, New Delhi', 'India', 'New Delhi', 30, ARRAY['English', 'Hindi'], 'Ahli retina terkemuka India. Lebih dari 10.000 operasi retina.', 5.0, 1500, 4000, 'INR', true, 'https://www.sgrh.com'),
('Mahipal Singh Sachdev', 'Dr.', 'Oftalmologi', 'LASIK & Bedah Refraktif', 'Centre for Sight', 'Dwarka, New Delhi', 'India', 'New Delhi', 28, ARRAY['English', 'Hindi'], 'Pelopor bedah LASIK di India. Fellowship dari USA dan Eropa.', 5.0, 1200, 3500, 'INR', true, 'https://www.centreforsight.net');
