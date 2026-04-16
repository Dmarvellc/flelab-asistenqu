import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireRole } from "@/lib/auth";
import { dbPool } from "@/lib/db";
import { roles } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ALLOWED_USER_MANAGEMENT_ROLES = ["developer", "super_admin"] as const;
const USER_STATUSES = ["ACTIVE", "PENDING", "REJECTED", "SUSPENDED"] as const;

const sortColumnMap = {
  created_at: "u.created_at",
  email: "u.email",
  role: "u.role",
  status: "u.status",
} as const;

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  sortBy: z.enum(["created_at", "email", "role", "status"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  role: z.enum(roles).optional(),
  status: z.enum(USER_STATUSES).optional(),
});

function toErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  console.error("Failed to fetch users:", error);
  return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    await requireRole([...ALLOWED_USER_MANAGEMENT_ROLES]);

    const url = new URL(request.url);
    const parsedQuery = listUsersQuerySchema.parse({
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      sortBy: url.searchParams.get("sortBy") ?? undefined,
      sortOrder: url.searchParams.get("sortOrder") ?? undefined,
      role: url.searchParams.get("role") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });

    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (parsedQuery.search) {
      params.push(`%${parsedQuery.search}%`);
      const searchParam = `$${params.length}`;
      conditions.push(`(u.email ILIKE ${searchParam} OR u.role ILIKE ${searchParam})`);
    }

    if (parsedQuery.role) {
      params.push(parsedQuery.role);
      conditions.push(`u.role = $${params.length}`);
    }

    if (parsedQuery.status) {
      params.push(parsedQuery.status);
      conditions.push(`u.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sortColumn = sortColumnMap[parsedQuery.sortBy];
    const sortDirection = parsedQuery.sortOrder.toUpperCase();

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM public.app_user u
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        u.user_id,
        u.email,
        u.role,
        u.status,
        u.created_at,
        u.approved_at,
        u.approved_by,
        u.agency_id
      FROM public.app_user u
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const client = await dbPool.connect();
    try {
      const [countRes, usersRes] = await Promise.all([
        client.query<{ total: number }>(countQuery, params),
        client.query(dataQuery, [...params, parsedQuery.limit, offset]),
      ]);

      const totalUsers = Number(countRes.rows[0]?.total ?? 0);
      return NextResponse.json({
        data: usersRes.rows,
        meta: {
          page: parsedQuery.page,
          limit: parsedQuery.limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / parsedQuery.limit),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
