import { NextResponse } from "next/server"
import { dbPool } from "@/lib/db"
import { getRoleFromCookies, getUserIdFromCookies } from "@/lib/auth-cookies"
import bcrypt from "bcryptjs"

const ALLOWED_ROLES = new Set(["developer", "super_admin"])

function randomSuffix() {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

function generateCredentials(role: string, suffix: string) {
  const slug = role.replace(/_/g, "").toLowerCase()
  return {
    email: `sandbox.${slug}.${suffix.toLowerCase()}@dev.test`,
    password: `SandboxDev#${suffix}`,
  }
}

// ── GET /api/developer/sandbox ───────────────────────────────────────────────
export async function GET() {
  const role = await getRoleFromCookies()
  if (!role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const client = await dbPool.connect()
  try {
    // Auto-expire sessions whose expires_at has passed
    await client.query(`
      UPDATE public.sandbox_session
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE' AND expires_at < now()
    `)

    const { rows } = await client.query(`
      SELECT
        session_id, name, description, created_by, created_at,
        expires_at, destroyed_at, status, accounts, metadata
      FROM public.sandbox_session
      ORDER BY created_at DESC
      LIMIT 50
    `)
    return NextResponse.json({ sessions: rows })
  } finally {
    client.release()
  }
}

// ── POST /api/developer/sandbox ──────────────────────────────────────────────
export async function POST(request: Request) {
  const role = await getRoleFromCookies()
  if (!role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const createdBy = await getUserIdFromCookies()

  const body = await request.json() as {
    name?: string
    description?: string
    ttlHours?: number
    roles?: string[]
  }

  const sessionName = body.name?.trim() || `Sandbox ${new Date().toLocaleString("id-ID")}`
  const ttlHours = Math.min(Math.max(body.ttlHours ?? 24, 1), 72)
  const rolesToProvision: string[] = body.roles?.length
    ? body.roles
    : ["agent", "admin_agency", "hospital_admin"]

  const suffix = randomSuffix()
  const client = await dbPool.connect()

  try {
    await client.query("BEGIN")

    // 1. Insert session row first (accounts updated after user creation)
    const sessionRes = await client.query(`
      INSERT INTO public.sandbox_session (name, description, created_by, expires_at, accounts, metadata)
      VALUES ($1, $2, $3, now() + ($4 || ' hours')::interval, '[]', '{}')
      RETURNING session_id, expires_at
    `, [sessionName, body.description || null, createdBy || null, ttlHours])

    const sessionId: string = sessionRes.rows[0].session_id
    const expiresAt: string = sessionRes.rows[0].expires_at

    const accounts: object[] = []
    const metadata: Record<string, string> = {}

    for (const provisionRole of rolesToProvision) {
      const creds = generateCredentials(provisionRole, suffix)
      const passwordHash = await bcrypt.hash(creds.password, 10)

      // 2a. Insert app_user
      const userRes = await client.query(`
        INSERT INTO public.app_user
          (email, password_hash, role, status, approved_at, is_sandbox, sandbox_session_id)
        VALUES ($1, $2, $3, 'ACTIVE', now(), true, $4)
        RETURNING user_id
      `, [creds.email, passwordHash, provisionRole, sessionId])
      const userId: string = userRes.rows[0].user_id

      // 2b. Create person
      const fullName = `[Sandbox] ${provisionRole.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} ${suffix}`
      const personRes = await client.query(`
        INSERT INTO public.person (full_name, phone_number)
        VALUES ($1, '+628000000000')
        RETURNING person_id
      `, [fullName])
      const personId: string = personRes.rows[0].person_id

      await client.query(`
        INSERT INTO public.user_person_link (user_id, person_id, relation_type)
        VALUES ($1, $2, 'OWNER')
      `, [userId, personId])

      // 2c. Role-specific provisioning
      if (provisionRole === "hospital_admin") {
        const hospRes = await client.query(`
          INSERT INTO public.hospital (name, address, is_partner, status)
          VALUES ($1, 'Sandbox Test Address', true, 'ACTIVE')
          RETURNING hospital_id
        `, [`[Sandbox] Hospital ${suffix}`])
        const hospitalId: string = hospRes.rows[0].hospital_id
        metadata.hospital_id = hospitalId

        await client.query(`
          INSERT INTO public.user_role (user_id, role, scope_type, scope_id)
          VALUES ($1, 'HOSPITAL_ADMIN', 'HOSPITAL', $2)
          ON CONFLICT DO NOTHING
        `, [userId, hospitalId])

      } else if (provisionRole === "admin_agency") {
        const agencyRes = await client.query(`
          INSERT INTO public.agency (name, address)
          VALUES ($1, 'Sandbox Test Address')
          RETURNING agency_id
        `, [`[Sandbox] Agency ${suffix}`])
        const agencyId: string = agencyRes.rows[0].agency_id
        metadata.agency_id = agencyId

        // Link user to agency
        await client.query(`
          UPDATE public.app_user SET agency_id = $1 WHERE user_id = $2
        `, [agencyId, userId])

        // agency_member uses `role` for agency-scoped permissions.
        await client.query(`
          INSERT INTO public.agency_member (agency_id, user_id, role, status, joined_at)
          VALUES ($1, $2, 'master_admin', 'ACTIVE', now())
          ON CONFLICT DO NOTHING
        `, [agencyId, userId])

      } else if (provisionRole === "agent") {
        // Find or create a default insurance
        let insuranceId: string
        const insRes = await client.query("SELECT insurance_id FROM public.insurance LIMIT 1")
        if (insRes.rows.length > 0) {
          insuranceId = insRes.rows[0].insurance_id
        } else {
          const newIns = await client.query(
            "INSERT INTO public.insurance (insurance_name) VALUES ('Independent') RETURNING insurance_id"
          )
          insuranceId = newIns.rows[0].insurance_id
        }
        await client.query(`
          INSERT INTO public.agent (agent_id, agent_name, insurance_id, status, person_id)
          VALUES ($1, $2, $3, 'ACTIVE', $4)
          ON CONFLICT DO NOTHING
        `, [userId, fullName, insuranceId, personId])
      }

      accounts.push({
        role: provisionRole,
        email: creds.email,
        password: creds.password,
        user_id: userId,
        person_id: personId,
        full_name: fullName,
      })
    }

    // 3. Write accounts + metadata back to sandbox_session
    await client.query(`
      UPDATE public.sandbox_session
      SET accounts = $1, metadata = $2
      WHERE session_id = $3
    `, [JSON.stringify(accounts), JSON.stringify(metadata), sessionId])

    await client.query("COMMIT")

    return NextResponse.json({
      session_id: sessionId,
      name: sessionName,
      expires_at: expiresAt,
      accounts,
      metadata,
    }, { status: 201 })

  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[sandbox] create failed:", err)
    return NextResponse.json(
      { error: "Failed to create sandbox session", detail: String(err) },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
