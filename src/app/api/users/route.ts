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

    const offset = (page - 1) * limit;

    try {
        const client = await dbPool.connect();

        // Build query
        let whereClause = "";
        const queryParams: any[] = [];

        if (search) {
            whereClause = "WHERE email ILIKE $1 OR role ILIKE $1";
            queryParams.push(`%${search}%`);
        }

        // Count total
        const countQuery = `SELECT COUNT(*) FROM app_user ${whereClause}`;
        const countRes = await client.query(countQuery, queryParams);
        const totalUsers = parseInt(countRes.rows[0].count);

        // Fetch users with pagination
        // Note: We need to handle the $1 parameter index correctly if search exists
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
