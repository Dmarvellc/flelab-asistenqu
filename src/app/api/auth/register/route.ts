import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser } from "@/lib/auth-queries";
import {
  getSupabaseAdmin,
  getSupabaseAdminConfigError,
  hasSupabaseAdminConfig,
} from "@/lib/supabase-admin";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

const registerSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
  role: z.literal("agent"),
  fullName: z.string().trim().min(1).max(255).optional(),
  nik: z.string().trim().max(64).optional(),
  phoneNumber: z.string().trim().max(32).optional(),
  address: z.string().trim().max(500).optional(),
  birthDate: z.string().trim().max(32).optional(),
  gender: z.string().trim().max(32).optional(),
  ktp_image: z.string().max(8_000_000).optional(),
  selfie_image: z.string().max(8_000_000).optional(),
  agencyId: z.string().uuid().optional(),
  referralCode: z
    .string()
    .trim()
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((value) => value.toUpperCase())
    .optional(),
});

async function saveBase64Image(base64Data: string, prefix: string): Promise<string | null> {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid image payload");
  }

  const type = matches[1];
  if (!allowedImageTypes.has(type)) {
    throw new Error("Unsupported image type");
  }
  
  if (!hasSupabaseAdminConfig()) {
    if (process.env.NODE_ENV === "production") {
      // Hard fail in prod — never silently store a placeholder for KYC images.
      throw new Error("Image storage is not configured. Cannot complete registration.");
    }
    console.warn("Supabase not configured, faking image upload for registration (DEV ONLY)");
    return "https://placehold.co/800x800?text=Mock+Image";
  }

  const supabaseAdmin = getSupabaseAdmin();
  const buffer = Buffer.from(matches[2], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds maximum allowed size");
  }

  const ext = type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1];
  const fileName = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from('verification-images')
    .upload(fileName, buffer, {
      contentType: type,
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error("Failed to upload image");
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('verification-images')
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration payload" }, { status: 400 });
  }

  const body = parsed.data;
  const rateLimit = await consumeRateLimit({
    namespace: "auth:register",
    identifier: `${getClientIp(request)}:${body.email}`,
    limit: 5,
    windowSeconds: 60 * 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
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
      selfieImagePath,
      agencyId: body.agencyId,
      referralCode: body.referralCode
    });
    return NextResponse.json({ user });
  } catch (error) {
    logError("api.auth.register", error, {
      requestPath: "/api/auth/register",
      requestMethod: "POST",
      isPublicFacing: true,
    });
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
    if (error instanceof Error && error.message.toLowerCase().includes("image")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Register failed" }, { status: 500 });
  }
}
