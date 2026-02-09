import { NextResponse } from "next/server";
import { approveUser } from "@/lib/auth-queries";
import { getRoleFromCookies, getUserIdFromCookies } from "@/lib/auth-cookies";

const allowed = new Set(["developer", "super_admin"]);

export async function POST(request: Request) {
  const role = await getRoleFromCookies();
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { userId?: string };
  if (!body.userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const approvedBy = await getUserIdFromCookies();
    const user = await approveUser({
      userId: body.userId,
      approvedBy,
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Approve failed", error);
    return NextResponse.json({ error: "Approve failed" }, { status: 500 });
  }
}
