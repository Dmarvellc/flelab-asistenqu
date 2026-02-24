import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;
    try {
        const client = await dbPool.connect();
        const result = await client.query("SELECT user_id, email, role, status, created_at FROM app_user WHERE user_id = $1", [id]);
        client.release();

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;
    const body = await request.json();
    const { role, status } = body;

    try {
        const client = await dbPool.connect();
        // Only update provided fields
        const updates: string[] = [];
        const values: any[] = [];
        let query = "UPDATE app_user SET ";

        if (role) {
            updates.push(`role = $${updates.length + 1}`);
            values.push(role);
        }
        if (status) {
            updates.push(`status = $${updates.length + 1}`);
            values.push(status);
        }

        if (updates.length === 0) {
            client.release();
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        query += updates.join(", ") + ` WHERE user_id = $${updates.length + 1} RETURNING *`;
        values.push(id);

        const result = await client.query(query, values);

        if (status) {
            try {
                // Silently keep agent table in sync if the user happens to be an agent
                await client.query("UPDATE agent SET status = $1 WHERE agent_id = $2", [status, id]);
            } catch (e) {
                // Ignore errors if table doesn't exist or other issues, as app_user is the source of truth
            }
        }

        client.release();

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;
    try {
        const client = await dbPool.connect();
        await client.query("DELETE FROM app_user WHERE user_id = $1", [id]);
        client.release();
        return NextResponse.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
