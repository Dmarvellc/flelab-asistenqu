import "server-only";
import { dbPool } from "@/lib/db";
import { getJsonCache, setJsonCache } from "@/lib/redis";

// ─── Agency Branding Type ─────────────────────────────────
export interface AgencyBranding {
  agencyId: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarBg: string;
  sidebarText: string;
  loginBg: string;
  status: string;
}

const DEFAULT_BRANDING: Omit<AgencyBranding, "agencyId" | "slug" | "name" | "status"> = {
  logoUrl: null,
  primaryColor: "#111827",
  secondaryColor: "#374151",
  accentColor: "#3B82F6",
  sidebarBg: "#FFFFFF",
  sidebarText: "#111827",
  loginBg: "#F9FAFB",
};

const CACHE_TTL = 300; // 5 minutes

/**
 * Resolve agency by slug. Returns null if not found.
 * Cached in Redis for performance.
 */
export async function resolveAgencyBySlug(slug: string): Promise<AgencyBranding | null> {
  if (!slug) return null;

  const cacheKey = `agency:slug:${slug.toLowerCase()}`;
  const cached = await getJsonCache<AgencyBranding>(cacheKey);
  if (cached) return cached;

  const result = await dbPool.query(
    `SELECT agency_id, slug, name, logo_url, primary_color, secondary_color,
            accent_color, sidebar_bg, sidebar_text, login_bg, status
     FROM public.agency
     WHERE slug = $1 AND status = 'ACTIVE'
     LIMIT 1`,
    [slug.toLowerCase()]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const branding: AgencyBranding = {
    agencyId: row.agency_id,
    slug: row.slug,
    name: row.name,
    logoUrl: row.logo_url || DEFAULT_BRANDING.logoUrl,
    primaryColor: row.primary_color || DEFAULT_BRANDING.primaryColor,
    secondaryColor: row.secondary_color || DEFAULT_BRANDING.secondaryColor,
    accentColor: row.accent_color || DEFAULT_BRANDING.accentColor,
    sidebarBg: row.sidebar_bg || DEFAULT_BRANDING.sidebarBg,
    sidebarText: row.sidebar_text || DEFAULT_BRANDING.sidebarText,
    loginBg: row.login_bg || DEFAULT_BRANDING.loginBg,
    status: row.status,
  };

  await setJsonCache(cacheKey, branding, CACHE_TTL);
  return branding;
}

/**
 * Resolve agency by ID.
 */
export async function resolveAgencyById(agencyId: string): Promise<AgencyBranding | null> {
  if (!agencyId) return null;

  const cacheKey = `agency:id:${agencyId}`;
  const cached = await getJsonCache<AgencyBranding>(cacheKey);
  if (cached) return cached;

  const result = await dbPool.query(
    `SELECT agency_id, slug, name, logo_url, primary_color, secondary_color,
            accent_color, sidebar_bg, sidebar_text, login_bg, status
     FROM public.agency
     WHERE agency_id = $1
     LIMIT 1`,
    [agencyId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const branding: AgencyBranding = {
    agencyId: row.agency_id,
    slug: row.slug || "",
    name: row.name,
    logoUrl: row.logo_url || DEFAULT_BRANDING.logoUrl,
    primaryColor: row.primary_color || DEFAULT_BRANDING.primaryColor,
    secondaryColor: row.secondary_color || DEFAULT_BRANDING.secondaryColor,
    accentColor: row.accent_color || DEFAULT_BRANDING.accentColor,
    sidebarBg: row.sidebar_bg || DEFAULT_BRANDING.sidebarBg,
    sidebarText: row.sidebar_text || DEFAULT_BRANDING.sidebarText,
    loginBg: row.login_bg || DEFAULT_BRANDING.loginBg,
    status: row.status,
  };

  await setJsonCache(cacheKey, branding, CACHE_TTL);
  return branding;
}

/**
 * Get the agency slug for a user (from session).
 */
export async function getAgencySlugForUser(userId: string): Promise<string | null> {
  const result = await dbPool.query(
    `SELECT a.slug
     FROM public.app_user u
     JOIN public.agency a ON a.agency_id = u.agency_id
     WHERE u.user_id = $1 AND a.slug IS NOT NULL
     LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.slug || null;
}

/**
 * Get agency member info for a user within their agency.
 */
export async function getAgencyMemberInfo(userId: string, agencyId: string) {
  const result = await dbPool.query(
    `SELECT member_id, role, permissions, status
     FROM public.agency_member
     WHERE user_id = $1 AND agency_id = $2
     LIMIT 1`,
    [userId, agencyId]
  );

  if (result.rows.length === 0) return null;

  return {
    memberId: result.rows[0].member_id as string,
    role: result.rows[0].role as string,
    permissions: (result.rows[0].permissions || []) as string[],
    status: result.rows[0].status as string,
  };
}

/**
 * Update agency branding.
 */
export async function updateAgencyBranding(
  agencyId: string,
  data: Partial<Omit<AgencyBranding, "agencyId" | "status">>
) {
  const sets: string[] = [];
  const values: (string | null)[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx++}`); values.push(data.name); }
  if (data.slug !== undefined) { sets.push(`slug = $${idx++}`); values.push(data.slug.toLowerCase()); }
  if (data.logoUrl !== undefined) { sets.push(`logo_url = $${idx++}`); values.push(data.logoUrl); }
  if (data.primaryColor !== undefined) { sets.push(`primary_color = $${idx++}`); values.push(data.primaryColor); }
  if (data.secondaryColor !== undefined) { sets.push(`secondary_color = $${idx++}`); values.push(data.secondaryColor); }
  if (data.accentColor !== undefined) { sets.push(`accent_color = $${idx++}`); values.push(data.accentColor); }
  if (data.sidebarBg !== undefined) { sets.push(`sidebar_bg = $${idx++}`); values.push(data.sidebarBg); }
  if (data.sidebarText !== undefined) { sets.push(`sidebar_text = $${idx++}`); values.push(data.sidebarText); }
  if (data.loginBg !== undefined) { sets.push(`login_bg = $${idx++}`); values.push(data.loginBg); }

  if (sets.length === 0) return;

  sets.push(`updated_at = NOW()`);
  values.push(agencyId);

  await dbPool.query(
    `UPDATE public.agency SET ${sets.join(", ")} WHERE agency_id = $${idx}`,
    values
  );

  // Invalidate cache
  const { deleteCacheByPattern } = await import("@/lib/redis");
  await deleteCacheByPattern(`agency:*`);
}
