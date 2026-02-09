import { NextResponse } from "next/server";
import { listPendingUsers } from "@/lib/auth-queries";
import { getRoleFromCookies } from "@/lib/auth-cookies";

const allowed = new Set(["developer", "super_admin"]);

export async function GET() {
  const role = await getRoleFromCookies();
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const pending = await listPendingUsers();
    return NextResponse.json({ pending });
  } catch (error) {
    console.error("Pending users load failed", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
