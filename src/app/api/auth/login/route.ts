import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-queries";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const user = await verifyPassword({
      email: body.email,
      password: body.password,
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Account pending approval" }, { status: 403 });
    }

    const response = NextResponse.json({
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    response.cookies.set("rbac_role", user.role, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
    response.cookies.set("app_user_id", user.user_id, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
