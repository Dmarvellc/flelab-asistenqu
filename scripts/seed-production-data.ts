import { Pool } from "pg"
import dotenv from "dotenv"

dotenv.config({ path: "../.env.local" })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
  const c = await pool.connect()
  try {
    await c.query("BEGIN")

    console.log("Generating agencies...")
    const agencyIds = []
    for (let i = 0; i < 45; i++) {
        const id = await c.query(
            "INSERT INTO public.agency (name, address, created_at) VALUES ($1, $2, NOW() - (random() * interval '365 days')) RETURNING agency_id",
            [`Agency ${i}`, `Address ${i}`]
        )
        agencyIds.push(id.rows[0].agency_id)
    }

    console.log("Generating hospitals...")
    const hospitalIds = []
    for (let i = 0; i < 28; i++) {
        const id = await c.query(
            "INSERT INTO public.hospital (name, address, created_at) VALUES ($1, $2, NOW() - (random() * interval '365 days')) RETURNING hospital_id",
            [`Rumah Sakit ${i}`, `Jakarta ${i}`]
        )
        hospitalIds.push(id.rows[0].hospital_id)
    }

    console.log("Getting insurance...")
    let insuranceId;
    const insRes = await c.query("SELECT insurance_id FROM public.insurance LIMIT 1");
    if (insRes.rows.length > 0) insuranceId = insRes.rows[0].insurance_id;
    else {
      const ins = await c.query("INSERT INTO public.insurance (insurance_name) VALUES ('Mega Insure') RETURNING insurance_id");
      insuranceId = ins.rows[0].insurance_id;
    }

    console.log("Generating agents...")
    const agentPersonIds = []
    for (let i = 0; i < 240; i++) {
        const pid = await c.query(
            "INSERT INTO public.person (full_name) VALUES ($1) RETURNING person_id",
            [`Agent Name ${i}`]
        )
        agentPersonIds.push(pid.rows[0].person_id)
        
        const uuidRes = await c.query("SELECT gen_random_uuid() as id");
        const agentId = uuidRes.rows[0].id;

        await c.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [agentId, `agent_historical_${i}@example.com`])

        const created = `NOW() - (random() * interval '365 days')`;
        await c.query(
            `INSERT INTO public.app_user (user_id, email, password_hash, role, status, agency_id, created_at) VALUES ($1, $2, 'hash', 'agent', 'ACTIVE', $3, ${created})`,
            [agentId, `agent_historical_${i}@example.com`, agencyIds[i % agencyIds.length]]
        )

        try {
          await c.query(
              `INSERT INTO public.agent (agent_id, agent_name, status, person_id, insurance_id, created_at) VALUES ($1, $2, 'ACTIVE', $3, $4, ${created})`,
              [agentId, `Agent Name ${i}`, pid.rows[0].person_id, insuranceId]
          )
        } catch(e) {
          await c.query(
              `INSERT INTO public.agent (agent_id, agent_name, status, insurance_id, created_at) VALUES ($1, $2, 'ACTIVE', $3, ${created})`,
              [agentId, `Agent Name ${i}`, insuranceId]
          )
        }
    }

    console.log("Generating users & claims...")
    const stages = ["DRAFT_AGENT", "PENDING_LOG", "LOG_ISSUED", "PENDING_REVIEW", "APPROVED", "REJECTED", "COMPLETED"]
    
    for (let i = 0; i < 5000; i++) {
        const uuidRes = await c.query("SELECT gen_random_uuid() as id");
        const userId = uuidRes.rows[0].id;
        const created = `NOW() - (random() * interval '365 days')`;

        // We only create records in auth and app_user directly for speed, realistic dates
        await c.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [userId, `historical_${i}@user.com`])
        
        await c.query(
            `INSERT INTO public.app_user (user_id, email, password_hash, role, status, created_at) VALUES ($1, $2, 'hash', 'patient', 'ACTIVE', ${created})`,
            [userId, `historical_${i}@user.com`]
        )

        // Give some users claims
        if (Math.random() > 0.4) {
            const stage = stages[Math.floor(Math.random() * stages.length)]
            await c.query(
                `INSERT INTO public.claim (patient_id, stage, hospital_id, created_at, updated_at) VALUES ($1, $2, $3, ${created}, ${created})`,
                [userId, stage, hospitalIds[i % hospitalIds.length]]
            )
        }
    }

    console.log("Generating recent pending/active trends...")
    for (let i = 0; i < 300; i++) {
        const uuidRes = await c.query("SELECT gen_random_uuid() as id");
        const userId = uuidRes.rows[0].id;
        const created = `NOW() - (random() * interval '7 days')`; // Recent spike!
        const status = Math.random() > 0.8 ? 'PENDING' : 'ACTIVE';
        
        await c.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [userId, `recent_${i}@user.com`])
        
        await c.query(
            `INSERT INTO public.app_user (user_id, email, password_hash, role, status, created_at) VALUES ($1, $2, 'hash', 'patient', $3, ${created})`,
            [userId, `recent_${i}@user.com`, status]
        )
    }

    await c.query("COMMIT")
    console.log("Done seeding!")
  } catch(e) {
    await c.query("ROLLBACK")
    console.error(e)
  } finally {
    c.release()
  }
}

run().finally(() => process.exit(0))
