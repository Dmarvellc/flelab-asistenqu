#!/usr/bin/env node
/**
 * Script untuk menambahkan/update data dokter baru secara manual
 * Run: node scripts/update-doctors.js
 * 
 * Untuk produksi: jadwalkan via cron job atau Vercel Cron
 * Contoh cron: 0 3 * * 0 (setiap Minggu jam 3 pagi)
 */

require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Format penambahan dokter baru:
 * Tambahkan entri ke array DOCTORS_TO_UPSERT di bawah ini.
 * 
 * Sumber data yang disarankan:
 * - Siloam: https://www.siloamhospitals.com/cari-dokter
 * - KPJ: https://www.kpjhealth.com.my/doctor-listing
 * - Mount Elizabeth: https://www.mountelizabeth.com.sg/our-doctors
 * - Parkway Cancer Centre: https://www.parkwaycancercentre.com/our-teams
 */
const DOCTORS_TO_UPSERT = [
    // ── TEMPLATE UNTUK DOKTER BARU ──
    // {
    //   name: "Nama Dokter",
    //   title: "dr., Sp.XX",
    //   specialization: "Kardiologi | Neurologi | Ortopedi | Onkologi | ...",
    //   subspecialization: "Sub-spesialisasi (opsional)",
    //   hospital: "Nama Rumah Sakit Lengkap",
    //   hospital_location: "Lokasi RS, Kota",
    //   country: "Indonesia | Malaysia | Singapore",
    //   city: "Kota",
    //   experience_years: 10,
    //   languages: ["Bahasa Indonesia", "English"],
    //   notable_for: "Keterangan singkat tentang keunggulan dokter ini",
    //   rating: 4.8,
    //   consultation_fee_min: 400000,
    //   consultation_fee_max: 700000,
    //   currency: "IDR | MYR | SGD",
    //   is_featured: false,
    //   profile_url: "https://url-profil-dokter.com",
    // },
];

async function upsertDoctors() {
    if (DOCTORS_TO_UPSERT.length === 0) {
        console.log("ℹ️  Tidak ada dokter baru yang ditambahkan.");
        console.log("📋 Tips: Tambah data dokter ke array DOCTORS_TO_UPSERT di atas lalu jalankan ulang script ini.");
        pool.end();
        return;
    }

    console.log(`🔄 Memproses ${DOCTORS_TO_UPSERT.length} dokter...`);
    let success = 0;
    let errors = 0;

    for (const doc of DOCTORS_TO_UPSERT) {
        try {
            await pool.query(
                `INSERT INTO doctors (
          name, title, specialization, subspecialization,
          hospital, hospital_location, country, city,
          experience_years, languages, notable_for, rating,
          consultation_fee_min, consultation_fee_max, currency,
          is_featured, profile_url
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (name, hospital) DO UPDATE SET
          title = EXCLUDED.title,
          specialization = EXCLUDED.specialization,
          subspecialization = EXCLUDED.subspecialization,
          hospital_location = EXCLUDED.hospital_location,
          experience_years = EXCLUDED.experience_years,
          languages = EXCLUDED.languages,
          notable_for = EXCLUDED.notable_for,
          rating = EXCLUDED.rating,
          consultation_fee_min = EXCLUDED.consultation_fee_min,
          consultation_fee_max = EXCLUDED.consultation_fee_max,
          currency = EXCLUDED.currency,
          is_featured = EXCLUDED.is_featured,
          profile_url = EXCLUDED.profile_url,
          updated_at = NOW()`,
                [
                    doc.name, doc.title, doc.specialization, doc.subspecialization,
                    doc.hospital, doc.hospital_location, doc.country, doc.city,
                    doc.experience_years, doc.languages, doc.notable_for, doc.rating,
                    doc.consultation_fee_min, doc.consultation_fee_max, doc.currency,
                    doc.is_featured, doc.profile_url,
                ]
            );
            console.log(`  ✅ ${doc.name} (${doc.hospital})`);
            success++;
        } catch (e) {
            console.error(`  ❌ ${doc.name}: ${e.message}`);
            errors++;
        }
    }

    // Summary stats
    const stats = await pool.query(
        `SELECT country, COUNT(*) as total FROM doctors GROUP BY country ORDER BY country`
    );
    console.log("\n📊 Statistik Database Dokter:");
    stats.rows.forEach(r => console.log(`  - ${r.country}: ${r.total} dokter`));

    const total = await pool.query(`SELECT COUNT(*) FROM doctors`);
    console.log(`  TOTAL: ${total.rows[0].count} dokter`);
    console.log(`\n✅ Berhasil: ${success} | ❌ Gagal: ${errors}`);

    pool.end();
}

upsertDoctors();
