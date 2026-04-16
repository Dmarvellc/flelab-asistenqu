import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbPool } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET — list all team members of the agency
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await dbPool.query(
      `SELECT
         m.member_id, m.role AS member_role, m.permissions, m.status AS member_status,
         m.joined_at, m.created_at,
         u.user_id, u.email, u.role AS system_role, u.status AS user_status,
         p.full_name, p.phone_number
       FROM public.agency_member m
       JOIN public.app_user u ON u.user_id = m.user_id
       LEFT JOIN public.user_person_link l ON l.user_id = u.user_id
       LEFT JOIN public.person p ON p.person_id = l.person_id
       WHERE m.agency_id = $1
       ORDER BY
         CASE m.role
           WHEN 'master_admin' THEN 1
           WHEN 'admin' THEN 2
           WHEN 'manager' THEN 3
           WHEN 'agent' THEN 4
           ELSE 5
         END,
         m.joined_at ASC`,
      [session.agencyId]
    );

    return NextResponse.json({ members: result.rows });
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

// POST — invite/add a new team member
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if caller is master_admin or admin
    const callerMember = await dbPool.query(
      "SELECT role FROM public.agency_member WHERE user_id = $1 AND agency_id = $2",
      [session.userId, session.agencyId]
    );
    const callerRole = callerMember.rows[0]?.role;
    if (!callerRole || !["master_admin", "admin"].includes(callerRole)) {
      return NextResponse.json({ error: "Only admins can add team members" }, { status: 403 });
    }

    const body = await request.json();
    const { email, fullName, role, password } = body;

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    // Can't create master_admin unless caller is master_admin
    if (role === "master_admin" && callerRole !== "master_admin") {
      return NextResponse.json({ error: "Only master admin can create master admins" }, { status: 403 });
    }

    const client = await dbPool.connect();
    try {
      await client.query("BEGIN");

      // Check if user already exists
      let userId: string;
      const existingUser = await client.query(
        "SELECT user_id FROM public.app_user WHERE email = $1",
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].user_id;

        // Check if already a member of this agency
        const existingMember = await client.query(
          "SELECT member_id FROM public.agency_member WHERE user_id = $1 AND agency_id = $2",
          [userId, session.agencyId]
        );
        if (existingMember.rows.length > 0) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "User is already a member of this agency" }, { status: 409 });
        }

        // Update user's agency_id if not set
        await client.query(
          "UPDATE public.app_user SET agency_id = $1 WHERE user_id = $2 AND agency_id IS NULL",
          [session.agencyId, userId]
        );
      } else {
        // Create new user
        const pw = password || "Welcome123!";
        const passwordHash = await bcrypt.hash(pw, 10);
        const idRes = await client.query("SELECT gen_random_uuid() as id");
        userId = idRes.rows[0].id;

        // Map agency member role to system role
        const systemRole = role === "master_admin" || role === "admin" ? "admin_agency" : "agent";

        await client.query(
          `INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
           VALUES ($1, $2, $3, 'authenticated', 'authenticated', NOW(), NOW())`,
          [userId, email.toLowerCase(), passwordHash]
        );

        await client.query(
          `INSERT INTO public.app_user (user_id, email, password_hash, role, status, agency_id)
           VALUES ($1, $2, $3, $4, 'ACTIVE', $5)`,
          [userId, email.toLowerCase(), passwordHash, systemRole, session.agencyId]
        );

        // Create person record if fullName provided
        if (fullName) {
          const personRes = await client.query(
            `INSERT INTO public.person (full_name) VALUES ($1) RETURNING person_id`,
            [fullName]
          );
          await client.query(
            `INSERT INTO public.user_person_link (user_id, person_id, relation_type) VALUES ($1, $2, 'OWNER')`,
            [userId, personRes.rows[0].person_id]
          );
        }
      }

      // Create agency_member record
      await client.query(
        `INSERT INTO public.agency_member (agency_id, user_id, role, invited_by, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')`,
        [session.agencyId, userId, role, session.userId]
      );

      await client.query("COMMIT");

      return NextResponse.json({ success: true, userId });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to add team member:", error);
    const msg = error instanceof Error ? error.message : "Failed to add team member";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH — update a team member's role or status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check caller is master_admin or admin
    const callerMember = await dbPool.query(
      "SELECT role FROM public.agency_member WHERE user_id = $1 AND agency_id = $2",
      [session.userId, session.agencyId]
    );
    const callerRole = callerMember.rows[0]?.role;
    if (!callerRole || !["master_admin", "admin"].includes(callerRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, role, status, permissions } = body;

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    // Can't edit master_admin unless caller is master_admin
    const target = await dbPool.query(
      "SELECT role, user_id FROM public.agency_member WHERE member_id = $1 AND agency_id = $2",
      [memberId, session.agencyId]
    );
    if (target.rows.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (target.rows[0].role === "master_admin" && callerRole !== "master_admin") {
      return NextResponse.json({ error: "Cannot modify master admin" }, { status: 403 });
    }

    // Can't demote yourself from master_admin
    if (target.rows[0].user_id === session.userId && role && role !== "master_admin" && target.rows[0].role === "master_admin") {
      return NextResponse.json({ error: "Cannot demote yourself from master admin" }, { status: 403 });
    }

    const sets: string[] = [];
    const values: (string | string[])[] = [];
    let idx = 1;

    if (role) { sets.push(`role = $${idx++}`); values.push(role); }
    if (status) { sets.push(`status = $${idx++}`); values.push(status); }
    if (permissions !== undefined) { sets.push(`permissions = $${idx++}`); values.push(JSON.stringify(permissions)); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    values.push(memberId as string);
    values.push(session.agencyId);

    await dbPool.query(
      `UPDATE public.agency_member SET ${sets.join(", ")} WHERE member_id = $${idx++} AND agency_id = $${idx}`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update member:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

// DELETE — remove a team member
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    // Check caller is master_admin or admin
    const callerMember = await dbPool.query(
      "SELECT role FROM public.agency_member WHERE user_id = $1 AND agency_id = $2",
      [session.userId, session.agencyId]
    );
    const callerRole = callerMember.rows[0]?.role;
    if (!callerRole || !["master_admin", "admin"].includes(callerRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can't remove master_admin
    const target = await dbPool.query(
      "SELECT role, user_id FROM public.agency_member WHERE member_id = $1 AND agency_id = $2",
      [memberId, session.agencyId]
    );
    if (target.rows.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (target.rows[0].role === "master_admin") {
      return NextResponse.json({ error: "Cannot remove master admin" }, { status: 403 });
    }
    // Can't remove self
    if (target.rows[0].user_id === session.userId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 403 });
    }

    await dbPool.query(
      "DELETE FROM public.agency_member WHERE member_id = $1 AND agency_id = $2",
      [memberId, session.agencyId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
