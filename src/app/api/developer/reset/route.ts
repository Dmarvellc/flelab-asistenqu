import { NextResponse } from "next/server"
import { dbPool } from "@/lib/db"

export const dynamic = "force-dynamic";

export async function GET() {
  const c = await dbPool.connect()
  try {
    await c.query("BEGIN")

    // 1. Save Developer Account(s)
    const devAuth = await c.query("SELECT * FROM auth.users WHERE role = 'authenticated' AND id IN (SELECT user_id FROM public.app_user WHERE role = 'developer')")
    const devApp = await c.query("SELECT * FROM public.app_user WHERE role = 'developer'")

    // 2. Truncate ALL tables dynamically
    const res = await c.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    // Auth users is in 'auth' schema, we should truncate it too to remove patients/agents
    const allTables = ["auth.users", ...res.rows.map(r => '"public"."' + r.table_name + '"')].join(', ');
    await c.query(`TRUNCATE TABLE ${allTables} CASCADE`);

    // 3. Re-insert Developers
    for (const user of devAuth.rows) {
      await c.query(
        "INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [user.id, user.email, user.encrypted_password, user.aud, user.role, user.created_at, user.updated_at]
      )
    }
    
    for (const app of devApp.rows) {
      await c.query(
        "INSERT INTO public.app_user (user_id, email, password_hash, role, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [app.user_id, app.email, app.password_hash, app.role, app.status, app.created_at]
      )
    }

    await c.query("COMMIT")
    return NextResponse.json({ success: true, message: "Database completely truncated. Developers restored." })
  } catch(e: any) {
    await c.query("ROLLBACK")
    return NextResponse.json({ success: false, error: e.message })
  } finally {
    c.release()
  }
}
