import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { deleteCacheByPattern, getJsonCache, setJsonCache } from "@/lib/redis";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedFileName = `${Date.now()}-${crypto.randomUUID()}-${safeOriginalName}`;
    const diskPath = path.join(uploadsDir, storedFileName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(diskPath, fileBuffer);
    const publicUrl = `/uploads/${storedFileName}`;

    const enumRes = await client.query(
      `
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'claim_doc_type'
      ORDER BY e.enumsortorder
      `
    );
    const availableDocTypes = enumRes.rows.map((row) => row.enumlabel as string);
    const preferredDocTypeOrder = [
      "CLAIM_FORM",
      "MEDICAL_DOCUMENT",
      "SUPPORTING_DOC",
      "OTHER",
      "DOKUMEN_PENDUKUNG",
    ];

    const orderedDocTypes = [
      ...preferredDocTypeOrder.filter((candidate) => availableDocTypes.includes(candidate)),
      ...availableDocTypes.filter((candidate) => !preferredDocTypeOrder.includes(candidate)),
    ];

    const usedDocTypeRes = await client.query(
      `
      SELECT doc_type::text AS doc_type
      FROM public.claim_document
      WHERE claim_id = $1
      `,
      [id]
    );
    const usedDocTypes = new Set(usedDocTypeRes.rows.map((row) => row.doc_type as string));

    const candidateDocTypes = orderedDocTypes.filter((candidate) => !usedDocTypes.has(candidate));
    if (candidateDocTypes.length === 0) {
      return NextResponse.json(
        { error: "Semua tipe dokumen untuk klaim ini sudah terpakai. Hapus/replace salah satu dokumen lama jika ingin upload lagi." },
        { status: 400 }
      );
    }
    
    // Try each available doc type. This avoids duplicate-key race when uploads happen close together.
    for (const docType of candidateDocTypes) {
      const result = await client.query(
        `
        INSERT INTO public.claim_document (
          claim_id, doc_type, file_url, uploaded_by_user_id, is_required
        ) VALUES ($1, $2::claim_doc_type, $3, $4, false)
        ON CONFLICT (claim_id, doc_type) DO NOTHING
        RETURNING document_id, file_url, created_at
        `,
        [id, docType, publicUrl, userId]
      );

      if (result.rows.length > 0) {
        await deleteCacheByPattern(`claims:agent:documents:${id}`);
        await deleteCacheByPattern(`claims:agent:detail:${id}:*`);
        await deleteCacheByPattern(`claims:hospital:detail:${id}`);
        await deleteCacheByPattern("claims:hospital:list:*");
        return NextResponse.json({ document: result.rows[0] });
      }
    }

    return NextResponse.json(
      { error: "Gagal memilih tipe dokumen unik. Coba ulang upload." },
      { status: 409 }
    );

  } catch (error: any) {
    console.error("Upload document failed", error);
    if (error?.code === "22P02") {
      return NextResponse.json(
        { error: "Nilai enum dokumen tidak cocok dengan konfigurasi database." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to upload document" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const { id } = await params;
        const cacheKey = `claims:agent:documents:${id}`;
        const cached = await getJsonCache<{ documents: unknown[] }>(cacheKey);
        if (cached) {
            return NextResponse.json(cached);
        }

        const result = await client.query(`
            SELECT document_id, doc_type, file_url, created_at, status
            FROM public.claim_document
            WHERE claim_id = $1
            ORDER BY created_at DESC
        `, [id]);

        const response = { documents: result.rows };
        await setJsonCache(cacheKey, response, 30);
        return NextResponse.json(response);
    } catch (error) {
        console.error("Fetch documents failed", error);
        return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    } finally {
        client.release();
    }
}
