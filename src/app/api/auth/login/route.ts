import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-queries";

type LoginPortal = "agent" | "hospital" | "developer" | "admin_agency";

const SESSION_PREFIXES = [
  "session_agent",
  "session_hospital",
  "session_developer",
  "session_admin_agency",
  "session_super_admin",
  "session_generic",
] as const;

const PORTAL_ALLOWED_ROLES: Record<LoginPortal, Set<string>> = {
  agent: new Set(["agent", "agent_manager", "super_admin"]),
  hospital: new Set(["hospital_admin", "super_admin"]),
  developer: new Set(["developer", "super_admin"]),
  admin_agency: new Set(["admin_agency", "insurance_admin", "super_admin"]),
};

function resolveCookiePrefix(role: string): string {
  if (["agent", "agent_manager"].includes(role)) return "session_agent";
  if (role === "hospital_admin") return "session_hospital";
  if (role === "developer") return "session_developer";
  if (["admin_agency", "insurance_admin"].includes(role)) return "session_admin_agency";
  if (role === "super_admin") return "session_super_admin";
  return "session_generic";
}

function clearAuthCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === "production";

  for (const prefix of SESSION_PREFIXES) {
    response.cookies.set(`${prefix}_role`, "", {
      httpOnly: true,
      secure,
      path: "/",
      sameSite: "lax",
      maxAge: 0,
    });
    response.cookies.set(`${prefix}_user_id`, "", {
      httpOnly: true,
      secure,
      path: "/",
      sameSite: "lax",
      maxAge: 0,
    });
    response.cookies.set(`${prefix}_status`, "", {
      httpOnly: true,
      secure,
      path: "/",
      sameSite: "lax",
      maxAge: 0,
    });
  }

  for (const legacyCookie of ["rbac_role", "app_user_id", "user_status"]) {
    response.cookies.set(legacyCookie, "", {
      httpOnly: true,
      secure,
      path: "/",
      sameSite: "lax",
      maxAge: 0,
    });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    rememberMe?: boolean;
    portal?: LoginPortal;
  };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (body.portal && !(body.portal in PORTAL_ALLOWED_ROLES)) {
    return NextResponse.json({ error: "Invalid login portal" }, { status: 400 });
  }

  try {
    const user = await verifyPassword({
      email: body.email,
      password: body.password,
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (body.portal) {
      const allowedRoles = PORTAL_ALLOWED_ROLES[body.portal];
      if (!allowedRoles.has(user.role)) {
        const forbiddenResponse = NextResponse.json(
          { error: "This account is not allowed to sign in on this portal." },
          { status: 403 }
        );
        clearAuthCookies(forbiddenResponse);
        return forbiddenResponse;
      }
    }

    const response = NextResponse.json({
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    clearAuthCookies(response);
    const cookiePrefix = resolveCookiePrefix(user.role);
    const secure = process.env.NODE_ENV === "production";

    const maxAge = body.rememberMe ? 30 * 24 * 60 * 60 : undefined; // 30 days or session

    // Set cookies with specific prefix
    response.cookies.set(`${cookiePrefix}_role`, user.role, {
      httpOnly: true,
      secure,
      path: "/",
      sameSite: "lax",
      maxAge,
    });
    response.cookies.set(`${cookiePrefix}_user_id`, user.user_id, {
      httpOnly: true,
      secure,
      path: "/",
      sameSite: "lax",
      maxAge,
    });
    response.cookies.set(`${cookiePrefix}_status`, user.status, {
      httpOnly: true,
      secure,
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
