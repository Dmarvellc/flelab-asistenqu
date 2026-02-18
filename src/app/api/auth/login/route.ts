import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-queries";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string; rememberMe?: boolean };

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

    const response = NextResponse.json({
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    // Determine cookie name prefix based on role
    let cookiePrefix = "session_generic";
    if (["agent", "agent_manager"].includes(user.role)) {
      cookiePrefix = "session_agent";
    } else if (["hospital_admin"].includes(user.role)) {
      cookiePrefix = "session_hospital";
    } else if (["developer"].includes(user.role)) {
      cookiePrefix = "session_developer";
    } else if (["admin_agency", "insurance_admin"].includes(user.role)) {
      cookiePrefix = "session_admin_agency";
    } else if (user.role === "super_admin") {
      cookiePrefix = "session_super_admin";
    }

    const maxAge = body.rememberMe ? 30 * 24 * 60 * 60 : undefined; // 30 days or session

    // Set cookies with specific prefix
    response.cookies.set(`${cookiePrefix}_role`, user.role, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge,
    });
    response.cookies.set(`${cookiePrefix}_user_id`, user.user_id, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge,
    });
    response.cookies.set(`${cookiePrefix}_status`, user.status, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge,
    });

    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
