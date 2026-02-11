import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth-queries";
import { roles } from "@/lib/rbac";

const allowedRegisterRoles = new Set([
  "hospital_admin",
  "insurance_admin",
  "agent",
]);

export async function POST(request: Request) {
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

  if (!allowedRegisterRoles.has(body.role)) {
    return NextResponse.json({ error: "Role not allowed" }, { status: 403 });
  }

  try {
    const user = await registerUser({
      email: body.email,
      password: body.password,
      role: body.role,
      fullName: body.fullName,
      nik: body.nik,
      phoneNumber: body.phoneNumber,
      address: body.address,
      birthDate: body.birthDate,
      gender: body.gender,
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Register failed", error);
    return NextResponse.json({ error: "Register failed" }, { status: 500 });
  }
}
