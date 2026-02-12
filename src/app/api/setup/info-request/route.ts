import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET() {
  const client = await dbPool.connect();
  try {
    // 1. Create claim_info_request table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.claim_info_request (
        request_id uuid NOT NULL DEFAULT gen_random_uuid(),
        claim_id uuid NOT NULL,
        created_by_user_id uuid,
        status text NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED
        form_schema jsonb NOT NULL, -- Array of field definitions
        response_data jsonb, -- Key-value pairs of responses
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT claim_info_request_pkey PRIMARY KEY (request_id),
        CONSTRAINT claim_info_request_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claim(claim_id)
      );
    `);

    // 2. Add INFO_REQUESTED to claim_status enum
    // We need to check if it exists first to avoid error, or just catch the error
    try {
      await client.query(`ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'INFO_REQUESTED';`);
      await client.query(`ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'INFO_SUBMITTED';`);
    } catch (e) {
      console.log("Enum might already exist or not be alterable this way", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setup failed", error);
    return NextResponse.json({ error: "Setup failed", details: error }, { status: 500 });
  } finally {
    client.release();
  }
}
