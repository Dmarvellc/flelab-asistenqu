#!/usr/bin/env node
/**
 * Round-trip latency probe — distinguishes connection cost vs query cost
 * vs network RTT. Run from your laptop, then from Vercel deployment, and
 * compare to see whether lag is geographic or app-side.
 */
require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const dns = require("dns").promises;
const net = require("net");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL not set");
  process.exit(1);
}

const u = new URL(url);
const host = u.hostname;
const port = Number(u.port || 5432);
const region = (host.match(/aws-\d-([a-z0-9-]+)\.pooler/) || [])[1] || "unknown";

console.log(`\n📡 DB host: ${host}`);
console.log(`📍 Region:  ${region}`);
console.log(`🔌 Port:    ${port}\n`);

async function dnsLookup() {
  const t0 = Date.now();
  const r = await dns.resolve4(host);
  return { ms: Date.now() - t0, ips: r };
}

function tcpHandshake() {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const s = net.connect(port, host);
    s.once("connect", () => {
      const ms = Date.now() - t0;
      s.destroy();
      resolve(ms);
    });
    s.once("error", () => resolve(-1));
    s.setTimeout(5000, () => {
      s.destroy();
      resolve(-1);
    });
  });
}

async function pgRoundTrips() {
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });

  // First connect = TCP + TLS + auth + first query
  const tCold = Date.now();
  const c1 = await pool.connect();
  await c1.query("SELECT 1");
  const cold = Date.now() - tCold;
  c1.release();

  // Subsequent queries should reuse the warm connection
  const warmTimes = [];
  for (let i = 0; i < 10; i++) {
    const c = await pool.connect();
    const t = Date.now();
    await c.query("SELECT 1");
    warmTimes.push(Date.now() - t);
    c.release();
  }

  await pool.end();
  const avg = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;
  const min = Math.min(...warmTimes);
  const max = Math.max(...warmTimes);
  return { cold, warm: { avg, min, max, samples: warmTimes } };
}

(async () => {
  try {
    const dnsRes = await dnsLookup();
    console.log(`🌐 DNS lookup:        ${dnsRes.ms}ms  (${dnsRes.ips.join(", ")})`);

    const tcpRes = await tcpHandshake();
    console.log(`🤝 TCP handshake:     ${tcpRes}ms  (one round-trip from you to DB)`);

    const pg = await pgRoundTrips();
    console.log(`❄️  Cold pg connect+query: ${pg.cold}ms`);
    console.log(`🔥 Warm SELECT 1 avg: ${pg.warm.avg.toFixed(1)}ms`);
    console.log(`   min=${pg.warm.min}ms  max=${pg.warm.max}ms`);
    console.log(`   samples: [${pg.warm.samples.join(", ")}]`);

    console.log(`\n📊 DIAGNOSIS:`);
    if (tcpRes > 80) {
      console.log(`   • TCP handshake ${tcpRes}ms = network RTT to DB.`);
      console.log(`   • This is geography. To fix, move DB to a closer region.`);
      console.log(`   • Indonesia → Singapore (ap-southeast-1) ≈ 25-40ms`);
      console.log(`   • Indonesia → Tokyo   (ap-northeast-1) ≈ 70-100ms`);
      console.log(`   • Indonesia → Seoul   (ap-northeast-2) ≈ 80-150ms ← you are here`);
    } else if (tcpRes < 30 && pg.warm.avg > 50) {
      console.log(`   • TCP fast (${tcpRes}ms) but query slow — DB load or query plan issue.`);
    } else {
      console.log(`   • Latency profile looks healthy.`);
    }
    console.log(`   • Vercel SIN1 → Supabase SIN ≈ 1-3ms intra-region (best case)`);
  } catch (e) {
    console.error("✗ Probe failed:", e.message);
    process.exit(1);
  }
})();
