import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth-queries";
import { roles } from "@/lib/rbac";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const allowedRegisterRoles = new Set([
  "hospital_admin",
  "insurance_admin",
  "agent",
]);

async function saveBase64Image(base64Data: string, prefix: string): Promise<string | null> {
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const type = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const ext = type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1];
      const fileName = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "verification");

      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, fileName), buffer);

      return `/uploads/verification/${fileName}`;
    }
  } catch (e) {
    console.error("Failed to save image", e);
  }
  return null;
}

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
    ktp_image?: string;
    selfie_image?: string;
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
    let ktpImagePath = undefined;
    if (body.ktp_image) {
      ktpImagePath = await saveBase64Image(body.ktp_image, "ktp") || undefined;
    }

    let selfieImagePath = undefined;
    if (body.selfie_image) {
      selfieImagePath = await saveBase64Image(body.selfie_image, "selfie") || undefined;
    }

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
      ktpImagePath,
      selfieImagePath
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Register failed", error);
    return NextResponse.json({ error: "Register failed" }, { status: 500 });
  }
}

