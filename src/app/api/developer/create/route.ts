import { NextResponse } from "next/server";
import { createActiveUser } from "@/lib/auth-queries";
import { roles } from "@/lib/rbac";
import { getRoleFromCookies, getUserIdFromCookies } from "@/lib/auth-cookies";

const allowed = new Set(["developer", "super_admin"]);
const creatableRoles = new Set(["hospital_admin", "insurance_admin", "admin_agency", "agent"]);

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
  } catch (error: any) {
    console.error("Create user failed", error);
    const dbError = error as { code?: string; constraint?: string; message?: string } | undefined;
    if (dbError?.code === "23514" && dbError?.constraint === "person_phone_number_check") {
      return NextResponse.json(
        { error: "Phone number is invalid. Use format like +628123456789." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.toLowerCase().includes("phone number")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Create failed: " + (error?.message || String(error)) }, { status: 500 });
  }
}
