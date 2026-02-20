import { NextRequest, NextResponse } from "next/server"
import { dbPool } from "@/lib/db"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const query = searchParams.get("q") || ""
        const specialization = searchParams.get("specialization") || ""
        const country = searchParams.get("country") || ""
        const hospital = searchParams.get("hospital") || ""
        const featured = searchParams.get("featured") === "true"
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "20")
        const offset = (page - 1) * limit

        const conditions: string[] = []
        const params: (string | boolean | number)[] = []
        let paramIdx = 1

        if (query) {
            conditions.push(`to_tsvector('simple', name || ' ' || specialization || ' ' || hospital || ' ' || COALESCE(subspecialization, '') || ' ' || COALESCE(notable_for, '')) @@ plainto_tsquery('simple', $${paramIdx})`)
            params.push(query)
            paramIdx++
        }

        if (specialization) {
            conditions.push(`specialization ILIKE $${paramIdx}`)
            params.push(`%${specialization}%`)
            paramIdx++
        }

        if (country) {
            conditions.push(`country = $${paramIdx}`)
            params.push(country)
            paramIdx++
        }

        if (hospital) {
            conditions.push(`hospital ILIKE $${paramIdx}`)
            params.push(`%${hospital}%`)
            paramIdx++
        }

        if (featured) {
            conditions.push(`is_featured = $${paramIdx}`)
            params.push(true)
            paramIdx++
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

        const [rows, countResult] = await Promise.all([
            dbPool.query(
                `SELECT * FROM doctors ${whereClause} ORDER BY is_featured DESC, rating DESC, experience_years DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
                [...params, limit, offset]
            ),
            dbPool.query(
                `SELECT COUNT(*) FROM doctors ${whereClause}`,
                params
            )
        ])

        return NextResponse.json({
            doctors: rows.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit,
        })
    } catch (error) {
        console.error("Error fetching doctors:", error)
        return NextResponse.json({ error: "Failed to fetch doctors" }, { status: 500 })
    }
}
