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
    fullName?: string;
    nik?: string;
    phoneNumber?: string;
    address?: string;
    birthDate?: string;
    gender?: string;
  };

  if (!body.email || !body.password || !body.role) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!roles.includes(body.role as (typeof roles)[number])) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Developer can create agents, hospital admins, insurance admins
  const extendedCreatableRoles = new Set([
    "hospital_admin", 
    "insurance_admin", 
    "agent",
    "developer" // maybe allowed for super_admin? keeping it flexible
  ]);

  // If the user role is purely 'developer', restrict what they can create 
  // (adjust based on strict requirements, but 'creatableRoles' was limited before)
  // For now let's allow what was requested: agent, hospital
  
  if (!creatableRoles.has(body.role) && body.role !== 'agent') {
      // Fallback to original check if not agent, just in case
       if (!creatableRoles.has(body.role)) {
          // Allow agent now
          if (body.role !== 'agent') {
             return NextResponse.json({ error: "Role not allowed" }, { status: 403 });
          }
       }
  }

  try {
    const approvedBy = await getUserIdFromCookies();
    const user = await createActiveUser({
      email: body.email,
      password: body.password,
      role: body.role,
      approvedBy,
      profile: {
        fullName: body.fullName,
        nik: body.nik,
        phoneNumber: body.phoneNumber,
        address: body.address,
        birthDate: body.birthDate,
        gender: body.gender,
      }
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Create user failed", error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
