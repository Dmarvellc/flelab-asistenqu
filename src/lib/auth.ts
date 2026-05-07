import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { ensureRedisConnection, redisClient } from "@/lib/redis";
import { normalizeRole, type Role } from "@/lib/rbac";

export const AUTH_SESSION_COOKIE = "session_id";

export const PORTAL_COOKIE_NAMES = {
  agent: "session_agent",
  hospital: "session_hospital",
  developer: "session_developer",
  admin_agency: "session_admin_agency",
} as const;

export type PortalKey = keyof typeof PORTAL_COOKIE_NAMES;

export function getPortalCookieName(portal: string | null | undefined): string | null {
  if (!portal) return null;
  return PORTAL_COOKIE_NAMES[portal as PortalKey] ?? null;
}

export const ALL_PORTAL_COOKIE_NAMES = Object.values(PORTAL_COOKIE_NAMES);

const SESSION_CACHE_PREFIX = "auth:session";
const DEFAULT_SESSION_TTL_SECONDS = 12 * 60 * 60;
const REMEMBER_ME_TTL_SECONDS = 30 * 24 * 60 * 60;
const SESSION_REVALIDATE_SECONDS = 300; // 5 minutes instead of 60 seconds
const SESSION_MEMORY_CACHE_LIMIT = 2_000;

// Query deduplication cache — prevent thundering herd on cache miss
const inFlightQueries = new Map<string, Promise<AppSession | null>>();

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
  agencySlug: string | null;
  agencyMemberRole: string | null;
  createdAt: string;
  expiresAt: string;
  validatedAt: number;
};

const inMemorySessions = new Map<string, AppSession>();

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
      agencySlug: parsed.agencySlug ?? null,
      agencyMemberRole: parsed.agencyMemberRole ?? null,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      expiresAt: parsed.expiresAt,
      validatedAt: parsed.validatedAt ?? 0,
    };
  } catch {
    return null;
  }
}

async function cacheSession(session: AppSession) {
  if (inMemorySessions.size >= SESSION_MEMORY_CACHE_LIMIT) {
    const oldestKey = inMemorySessions.keys().next().value;
    if (oldestKey) inMemorySessions.delete(oldestKey);
  }
  inMemorySessions.set(session.sessionId, session);

  if (!redisClient) return;
  const ttlSeconds = Math.max(
    Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
    1
  );

  try {
    const ok = await ensureRedisConnection();
    if (!ok) return;
    await redisClient.set(getSessionCacheKey(session.sessionId), JSON.stringify(session), {
      EX: ttlSeconds,
    });
  } catch {
    // Redis caching is optional — fail silently
  }
}

async function deleteSessionCache(sessionId: string) {
  inMemorySessions.delete(sessionId);
  if (!redisClient) return;
  try {
    const ok = await ensureRedisConnection();
    if (!ok) return;
    await redisClient.del(getSessionCacheKey(sessionId));
  } catch {
    // Fail silently
  }
}

async function getCachedSession(sessionId: string) {
  const memory = inMemorySessions.get(sessionId);
  if (
    memory &&
    !isSessionExpired(memory.expiresAt) &&
    Date.now() - memory.validatedAt < SESSION_REVALIDATE_SECONDS * 1000
  ) {
    return memory;
  }

  if (!redisClient) return null;
  try {
    const ok = await ensureRedisConnection();
    if (!ok) return null;
    const raw = await redisClient.get(getSessionCacheKey(sessionId));
    return raw ? parseCachedSession(raw) : null;
  } catch {
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
       u.agency_id,
       a.slug AS agency_slug,
       am.role AS agency_member_role
     FROM public.auth_session s
     JOIN public.app_user u ON u.user_id = s.user_id
     LEFT JOIN public.agency a ON a.agency_id = u.agency_id
     LEFT JOIN public.agency_member am ON am.user_id = u.user_id AND am.agency_id = u.agency_id
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
    agency_slug: string | null;
    agency_member_role: string | null;
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
    agencySlug: row.agency_slug,
    agencyMemberRole: row.agency_member_role,
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    validatedAt: Date.now(),
  };

  // Non-blocking touch; never hold API response for this write.
  // Use setTimeout to prevent blocking and ensure connection cleanup
  setTimeout(() => {
    dbPool
      .query(
        `UPDATE public.auth_session
         SET last_seen_at = NOW(), updated_at = NOW()
         WHERE session_id = $1`,
        [sessionId]
      )
      .catch(() => {});
  }, 0);

  if (inMemorySessions.size >= SESSION_MEMORY_CACHE_LIMIT) {
    // FIFO-ish cleanup to avoid unbounded growth in long-running processes.
    const oldestKey = inMemorySessions.keys().next().value;
    if (oldestKey) inMemorySessions.delete(oldestKey);
  }
  inMemorySessions.set(session.sessionId, session);
  await cacheSession(session);
  return session;
}

async function loadAndValidateSession(
  sessionId: string,
  forceRevalidate?: boolean
): Promise<AppSession | null> {
  const cached = await getCachedSession(sessionId);
  if (
    cached &&
    !forceRevalidate &&
    !isSessionExpired(cached.expiresAt) &&
    Date.now() - cached.validatedAt < SESSION_REVALIDATE_SECONDS * 1000
  ) {
    return cached;
  }

  // Deduplicate concurrent queries for same sessionId to prevent connection pool exhaustion
  const inFlightKey = `session:${sessionId}`;
  if (inFlightQueries.has(inFlightKey)) {
    return inFlightQueries.get(inFlightKey)!;
  }

  const queryPromise = loadSessionFromDatabase(sessionId);
  inFlightQueries.set(inFlightKey, queryPromise);

  try {
    return await queryPromise;
  } finally {
    inFlightQueries.delete(inFlightKey);
  }
}

/**
 * Read session for a specific portal. Multi-portal aware: each portal has its
 * own cookie so a user can be logged into developer + agent at the same time.
 *
 * If `portal` is omitted, we try to derive it from the `x-portal` request
 * header (set by middleware), then fall back to scanning every portal cookie
 * and returning the first valid session. This keeps existing call sites
 * (`getSession()` with no args) working.
 */
export async function getSession(options?: {
  forceRevalidate?: boolean;
  portal?: string | null;
}): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const explicitPortal = options?.portal ?? null;

  // 1. Explicit portal — read that portal's cookie only
  if (explicitPortal) {
    const cookieName = getPortalCookieName(explicitPortal);
    if (!cookieName) return null;
    const sid = cookieStore.get(cookieName)?.value;
    if (!sid) return null;
    return loadAndValidateSession(sid, options?.forceRevalidate);
  }

  // 2. Derive portal from middleware-injected header
  try {
    const { headers } = await import("next/headers");
    const headerStore = await headers();
    const headerPortal = headerStore.get("x-portal");
    if (headerPortal) {
      const cookieName = getPortalCookieName(headerPortal);
      if (cookieName) {
        const sid = cookieStore.get(cookieName)?.value;
        if (sid) {
          const s = await loadAndValidateSession(sid, options?.forceRevalidate);
          if (s) return s;
        }
      }
    }
  } catch {
    // headers() can fail outside a request scope — ignore and fall through
  }

  // 3. Scan every portal cookie; return the first valid session.
  for (const cookieName of ALL_PORTAL_COOKIE_NAMES) {
    const sid = cookieStore.get(cookieName)?.value;
    if (!sid) continue;
    const s = await loadAndValidateSession(sid, options?.forceRevalidate);
    if (s) return s;
  }

  // 4. Backward-compat: legacy single-cookie session
  const legacySid = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (legacySid) {
    const s = await loadAndValidateSession(legacySid, options?.forceRevalidate);
    if (s) return s;
  }

  return null;
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
            AND ur.scope_id = c.hospital_id
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
  agencySlug?: string | null;
  agencyMemberRole?: string | null;
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
    agencySlug: params.agencySlug ?? null,
    agencyMemberRole: params.agencyMemberRole ?? null,
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

export function applySessionCookie(
  response: NextResponse,
  sessionId: string,
  rememberMe?: boolean,
  portal?: string | null,
  agencySlug?: string | null
) {
  const maxAge = rememberMe ? REMEMBER_ME_TTL_SECONDS : undefined;

  // Per-portal cookie. Each portal has its own cookie so a user can be
  // logged in to multiple portals simultaneously across browser tabs.
  const portalCookie = getPortalCookieName(portal);
  if (portalCookie) {
    response.cookies.set(portalCookie, sessionId, getSessionCookieConfig(maxAge));
  }

  // Agency slug cookie is portal-scoped to agent only — namespaced so it
  // doesn't collide if user is also logged in as a different role.
  if (agencySlug && portal === "agent") {
    response.cookies.set(
      "session_agency_slug_agent",
      agencySlug,
      getSessionCookieConfig(maxAge),
    );
  }
}

/**
 * Clear session cookies. If `portal` given, only clear that portal so other
 * portals stay logged in. If omitted, clear everything (used during full
 * sign-out / legacy migration).
 */
export function clearSessionCookie(
  response: NextResponse,
  portal?: string | null,
) {
  if (portal) {
    const portalCookie = getPortalCookieName(portal);
    if (portalCookie) {
      response.cookies.set(portalCookie, "", {
        ...getSessionCookieConfig(),
        maxAge: 0,
      });
    }
    if (portal === "agent") {
      response.cookies.set("session_agency_slug_agent", "", {
        ...getSessionCookieConfig(),
        maxAge: 0,
      });
    }
    return;
  }

  // No portal specified → clear everything (legacy + all portal cookies)
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    ...getSessionCookieConfig(),
    maxAge: 0,
  });
  response.cookies.set("session_portal", "", {
    ...getSessionCookieConfig(),
    maxAge: 0,
  });
  response.cookies.set("session_agency_slug", "", {
    ...getSessionCookieConfig(),
    maxAge: 0,
  });
  response.cookies.set("session_agency_slug_agent", "", {
    ...getSessionCookieConfig(),
    maxAge: 0,
  });
  for (const cookieName of ALL_PORTAL_COOKIE_NAMES) {
    response.cookies.set(cookieName, "", {
      ...getSessionCookieConfig(),
      maxAge: 0,
    });
  }
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
