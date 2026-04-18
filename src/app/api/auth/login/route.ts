import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth-queries";
import {
  applySessionCookie,
  AUTH_SESSION_COOKIE,
  clearLegacyAuthCookies,
  clearSessionCookie,
  createSession,
  revokeSession,
} from "@/lib/auth";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizeRole } from "@/lib/rbac";
import { dbPool } from "@/lib/db";
import { logError } from "@/lib/logger";

type LoginPortal = "agent" | "hospital" | "developer" | "admin_agency";

const PORTAL_ALLOWED_ROLES: Record<LoginPortal, Set<string>> = {
  agent: new Set(["agent", "agent_manager", "super_admin"]),
  hospital: new Set(["hospital_admin", "super_admin"]),
  developer: new Set(["developer", "super_admin"]),
  admin_agency: new Set(["admin_agency", "insurance_admin", "super_admin"]),
};

const loginSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
  rememberMe: z.boolean().optional(),
  portal: z.enum(["agent", "hospital", "developer", "admin_agency"]).optional(),
});

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
  }

  const body = parsed.data;
  const rateLimit = await consumeRateLimit({
    namespace: "auth:login",
    identifier: `${getClientIp(request)}:${body.email}`,
    limit: 10,
    windowSeconds: 15 * 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const user = await verifyPassword({
      email: body.email,
      password: body.password,
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const role = normalizeRole(user.role);
    if (!role) {
      return NextResponse.json({ error: "Account role is invalid" }, { status: 403 });
    }

    if (body.portal) {
      const allowedRoles = PORTAL_ALLOWED_ROLES[body.portal];
      if (!allowedRoles.has(role)) {
        const forbiddenResponse = NextResponse.json(
          { error: "This account is not allowed to sign in on this portal." },
          { status: 403 }
        );
        clearLegacyAuthCookies(forbiddenResponse);
        clearSessionCookie(forbiddenResponse);
        return forbiddenResponse;
      }
    }

    const cookieStore = await cookies();
    const existingSessionId = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    if (existingSessionId) {
      await revokeSession(existingSessionId).catch(() => {});
    }

    // Fetch agency info for agents/admin_agency
    const agencyId = "agency_id" in user ? (user.agency_id as string | null | undefined) ?? null : null;
    let agencySlug: string | null = null;
    let agencyMemberRole: string | null = null;
    let agencyName: string | null = null;

    if (agencyId) {
      const agencyRes = await dbPool.query(
        `SELECT a.slug, a.name, am.role AS member_role
         FROM public.agency a
         LEFT JOIN public.agency_member am ON am.agency_id = a.agency_id AND am.user_id = $1
         WHERE a.agency_id = $2
         LIMIT 1`,
        [user.user_id, agencyId]
      ).catch(() => ({ rows: [] }));

      if (agencyRes.rows.length > 0) {
        agencySlug = agencyRes.rows[0].slug;
        agencyName = agencyRes.rows[0].name;
        agencyMemberRole = agencyRes.rows[0].member_role;
      }
    }

    const session = await createSession({
      userId: user.user_id,
      role,
      status: user.status,
      agencyId,
      agencySlug,
      agencyMemberRole,
      portal: body.portal ?? null,
      rememberMe: body.rememberMe,
    });

    const response = NextResponse.json({
      user: {
        user_id: user.user_id,
        email: user.email,
        role,
        status: user.status,
        agency_id: agencyId,
        agency_slug: agencySlug,
        agency_name: agencyName,
        agency_member_role: agencyMemberRole,
      },
    });

    clearLegacyAuthCookies(response);
    clearSessionCookie(response);
    applySessionCookie(response, session.sessionId, body.rememberMe, body.portal, agencySlug);
    return response;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logError("api.auth.login", error, {
      requestPath: "/api/auth/login",
      requestMethod: "POST",
      isPublicFacing: true,
    });

    // Surface helpful message in development; keep it generic in production
    const detail =
      process.env.NODE_ENV !== "production"
        ? ` — ${errMsg}`
        : "";

    return NextResponse.json(
      { error: `Login failed${detail}` },
      { status: 500 }
    );
  }
}
