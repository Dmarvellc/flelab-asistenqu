import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "ASC" : "DESC";
    const roleFilter = searchParams.get("role") || "";
    const statusFilter = searchParams.get("status") || "";

    const offset = (page - 1) * limit;

    try {
        const client = await dbPool.connect();

        // Build query
        const conditions: string[] = [];
        const queryParams: any[] = [];

        if (search) {
            queryParams.push(`%${search}%`);
            conditions.push(`(email ILIKE $${queryParams.length} OR role ILIKE $${queryParams.length})`);
        }
        if (roleFilter) {
            queryParams.push(roleFilter);
            conditions.push(`role = $${queryParams.length}`);
        }
        if (statusFilter) {
            queryParams.push(statusFilter);
            conditions.push(`status = $${queryParams.length}`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // Count total
        const countQuery = `SELECT COUNT(*) FROM app_user ${whereClause}`;
        const countRes = await client.query(countQuery, queryParams);
        const totalUsers = parseInt(countRes.rows[0].count);

        // Fetch users with pagination
        const userQuery = `
      SELECT user_id, email, role, status, created_at 
      FROM app_user 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

        const userRes = await client.query(userQuery, [...queryParams, limit, offset]);

        client.release();

        return NextResponse.json({
            data: userRes.rows,
            meta: {
                page,
                limit,
                total: totalUsers,
                totalPages: Math.ceil(totalUsers / limit),
            },
        });

    } catch (error) {
        console.error("Failed to fetch users:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
