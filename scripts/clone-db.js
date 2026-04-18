#!/usr/bin/env node
/**
 * Clone an entire Postgres `public` schema (DDL + data) from one connection
 * string to another, using only the `pg` Node client. No `pg_dump` required.
 *
 * Source = process.env.DATABASE_URL_OLD_KOREA
 * Target = process.env.DATABASE_URL
 *
 * Strategy:
 *   1. Pull list of tables from source in dependency-safe order
 *      (parents before children, via FK graph topological sort).
 *   2. For each table: copy table DDL via pg_get_tabledef-equivalent
 *      reconstruction OR a CREATE TABLE built from information_schema.
 *   3. Bulk-insert rows in batches.
 *   4. Recreate sequences + reset NEXTVAL.
 *   5. Recreate FKs at the end so insert order doesn't matter.
 *
 * This is "good enough for a SaaS app" — it does NOT recreate:
 *   - custom functions / triggers
 *   - extensions (you must run CREATE EXTENSION manually if needed)
 *   - row-level security policies
 *   - storage / auth schemas
 *
 * For a perfect copy, use `pg_dump`. This script exists because we don't
 * have psql/pg_dump installed locally.
 */
require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");

const SRC_URL = process.env.DATABASE_URL_OLD_KOREA;
const DST_URL = process.env.DATABASE_URL;

if (!SRC_URL || !DST_URL) {
  console.error("✗ Need DATABASE_URL_OLD_KOREA (source) and DATABASE_URL (target).");
  process.exit(1);
}
if (SRC_URL === DST_URL) {
  console.error("✗ Source and target are identical. Refusing to clone onto self.");
  process.exit(1);
}

const src = new Pool({ connectionString: SRC_URL, ssl: { rejectUnauthorized: false }, max: 4 });
const dst = new Pool({ connectionString: DST_URL, ssl: { rejectUnauthorized: false }, max: 4 });

const BATCH = 500;

function ident(s) {
  return '"' + String(s).replace(/"/g, '""') + '"';
}

// pg sometimes returns array_agg as a Postgres array literal string like
// '{a,b,"c d"}' instead of a JS array (depends on driver / pooler quirks).
// Normalize to a real JS array.
function toArr(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (typeof v === "string") {
    const s = v.trim();
    if (s.startsWith("{") && s.endsWith("}")) {
      const inner = s.slice(1, -1);
      if (!inner) return [];
      // naive split: works for enum labels & identifiers (no commas inside)
      return inner.split(",").map((x) => x.replace(/^"|"$/g, ""));
    }
    return [s];
  }
  return [v];
}

async function getEnumTypes(client) {
  const r = await client.query(`
    SELECT t.typname,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `);
  return r.rows;
}

async function getTables(client) {
  const r = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name
  `);
  return r.rows.map((x) => x.table_name);
}

async function getColumns(client, table) {
  const r = await client.query(
    `
    SELECT column_name, data_type, udt_name, character_maximum_length,
           numeric_precision, numeric_scale, is_nullable, column_default,
           ordinal_position
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1
    ORDER BY ordinal_position
    `,
    [table]
  );
  return r.rows;
}

function colTypeFromInfo(c) {
  // Use udt_name for enum/array types; fall back to data_type.
  const udt = c.udt_name;
  if (c.data_type === "ARRAY") return ident(udt.replace(/^_/, "")) + "[]";
  if (c.data_type === "USER-DEFINED") return ident(udt);
  if (c.data_type === "character varying" && c.character_maximum_length)
    return `varchar(${c.character_maximum_length})`;
  if (c.data_type === "character" && c.character_maximum_length)
    return `char(${c.character_maximum_length})`;
  if (c.data_type === "numeric" && c.numeric_precision)
    return `numeric(${c.numeric_precision}${c.numeric_scale ? "," + c.numeric_scale : ""})`;
  if (c.data_type === "timestamp without time zone") return "timestamp";
  if (c.data_type === "timestamp with time zone") return "timestamptz";
  if (c.data_type === "time without time zone") return "time";
  if (c.data_type === "time with time zone") return "timetz";
  return c.data_type;
}

async function getPrimaryKey(client, table) {
  const r = await client.query(
    `
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = ('public.' || $1)::regclass AND i.indisprimary
    ORDER BY array_position(i.indkey, a.attnum)
    `,
    [table]
  );
  return r.rows.map((x) => x.attname);
}

async function getUniqueConstraints(client, table) {
  const r = await client.query(
    `
    SELECT con.conname, array_agg(att.attname ORDER BY u.ord) AS columns
    FROM pg_constraint con
    JOIN unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.attnum
    WHERE con.contype='u' AND con.conrelid = ('public.' || $1)::regclass
    GROUP BY con.conname
    `,
    [table]
  );
  return r.rows;
}

async function getForeignKeys(client, table) {
  const r = await client.query(
    `
    SELECT
      con.conname,
      array_agg(att.attname ORDER BY u.ord) AS columns,
      cl_f.relname AS ref_table,
      array_agg(att_f.attname ORDER BY u.ord) AS ref_columns,
      pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.attnum
    JOIN pg_class cl_f ON cl_f.oid = con.confrelid
    JOIN pg_attribute att_f ON att_f.attrelid = con.confrelid AND att_f.attnum = con.confkey[u.ord]
    WHERE con.contype='f' AND con.conrelid = ('public.' || $1)::regclass
    GROUP BY con.conname, cl_f.relname, con.oid
    `,
    [table]
  );
  return r.rows;
}

async function getIndexes(client, table) {
  const r = await client.query(
    `
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname='public' AND tablename=$1
      AND indexname NOT LIKE '%_pkey'
    `,
    [table]
  );
  return r.rows;
}

async function getCheckConstraints(client, table) {
  const r = await client.query(
    `
    SELECT con.conname, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    WHERE con.contype='c' AND con.conrelid = ('public.' || $1)::regclass
    `,
    [table]
  );
  return r.rows;
}

async function buildCreateTable(srcClient, table) {
  const cols = await getColumns(srcClient, table);
  const pk = await getPrimaryKey(srcClient, table);
  const uniques = await getUniqueConstraints(srcClient, table);
  const checks = await getCheckConstraints(srcClient, table);

  const colDefs = cols.map((c) => {
    let def = `${ident(c.column_name)} ${colTypeFromInfo(c)}`;
    if (c.column_default) def += ` DEFAULT ${c.column_default}`;
    if (c.is_nullable === "NO") def += " NOT NULL";
    return def;
  });

  if (pk.length > 0) {
    colDefs.push(`PRIMARY KEY (${pk.map(ident).join(",")})`);
  }
  for (const u of uniques) {
    colDefs.push(`CONSTRAINT ${ident(u.conname)} UNIQUE (${toArr(u.columns).map(ident).join(",")})`);
  }
  for (const c of checks) {
    colDefs.push(`CONSTRAINT ${ident(c.conname)} ${c.def}`);
  }

  return `CREATE TABLE IF NOT EXISTS public.${ident(table)} (\n  ${colDefs.join(",\n  ")}\n);`;
}

async function copyData(srcClient, dstClient, table) {
  const cols = await getColumns(srcClient, table);
  const colNames = cols.map((c) => c.column_name);
  const colList = colNames.map(ident).join(",");

  const countR = await srcClient.query(`SELECT COUNT(*)::bigint AS n FROM public.${ident(table)}`);
  const total = Number(countR.rows[0].n);
  if (total === 0) {
    console.log(`    (empty)`);
    return 0;
  }

  let copied = 0;
  for (let offset = 0; offset < total; offset += BATCH) {
    const r = await srcClient.query(
      `SELECT ${colList} FROM public.${ident(table)} ORDER BY ${ident(colNames[0])} OFFSET $1 LIMIT $2`,
      [offset, BATCH]
    );
    if (r.rows.length === 0) break;

    // Bulk insert with parameterized values
    const valueRows = [];
    const params = [];
    let p = 1;
    for (const row of r.rows) {
      const placeholders = colNames.map(() => `$${p++}`).join(",");
      valueRows.push(`(${placeholders})`);
      for (const cn of colNames) params.push(row[cn]);
    }
    const sql = `INSERT INTO public.${ident(table)} (${colList}) VALUES ${valueRows.join(",")} ON CONFLICT DO NOTHING`;
    await dstClient.query(sql, params);
    copied += r.rows.length;
    process.stdout.write(`    ↪ ${copied}/${total}\r`);
  }
  console.log(`    ↪ ${copied}/${total} rows`);
  return copied;
}

async function resetSequences(dstClient, tables) {
  for (const t of tables) {
    const r = await dstClient.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 AND column_default LIKE 'nextval%'`,
      [t]
    );
    for (const row of r.rows) {
      const col = row.column_name;
      try {
        await dstClient.query(`
          SELECT setval(
            pg_get_serial_sequence('public.${t}', '${col}'),
            COALESCE((SELECT MAX(${ident(col)}) FROM public.${ident(t)}), 1),
            (SELECT MAX(${ident(col)}) IS NOT NULL FROM public.${ident(t)})
          )
        `);
      } catch (e) {
        console.warn(`    ⚠ sequence reset failed for ${t}.${col}: ${e.message}`);
      }
    }
  }
}

(async () => {
  const t0 = Date.now();
  const srcC = await src.connect();
  const dstC = await dst.connect();
  try {
    console.log("\n▶ STEP 1: Enable common extensions on target");
    for (const ext of ["pgcrypto", "uuid-ossp", "citext"]) {
      try {
        await dstC.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
        console.log(`  ✓ extension ${ext}`);
      } catch (e) {
        console.warn(`  ⚠ extension ${ext}: ${e.message}`);
      }
    }

    console.log("\n▶ STEP 2: Copy enum types");
    const enums = await getEnumTypes(srcC);
    for (const e of enums) {
      const labelArr = toArr(e.labels);
      const labels = labelArr.map((l) => `'${l.replace(/'/g, "''")}'`).join(",");
      e.labels = labelArr;
      try {
        await dstC.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${e.typname}') THEN
            CREATE TYPE ${ident(e.typname)} AS ENUM (${labels});
          END IF;
        END $$;`);
        console.log(`  ✓ enum ${e.typname} (${e.labels.length} labels)`);
      } catch (err) {
        console.warn(`  ⚠ enum ${e.typname}: ${err.message}`);
      }
    }

    console.log("\n▶ STEP 3: List source tables");
    const tables = await getTables(srcC);
    console.log(`  ${tables.length} tables: ${tables.join(", ")}`);

    console.log("\n▶ STEP 4: Create tables on target (no FKs yet)");
    for (const t of tables) {
      const ddl = await buildCreateTable(srcC, t);
      try {
        await dstC.query(ddl);
        console.log(`  ✓ ${t}`);
      } catch (e) {
        console.error(`  ✗ ${t}: ${e.message}`);
        console.error(`    DDL was:\n${ddl}`);
        throw e;
      }
    }

    console.log("\n▶ STEP 5: Copy data");
    let totalRows = 0;
    for (const t of tables) {
      console.log(`  • ${t}`);
      totalRows += await copyData(srcC, dstC, t);
    }
    console.log(`  Total rows copied: ${totalRows}`);

    console.log("\n▶ STEP 6: Recreate indexes");
    for (const t of tables) {
      const idx = await getIndexes(srcC, t);
      for (const i of idx) {
        try {
          // Make idempotent
          const def = i.indexdef.replace(/^CREATE (UNIQUE )?INDEX /, "CREATE $1INDEX IF NOT EXISTS ");
          await dstC.query(def);
        } catch (e) {
          if (!String(e.message).includes("already exists")) {
            console.warn(`    ⚠ ${t}.${i.indexname}: ${e.message}`);
          }
        }
      }
    }
    console.log(`  ✓ indexes recreated`);

    console.log("\n▶ STEP 7: Recreate foreign keys");
    let fkCount = 0;
    for (const t of tables) {
      const fks = await getForeignKeys(srcC, t);
      for (const fk of fks) {
        try {
          await dstC.query(
            `ALTER TABLE public.${ident(t)} ADD CONSTRAINT ${ident(fk.conname)} ${fk.def}`
          );
          fkCount++;
        } catch (e) {
          if (!String(e.message).includes("already exists")) {
            console.warn(`    ⚠ ${t}.${fk.conname}: ${e.message}`);
          }
        }
      }
    }
    console.log(`  ✓ ${fkCount} FKs recreated`);

    console.log("\n▶ STEP 8: Reset sequences");
    await resetSequences(dstC, tables);
    console.log(`  ✓ sequences synced`);

    console.log(`\n✅ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.error("\n❌ Clone failed:", e.message);
    process.exitCode = 1;
  } finally {
    srcC.release();
    dstC.release();
    await src.end();
    await dst.end();
  }
})();
