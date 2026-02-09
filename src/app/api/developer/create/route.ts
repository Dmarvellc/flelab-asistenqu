import { NextResponse } from "next/server";
import { createActiveUser } from "@/lib/auth-queries";
import { roles } from "@/lib/rbac";
import { getRoleFromCookies, getUserIdFromCookies } from "@/lib/auth-cookies";

const allowed = new Set(["developer", "super_admin"]);
const creatableRoles = new Set(["hospital_admin", "insurance_admin"]);

export async function POST(request: Request) {
  const role = await getRoleFromCookies();
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    role?: string;
  };

  if (!body.email || !body.password || !body.role) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!roles.includes(body.role as (typeof roles)[number])) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!creatableRoles.has(body.role)) {
    return NextResponse.json({ error: "Role not allowed" }, { status: 403 });
  }

  try {
    const approvedBy = await getUserIdFromCookies();
    const user = await createActiveUser({
      email: body.email,
      password: body.password,
      role: body.role,
      approvedBy,
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Create user failed", error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
