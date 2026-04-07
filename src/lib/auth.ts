import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { ensureRedisConnection, redisClient } from "@/lib/redis";
import { normalizeRole, type Role } from "@/lib/rbac";

export const AUTH_SESSION_COOKIE = "session_id";

const SESSION_CACHE_PREFIX = "auth:session";
const DEFAULT_SESSION_TTL_SECONDS = 12 * 60 * 60;
const REMEMBER_ME_TTL_SECONDS = 30 * 24 * 60 * 60;
const SESSION_REVALIDATE_SECONDS = 60;

const LEGACY_COOKIE_PREFIXES = [
  "session_agent",
  "session_hospital",
  "session_developer",
  "session_admin_agency",
  "session_super_admin",
  "session_generic",
] as const;

const SELF_ACCESS_ROLES = new Set<Role>([
  "agent",
  "agent_manager",
  "hospital_admin",
  "admin_agency",
  "insurance_admin",
  "developer",
  "super_admin",
]);

export type AppSession = {
  sessionId: string;
  userId: string;
  role: Role;
  status: string;
  portal: string | null;
  agencyId: string | null;
  createdAt: string;
  expiresAt: string;
  validatedAt: number;
};

export class AuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export type ScopeResourceType = "agency" | "claim" | "client" | "hospital" | "user";

function getSessionCacheKey(sessionId: string) {
  return `${SESSION_CACHE_PREFIX}:${sessionId}`;
}

function getSessionTtlSeconds(rememberMe?: boolean) {
  return rememberMe ? REMEMBER_ME_TTL_SECONDS : DEFAULT_SESSION_TTL_SECONDS;
}

function getSessionCookieConfig(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

function isSessionExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

function parseCachedSession(raw: string): AppSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AppSession>;
    const role = normalizeRole(parsed.role);
    if (!parsed.sessionId || !parsed.userId || !role || !parsed.expiresAt) {
      return null;
    }

    return {
      sessionId: parsed.sessionId,
      userId: parsed.userId,
      role,
      status: parsed.status ?? "ACTIVE",
      portal: parsed.portal ?? null,
      agencyId: parsed.agencyId ?? null,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      expiresAt: parsed.expiresAt,
      validatedAt: parsed.validatedAt ?? 0,
    };
  } catch {
    return null;
  }
}

async function cacheSession(session: AppSession) {
  const ttlSeconds = Math.max(
    Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
    1
  );

  try {
    await ensureRedisConnection();
    await redisClient.set(getSessionCacheKey(session.sessionId), JSON.stringify(session), {
      EX: ttlSeconds,
    });
  } catch (error) {
    console.error("Failed to cache auth session", { sessionId: session.sessionId, error });
  }
}

async function deleteSessionCache(sessionId: string) {
  try {
    await ensureRedisConnection();
    await redisClient.del(getSessionCacheKey(sessionId));
  } catch (error) {
    console.error("Failed to delete auth session cache", { sessionId, error });
  }
}

async function getCachedSession(sessionId: string) {
  try {
    await ensureRedisConnection();
    const raw = await redisClient.get(getSessionCacheKey(sessionId));
    return raw ? parseCachedSession(raw) : null;
  } catch (error) {
    console.error("Failed to read auth session cache", { sessionId, error });
    return null;
  }
}

async function loadSessionFromDatabase(sessionId: string): Promise<AppSession | null> {
  const result = await dbPool.query(
    `SELECT
       s.session_id,
       s.user_id,
       s.role AS session_role,
       s.user_status AS session_status,
       s.portal,
       s.created_at,
       s.expires_at,
       s.revoked,
       u.role AS current_role,
       u.status AS current_status,
       u.agency_id
     FROM public.auth_session s
     JOIN public.app_user u ON u.user_id = s.user_id
     WHERE s.session_id = $1
     LIMIT 1`,
    [sessionId]
  );

  if (result.rows.length === 0) {
    await deleteSessionCache(sessionId);
    return null;
  }

  const row = result.rows[0] as {
    session_id: string;
    user_id: string;
    session_role: string;
    session_status: string;
    portal: string | null;
    created_at: string;
    expires_at: string;
    revoked: boolean;
    current_role: string;
    current_status: string;
    agency_id: string | null;
  };

  const role = normalizeRole(row.current_role);
  if (!role || row.revoked || isSessionExpired(row.expires_at)) {
    await revokeSession(sessionId).catch(() => {});
    return null;
  }

  // Fail closed if the live user role/status no longer matches the session snapshot.
  if (row.session_role !== row.current_role || row.session_status !== row.current_status) {
    await revokeSession(sessionId).catch(() => {});
    return null;
  }

  const session: AppSession = {
    sessionId: row.session_id,
    userId: row.user_id,
    role,
    status: row.current_status,
    portal: row.portal,
    agencyId: row.agency_id,
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    validatedAt: Date.now(),
  };

  await dbPool
    .query(
      `UPDATE public.auth_session
       SET last_seen_at = NOW(), updated_at = NOW()
       WHERE session_id = $1`,
      [sessionId]
    )
    .catch(() => {});

  await cacheSession(session);
  return session;
}

export async function getSession(options?: { forceRevalidate?: boolean }): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (!sessionId) {
    return null;
  }

  const cached = await getCachedSession(sessionId);
  if (
    cached &&
    !options?.forceRevalidate &&
    !isSessionExpired(cached.expiresAt) &&
    Date.now() - cached.validatedAt < SESSION_REVALIDATE_SECONDS * 1000
  ) {
    return cached;
  }

  return loadSessionFromDatabase(sessionId);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new AuthError(401, "Unauthorized");
  }

  return session;
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await requireSession();
  if (!allowedRoles.includes(session.role)) {
    throw new AuthError(403, "Forbidden");
  }

  return session;
}

export async function requireScopeAccess(resourceType: ScopeResourceType, resourceId: string) {
  const session = await requireSession();

  if (session.role === "super_admin" || session.role === "developer") {
    return session;
  }

  let allowed = false;

  switch (resourceType) {
    case "agency": {
      if (session.role === "admin_agency" || session.role === "insurance_admin") {
        allowed = session.agencyId === resourceId;
      }
      break;
    }

    case "hospital": {
      if (session.role === "hospital_admin") {
        const result = await dbPool.query(
          `SELECT 1
           FROM public.user_role
           WHERE user_id = $1
             AND scope_type = 'HOSPITAL'
             AND scope_id = $2
           LIMIT 1`,
          [session.userId, resourceId]
        );
        allowed = (result.rowCount ?? 0) > 0;
      }
      break;
    }

    case "user": {
      if (SELF_ACCESS_ROLES.has(session.role) && session.userId === resourceId) {
        allowed = true;
      } else if (session.role === "admin_agency" || session.role === "insurance_admin") {
        const result = await dbPool.query(
          `SELECT 1
           FROM public.app_user
           WHERE user_id = $1
             AND agency_id = $2
           LIMIT 1`,
          [resourceId, session.agencyId]
        );
        allowed = (result.rowCount ?? 0) > 0;
      }
      break;
    }

    case "client": {
      if (session.role === "agent" || session.role === "agent_manager") {
        const result = await dbPool.query(
          `SELECT 1
           FROM public.client
           WHERE client_id = $1
             AND agent_id = $2
           LIMIT 1`,
          [resourceId, session.userId]
        );
        allowed = (result.rowCount ?? 0) > 0;
      } else if (session.role === "admin_agency" || session.role === "insurance_admin") {
        const result = await dbPool.query(
          `SELECT 1
           FROM public.client c
           JOIN public.app_user u ON u.user_id = c.agent_id
           WHERE c.client_id = $1
             AND u.agency_id = $2
           LIMIT 1`,
          [resourceId, session.agencyId]
        );
        allowed = (result.rowCount ?? 0) > 0;
      }
      break;
    }

    case "claim": {
      if (session.role === "agent" || session.role === "agent_manager") {
        const result = await dbPool.query(
          `SELECT 1
           FROM public.claim c
           LEFT JOIN public.client cl ON cl.client_id = c.client_id
           WHERE c.claim_id = $1
             AND (
               c.created_by_user_id = $2
               OR c.assigned_agent_id = $2
               OR cl.agent_id = $2
             )
           LIMIT 1`,
          [resourceId, session.userId]
        );
        allowed = (result.rowCount ?? 0) > 0;
      } else if (session.role === "hospital_admin") {
        const result = await dbPool.query(
          `SELECT 1
           FROM public.claim c
           JOIN public.user_role ur
             ON ur.scope_type = 'HOSPITAL'
            AND ur.scope_id = c.hospital_id::text
           WHERE c.claim_id = $1
             AND ur.user_id = $2
           LIMIT 1`,
          [resourceId, session.userId]
        );
        allowed = (result.rowCount ?? 0) > 0;
      } else if (session.role === "admin_agency" || session.role === "insurance_admin") {
        const result = await dbPool.query(
          `SELECT 1
           FROM public.claim c
           LEFT JOIN public.client cl ON cl.client_id = c.client_id
           LEFT JOIN public.app_user u ON u.user_id = cl.agent_id
           WHERE c.claim_id = $1
             AND (
               c.agency_id = $2
               OR u.agency_id = $2
             )
           LIMIT 1`,
          [resourceId, session.agencyId]
        );
        allowed = (result.rowCount ?? 0) > 0;
      }
      break;
    }
  }

  if (!allowed) {
    throw new AuthError(403, "Forbidden");
  }

  return session;
}

/** Ensure the auth_session table exists (runs once per cold start). */
let _tableEnsured = false;
async function ensureAuthSessionTable() {
  if (_tableEnsured) return;
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS public.auth_session (
      session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.app_user(user_id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      user_status TEXT NOT NULL,
      portal TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked BOOLEAN NOT NULL DEFAULT FALSE,
      revoked_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE INDEX IF NOT EXISTS idx_auth_session_user_id ON public.auth_session (user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_session_active ON public.auth_session (user_id, revoked, expires_at);
    CREATE INDEX IF NOT EXISTS idx_auth_session_expires_at ON public.auth_session (expires_at);
  `);
  _tableEnsured = true;
}

export async function createSession(params: {
  userId: string;
  role: Role;
  status: string;
  agencyId?: string | null;
  portal?: string | null;
  rememberMe?: boolean;
}) {
  await ensureAuthSessionTable();

  const sessionId = crypto.randomUUID();
  const ttlSeconds = getSessionTtlSeconds(params.rememberMe);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await dbPool.query(
    `INSERT INTO public.auth_session (
       session_id,
       user_id,
       role,
       user_status,
       portal,
       expires_at,
       last_seen_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [
      sessionId,
      params.userId,
      params.role,
      params.status,
      params.portal ?? null,
      expiresAt.toISOString(),
    ]
  );

  const session: AppSession = {
    sessionId,
    userId: params.userId,
    role: params.role,
    status: params.status,
    portal: params.portal ?? null,
    agencyId: params.agencyId ?? null,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    validatedAt: Date.now(),
  };

  await cacheSession(session);
  return session;
}

export async function revokeSession(sessionId: string) {
  await dbPool.query(
    `UPDATE public.auth_session
     SET revoked = TRUE,
         revoked_at = NOW(),
         updated_at = NOW()
     WHERE session_id = $1
       AND revoked = FALSE`,
    [sessionId]
  );
  await deleteSessionCache(sessionId);
}

export async function revokeUserSessions(userId: string, exceptSessionId?: string) {
  const params: string[] = [userId];
  let query = `
    SELECT session_id
    FROM public.auth_session
    WHERE user_id = $1
      AND revoked = FALSE
  `;

  if (exceptSessionId) {
    params.push(exceptSessionId);
    query += ` AND session_id <> $2`;
  }

  const sessions = await dbPool.query<{ session_id: string }>(query, params);
  await dbPool.query(
    `
      UPDATE public.auth_session
      SET revoked = TRUE,
          revoked_at = NOW(),
          updated_at = NOW()
      WHERE user_id = $1
        AND revoked = FALSE
        ${exceptSessionId ? "AND session_id <> $2" : ""}
    `,
    params
  );

  await Promise.all(sessions.rows.map((row) => deleteSessionCache(row.session_id)));
}

export function applySessionCookie(response: NextResponse, sessionId: string, rememberMe?: boolean) {
  const maxAge = rememberMe ? REMEMBER_ME_TTL_SECONDS : undefined;
  response.cookies.set(AUTH_SESSION_COOKIE, sessionId, getSessionCookieConfig(maxAge));
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    ...getSessionCookieConfig(),
    maxAge: 0,
  });
}

export function clearLegacyAuthCookies(response: NextResponse) {
  for (const prefix of LEGACY_COOKIE_PREFIXES) {
    response.cookies.set(`${prefix}_role`, "", {
      ...getSessionCookieConfig(),
      maxAge: 0,
    });
    response.cookies.set(`${prefix}_user_id`, "", {
      ...getSessionCookieConfig(),
      maxAge: 0,
    });
    response.cookies.set(`${prefix}_status`, "", {
      ...getSessionCookieConfig(),
      maxAge: 0,
    });
  }

  for (const legacyCookie of ["rbac_role", "app_user_id", "user_status"]) {
    response.cookies.set(legacyCookie, "", {
      ...getSessionCookieConfig(),
      maxAge: 0,
    });
  }
}
