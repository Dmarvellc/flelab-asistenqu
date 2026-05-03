import { NextRequest, NextResponse } from "next/server";
import {
  acceptInvitation,
  getInvitationByToken,
} from "@/lib/agency-invitations";

/**
 * Public endpoints for the invitation flow.
 * GET  → preview invite metadata (agency name, role, email, status)
 * POST → accept the invite by supplying password + KTP data
 *
 * No auth — the raw token IS the authentication.
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const preview = await getInvitationByToken(token);
  if (!preview) {
    return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ invitation: preview });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = (await request.json()) as {
      password?: string;
      fullName?: string;
      phoneNumber?: string;
      nik?: string;
      birthDate?: string;
      gender?: "LAKI-LAKI" | "PEREMPUAN";
    };
    if (!body.password) {
      return NextResponse.json({ error: "Password wajib diisi" }, { status: 400 });
    }
    if (!body.nik) {
      return NextResponse.json({ error: "NIK (KTP) wajib diisi" }, { status: 400 });
    }
    if (!body.birthDate) {
      return NextResponse.json({ error: "Tanggal lahir wajib diisi" }, { status: 400 });
    }
    if (!body.gender) {
      return NextResponse.json({ error: "Jenis kelamin wajib dipilih" }, { status: 400 });
    }
    const result = await acceptInvitation({
      rawToken: token,
      password: body.password,
      fullName: body.fullName,
      phoneNumber: body.phoneNumber,
      nik: body.nik,
      birthDate: body.birthDate,
      gender: body.gender,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memproses undangan";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
