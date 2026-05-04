#!/usr/bin/env node
/**
 * Backfill: encrypt every legacy plaintext NIK in public.person.
 *
 * Workflow after deploying migration_v14_ktp_encryption.sql:
 *   1. Set KTP_ENCRYPTION_KEY and KTP_HASH_KEY in the env (same values
 *      that production uses — keys must be stable forever).
 *   2. Run:  node scripts/backfill-encrypt-nik.mjs
 *   3. Once 0 plaintext rows remain, you can safely drop the legacy
 *      `id_card` column in a follow-up migration.
 *
 * Re-running is safe: rows already populated (id_card_encrypted IS NOT NULL)
 * are skipped. Errors on individual rows are logged and the run continues.
 */

import { createRequire } from "node:module";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const require = createRequire(import.meta.url);
const { Pool } = require("pg");

// Avoid pulling in the @/ alias machinery — just inline what we need.
async function loadEncryption() {
    const mod = await import("../src/lib/encryption.ts").catch(() => null);
    if (mod) return mod;
    // Fallback: ts not directly importable in plain node. Tell the user.
    throw new Error(
        "Run via: pnpm tsx scripts/backfill-encrypt-nik.mjs " +
        "(or: npx tsx scripts/backfill-encrypt-nik.mjs)",
    );
}

const BATCH = 200;

async function main() {
    const { encryptNik, hashNik } = await loadEncryption();

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not set");
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        const { rows: countRows } = await client.query(
            "SELECT COUNT(*)::int AS n FROM public.person WHERE id_card IS NOT NULL AND id_card_encrypted IS NULL",
        );
        const total = countRows[0].n;
        console.log(`Rows to backfill: ${total}`);
        if (total === 0) {
            console.log("Nothing to do.");
            return;
        }

        let done = 0;
        let failed = 0;

        // Loop in batches by primary key so we don't lock the whole table.
        // person.id_card is plaintext — hashNik will index it.
        while (true) {
            const { rows } = await client.query(
                `SELECT person_id, id_card
                   FROM public.person
                  WHERE id_card IS NOT NULL
                    AND id_card_encrypted IS NULL
                  ORDER BY person_id
                  LIMIT $1`,
                [BATCH],
            );
            if (rows.length === 0) break;

            for (const r of rows) {
                const nik = String(r.id_card).trim();
                if (!nik) {
                    failed++;
                    continue;
                }
                try {
                    const encrypted = encryptNik(nik);
                    const hash = hashNik(nik);
                    await client.query(
                        `UPDATE public.person
                            SET id_card_encrypted = $2,
                                id_card_hash      = $3
                          WHERE person_id = $1`,
                        [r.person_id, encrypted, hash],
                    );
                    done++;
                } catch (err) {
                    failed++;
                    console.error(`  ✗ person_id=${r.person_id}:`, err.message);
                }
            }
            console.log(`  …${done}/${total} encrypted (${failed} failed)`);
        }

        console.log(`\nDone. encrypted=${done} failed=${failed}`);
        if (failed > 0) process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
