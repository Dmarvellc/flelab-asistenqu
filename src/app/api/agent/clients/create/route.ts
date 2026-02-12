import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  const client = await dbPool.connect();

  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      fullName,
      nik,
      birthDate,
      gender,
      phoneNumber,
      email,
      address,
      policyNumber,
      insuranceCompany,
      productName,
      startDate,
      endDate,
      sumInsured,
      premiumAmount,
      policyFileBase64,
    } = body;

    let policyUrl: string | null = null;

    // Process Policy File if exists
    if (policyFileBase64) {
      try {
        // Extract base64 data (format: "data:image/jpeg;base64,...")
        const matches = policyFileBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (matches && matches.length === 3) {
          const type = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');

          // Determine extension
          let ext = ".bin";
          if (type.includes("jpeg") || type.includes("jpg")) ext = ".jpg";
          else if (type.includes("png")) ext = ".png";
          else if (type.includes("pdf")) ext = ".pdf";

          const uploadsDir = path.join(process.cwd(), "public", "uploads", "policies");
          await mkdir(uploadsDir, { recursive: true });

          const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
          const diskPath = path.join(uploadsDir, fileName);

          await writeFile(diskPath, buffer);
          policyUrl = `/uploads/policies/${fileName}`;
        }
      } catch (fileError) {
        console.error("Failed to save policy file", fileError);
        // Continue without file if needed, or fail - let's continue but log it
      }
    }

    await client.query("BEGIN");

    // 1. Ensure Agent Exists (using userId as agentId for simplicity in this demo)
    // First, check if insurance exists (needed for agent)
    let insuranceId;
    const insuranceRes = await client.query("SELECT insurance_id FROM public.insurance LIMIT 1");
    if (insuranceRes.rows.length > 0) {
      insuranceId = insuranceRes.rows[0].insurance_id;
    } else {
      const newIns = await client.query(
        "INSERT INTO public.insurance (insurance_name) VALUES ($1) RETURNING insurance_id",
        ["Default Insurance"]
      );
      insuranceId = newIns.rows[0].insurance_id;
    }

    // Check/Create Agent
    const agentRes = await client.query("SELECT agent_id FROM public.agent WHERE agent_id = $1", [userId]);
    let agentId = userId;

    if (agentRes.rows.length === 0) {
      // Get user's name to use as agent name
      const userPersonRes = await client.query(`
        SELECT p.full_name 
        FROM public.user_person_link upl
        JOIN public.person p ON upl.person_id = p.person_id
        WHERE upl.user_id = $1
      `, [userId]);

      const agentName = userPersonRes.rows[0]?.full_name || "Agent " + userId.substring(0, 8);

      await client.query(
        `INSERT INTO public.agent (agent_id, agent_name, insurance_id, status)
         VALUES ($1, $2, $3, 'ACTIVE')`,
        [agentId, agentName, insuranceId]
      );
    }

    // 2. Create Person (Client)
    const personRes = await client.query(
      `INSERT INTO public.person (full_name, id_card, phone_number, address, birth_date, gender)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING person_id`,
      [fullName, nik, phoneNumber, address, birthDate || null, gender]
    );
    const personId = personRes.rows[0].person_id;

    // 3. Create Client Record
    const clientRes = await client.query(
      `INSERT INTO public.client (agent_id, person_id, status)
       VALUES ($1, $2, 'ACTIVE')
       RETURNING client_id`,
      [agentId, personId]
    );
    const clientId = clientRes.rows[0].client_id;

    // 4. Create Contract
    // Check if contract number exists
    const existingContract = await client.query(
      "SELECT contract_id FROM public.contract WHERE contract_number = $1",
      [policyNumber]
    );

    if (existingContract.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Nomor polis sudah terdaftar dalam sistem." }, { status: 409 });
    }

    const contractRes = await client.query(
      `INSERT INTO public.contract (
         client_id, 
         contract_number, 
         contract_product, 
         contract_startdate, 
         contract_duedate, 
         status,
         policy_url
       )
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6)
       RETURNING contract_id`,
      [
        clientId,
        policyNumber || `POL-${Date.now()}`, // Fallback if empty
        productName,
        startDate || null,
        endDate || null,
        policyUrl
      ]
    );
    const contractId = contractRes.rows[0].contract_id;

    // 5. Create Contract Detail
    await client.query(
      `INSERT INTO public.contract_detail (contract_id, sum_insured, payment_type)
       VALUES ($1, $2, $3)`,
      [
        contractId,
        parseFloat(sumInsured) || 0,
        'MONTHLY' // Default or parse from AI
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      clientId,
      contractId
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create client failed", error);
    return NextResponse.json({ error: "Gagal membuat data klien. Silakan coba lagi." }, { status: 500 });
  } finally {
    client.release();
  }
}
