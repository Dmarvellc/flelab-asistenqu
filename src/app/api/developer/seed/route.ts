import { NextResponse } from "next/server"
import { dbPool } from "@/lib/db"

export async function GET() {
  // Fire and forget so we don't block the request!
  runSeed().catch(console.error)
  return NextResponse.json({ success: true, message: "Database seeding started in the background. Check UI in 5 seconds." })
}

async function runSeed() {
  const c = await dbPool.connect()
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

    const insRes = await c.query("SELECT insurance_id FROM public.insurance LIMIT 1");
    let insuranceId = insRes.rows.length > 0 ? insRes.rows[0].insurance_id : null;
    if (!insuranceId) {
      const ins = await c.query("INSERT INTO public.insurance (insurance_name) VALUES ('Mega Insure') RETURNING insurance_id");
      insuranceId = ins.rows[0].insurance_id;
    }

    console.log("Generating agents...")
    let agentChunks = ""
    for (let i = 0; i < 240; i++) {
        const pid = await c.query(
            "INSERT INTO public.person (full_name) VALUES ($1) RETURNING person_id",
            [`Agent Name ${i}`]
        )
        const uuidRes = await c.query("SELECT gen_random_uuid() as id");
        const agentId = uuidRes.rows[0].id;
        
        await c.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [agentId, `agent_historical_${i}@example.com`])
        await c.query(
            `INSERT INTO public.app_user (user_id, email, password_hash, role, status, agency_id, created_at) VALUES ($1, $2, 'hash', 'agent', 'ACTIVE', $3, NOW() - (random() * interval '365 days'))`,
            [agentId, `agent_historical_${i}@example.com`, agencyIds[i % agencyIds.length]]
        )
        try {
          await c.query(
              `INSERT INTO public.agent (agent_id, agent_name, status, person_id, insurance_id, created_at) VALUES ($1, $2, 'ACTIVE', $3, $4, NOW() - (random() * interval '365 days'))`,
              [agentId, `Agent Name ${i}`, pid.rows[0].person_id, insuranceId]
          )
        } catch(e) {}
    }

    // Faster inserting
    console.log("Generating users...")
    const usersCreated = 2000
    for(let j=0; j<usersCreated; j+=100) {
        let sqlAuth = "INSERT INTO auth.users (id, email) VALUES "
        let sqlAppUser = "INSERT INTO public.app_user (user_id, email, password_hash, role, status, created_at) VALUES "
        for(let i=0; i<100; i++) {
            const uuidRes = await c.query("SELECT gen_random_uuid() as id");
            const userId = uuidRes.rows[0].id;
            sqlAuth += `('${userId}', 'hist_${j+i}@user.com')${i===99 ? '' : ','}`
            sqlAppUser += `('${userId}', 'hist_${j+i}@user.com', 'hash', 'patient', 'ACTIVE', NOW() - (random() * interval '365 days'))${i===99 ? '' : ','}`
        }
        await c.query(sqlAuth)
        await c.query(sqlAppUser)
    }

    console.log("Generating claims...")
    const stages = ["DRAFT_AGENT", "PENDING_LOG", "LOG_ISSUED", "PENDING_REVIEW", "APPROVED", "REJECTED", "COMPLETED"]
    for(let j=0; j<1500; j+=50) {
        let sqlClaim = "INSERT INTO public.claim (patient_id, stage, hospital_id, created_at, updated_at) VALUES "
        for(let i=0; i<50; i++) {
           let patientRes = await c.query("SELECT user_id FROM public.app_user WHERE role='patient' ORDER BY random() LIMIT 1");
           if(patientRes.rows.length === 0) continue;
           const uid = patientRes.rows[0].user_id
           const stage = stages[Math.floor(Math.random() * stages.length)]
           const hid = hospitalIds[i % hospitalIds.length] || null
           sqlClaim += `('${uid}', '${stage}', '${hid}', NOW() - (random() * interval '365 days'), NOW())${i===49 ? '' : ','}`
        }
        if(!sqlClaim.endsWith("VALUES ")) {
           if (sqlClaim.endsWith(",")) sqlClaim = sqlClaim.slice(0,-1);
           await c.query(sqlClaim)
        }
    }

    await c.query("COMMIT")
    console.log("Seeding completely finished!")
  } catch(e: any) {
    await c.query("ROLLBACK")
    console.error("Seed error", e)
  } finally {
    c.release()
  }
}
