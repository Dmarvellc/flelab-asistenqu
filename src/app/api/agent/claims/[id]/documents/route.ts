import crypto from "crypto";
import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { type PoolClient } from "pg";
import { AuthError, requireSession } from "@/lib/auth";
import { type Role } from "@/lib/rbac";
import { dbPool } from "@/lib/db";
import { deleteCacheByPattern, getJsonCache, setJsonCache } from "@/lib/redis";
import {
  getSupabaseAdmin,
  getSupabaseAdminConfigError,
  hasSupabaseAdminConfig,
} from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// Cache claim_document column names in memory — schema doesn't change at runtime
let claimDocumentColumnsCache: Set<string> | null = null;

const claimIdSchema = z.string().uuid();
const allowedRoles = ["agent", "agent_manager", "super_admin", "developer"] as const;
const CLAIM_DOCUMENTS_BUCKET =
  process.env.SUPABASE_CLAIM_DOCUMENTS_BUCKET ?? "claim-documents";
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const allowedDocumentMimeTypes = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const preferredDocTypeOrder = [
  "CLAIM_FORM",
  "MEDICAL_DOCUMENT",
  "SUPPORTING_DOC",
  "OTHER",
  "DOKUMEN_PENDUKUNG",
] as const;

type AllowedRole = (typeof allowedRoles)[number];

type AuthorizedClaimSummary = {
  claim_id: string;
  status: string;
  stage: string | null;
  updated_at: string;
};

type DocumentRow = {
  document_id: string;
  doc_type: string;
  file_url: string;
  created_at: string;
  status: string | null;
};

class AgentClaimDocumentError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AgentClaimDocumentError";
    this.status = status;
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof AgentClaimDocumentError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  console.error("Agent claim documents route failed", error);
  return NextResponse.json({ error: "Request failed" }, { status: 500 });
}

function assertAllowedRole(role: Role): asserts role is AllowedRole {
  if (!allowedRoles.includes(role as AllowedRole)) {
    throw new AuthError(403, "Forbidden");
  }
}

function sanitizeBaseFileName(fileName: string) {
  const baseName = path.basename(fileName, path.extname(fileName));
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return sanitized.slice(0, 80) || "document";
}

function getSafeExtension(file: File) {
  const mimeExtension = allowedDocumentMimeTypes.get(file.type);
  if (mimeExtension) {
    return mimeExtension;
  }

  const rawExtension = path.extname(file.name).replace(".", "").toLowerCase();
  if (["pdf", "jpg", "jpeg", "png", "webp"].includes(rawExtension)) {
    return rawExtension === "jpeg" ? "jpg" : rawExtension;
  }

  return null;
}

function validateUploadedFile(file: unknown) {
  if (!(file instanceof File)) {
    throw new AgentClaimDocumentError(400, "No file uploaded");
  }

  if (file.size <= 0) {
    throw new AgentClaimDocumentError(400, "Uploaded file is empty");
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new AgentClaimDocumentError(400, "Document exceeds maximum allowed size");
  }

  if (!allowedDocumentMimeTypes.has(file.type)) {
    throw new AgentClaimDocumentError(400, "Unsupported document type");
  }

  const safeExtension = getSafeExtension(file);
  if (!safeExtension) {
    throw new AgentClaimDocumentError(400, "Unsupported file extension");
  }

  return {
    file,
    safeExtension,
    sanitizedBaseName: sanitizeBaseFileName(file.name),
  };
}

async function getAuthorizedAgentClaim(
  client: PoolClient,
  claimId: string,
  session: { role: Role; userId: string },
  options?: { forUpdate?: boolean }
) {
  const lockClause = options?.forUpdate ? "FOR UPDATE OF c" : "";

  const result = await client.query<AuthorizedClaimSummary>(
    `
      SELECT
        c.claim_id,
        c.status,
        c.stage,
        c.updated_at
      FROM public.claim c
      LEFT JOIN public.client cl ON cl.client_id = c.client_id
      WHERE c.claim_id = $1
        AND (
          $2 IN ('super_admin', 'developer')
          OR (
            $2 IN ('agent', 'agent_manager')
            AND (
              c.created_by_user_id = $3
              OR c.assigned_agent_id = $3
              OR cl.agent_id = $3
            )
          )
        )
      ${lockClause}
    `,
    [claimId, session.role, session.userId]
  );

  return result.rows[0] ?? null;
}

async function getAvailableDocumentTypes(client: PoolClient, claimId: string) {
  const enumRes = await client.query<{ enumlabel: string }>(
    `
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'claim_doc_type'
      ORDER BY e.enumsortorder
    `
  );

  const availableDocTypes = enumRes.rows.map((row) => row.enumlabel);
  const orderedDocTypes = [
    ...preferredDocTypeOrder.filter((candidate) => availableDocTypes.includes(candidate)),
    ...availableDocTypes.filter((candidate) => !preferredDocTypeOrder.includes(candidate as never)),
  ];

  const usedDocTypeRes = await client.query<{ doc_type: string }>(
    `
      SELECT doc_type::text AS doc_type
      FROM public.claim_document
      WHERE claim_id = $1
    `,
    [claimId]
  );

  const usedDocTypes = new Set(usedDocTypeRes.rows.map((row) => row.doc_type));
  return orderedDocTypes.filter((candidate) => !usedDocTypes.has(candidate));
}

async function getOptionalClaimDocumentColumns(client: PoolClient) {
  if (claimDocumentColumnsCache) return claimDocumentColumnsCache;

  const result = await client.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'claim_document'
    `
  );

  claimDocumentColumnsCache = new Set(result.rows.map((row) => row.column_name));
  return claimDocumentColumnsCache;
}

async function cleanupUploadedDocument(storagePath: string) {
  if (!hasSupabaseAdminConfig()) {
    return;
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.storage.from(CLAIM_DOCUMENTS_BUCKET).remove([storagePath]);
  } catch (error) {
    console.error("Failed to clean up uploaded claim document", { storagePath, error });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();
  let uploadedStoragePath: string | null = null;

  try {
    const session = await requireSession();
    assertAllowedRole(session.role);

    const { id } = await context.params;
    const claimId = claimIdSchema.parse(id);

    const formData = await request.formData();
    const uploadedFile = formData.get("file");
    const validatedFile = validateUploadedFile(uploadedFile);
    const file = validatedFile.file;

    const preflightClaim = await getAuthorizedAgentClaim(client, claimId, session);
    if (!preflightClaim) {
      throw new AgentClaimDocumentError(404, "Claim not found");
    }

    let publicUrl = "";
    let storageFileName: string | null = null;
    if (!hasSupabaseAdminConfig()) {
      if (process.env.NODE_ENV === "production") {
        // Never accept claim documents without real storage in production.
        throw new AgentClaimDocumentError(
          503,
          "Document storage is not configured. Upload temporarily unavailable."
        );
      }
      console.warn("Supabase not configured, faking document upload for", file.name, "(DEV ONLY)");
      publicUrl = "https://placehold.co/800x1200?text=Mock+Document";
      uploadedStoragePath = `claims/${claimId}/documents/mock-${Date.now()}`;
      storageFileName = file.name;
    } else {
      const buffer = Buffer.from(await file.arrayBuffer());
      storageFileName = `${Date.now()}-${crypto.randomUUID()}-${validatedFile.sanitizedBaseName}.${validatedFile.safeExtension}`;
      uploadedStoragePath = `claims/${claimId}/documents/${storageFileName}`;

      const supabaseAdmin = getSupabaseAdmin();
      const uploadResult = await supabaseAdmin.storage
        .from(CLAIM_DOCUMENTS_BUCKET)
        .upload(uploadedStoragePath, buffer, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadResult.error) {
        throw new AgentClaimDocumentError(500, "Failed to upload document");
      }

      const { data } = supabaseAdmin.storage.from(CLAIM_DOCUMENTS_BUCKET).getPublicUrl(uploadedStoragePath);
      publicUrl = data.publicUrl;
    }

    await client.query("BEGIN");

    const claim = await getAuthorizedAgentClaim(client, claimId, session, { forUpdate: true });
    if (!claim) {
      throw new AgentClaimDocumentError(404, "Claim not found");
    }

    const candidateDocTypes = await getAvailableDocumentTypes(client, claimId);
    if (candidateDocTypes.length === 0) {
      throw new AgentClaimDocumentError(
        409,
        "Semua tipe dokumen untuk klaim ini sudah terpakai. Hapus atau ganti dokumen lama jika ingin upload lagi."
      );
    }

    const availableColumns = await getOptionalClaimDocumentColumns(client);
    const optionalMetadata = [
      { column: "original_file_name", value: file.name },
      { column: "file_name", value: storageFileName },
      { column: "mime_type", value: file.type },
      { column: "content_type", value: file.type },
      { column: "file_size", value: file.size },
      { column: "file_size_bytes", value: file.size },
      { column: "storage_path", value: uploadedStoragePath },
      { column: "storage_bucket", value: CLAIM_DOCUMENTS_BUCKET },
    ].filter((entry) => availableColumns.has(entry.column));

    let insertedDocument: DocumentRow | null = null;
    let assignedDocType: string | null = null;

    for (const docType of candidateDocTypes) {
      const baseColumns = [
        "claim_id",
        "doc_type",
        "file_url",
        "uploaded_by_user_id",
        "is_required",
      ];
      const columns = [...baseColumns, ...optionalMetadata.map((entry) => entry.column)];
      const values = [
        claimId,
        docType,
        publicUrl,
        session.userId,
        false,
        ...optionalMetadata.map((entry) => entry.value),
      ];
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");

      const insertResult = await client.query<DocumentRow>(
        `
          INSERT INTO public.claim_document (${columns.join(", ")})
          VALUES (${placeholders})
          ON CONFLICT (claim_id, doc_type) DO NOTHING
          RETURNING document_id, doc_type::text AS doc_type, file_url, created_at, status
        `
      , values);

      if (insertResult.rows.length > 0) {
        insertedDocument = insertResult.rows[0];
        assignedDocType = docType;
        break;
      }
    }

    if (!insertedDocument || !assignedDocType) {
      throw new AgentClaimDocumentError(
        409,
        "Gagal memilih tipe dokumen unik. Coba ulang upload."
      );
    }

    await client.query(
      `
        UPDATE public.claim
        SET updated_at = NOW()
        WHERE claim_id = $1
      `,
      [claimId]
    );

    await client.query(
      `
        INSERT INTO public.claim_timeline (
          claim_id,
          event_type,
          to_status,
          actor_user_id,
          note,
          extra_data
        )
        VALUES ($1, 'DOCUMENT_UPLOADED', $2, $3, $4, $5)
      `,
      [
        claimId,
        claim.status,
        session.userId,
        `Document uploaded for claim: ${file.name}`,
        JSON.stringify({
          actorRole: session.role,
          docType: assignedDocType,
          originalFileName: file.name,
          storedFileName: storageFileName,
          mimeType: file.type,
          fileSizeBytes: file.size,
          storageBucket: CLAIM_DOCUMENTS_BUCKET,
          storagePath: uploadedStoragePath,
        }),
      ]
    );

    await client.query("COMMIT");

    await Promise.all([
      deleteCacheByPattern(`claims:agent:documents:${claimId}`),
      deleteCacheByPattern(`claims:agent:detail:${claimId}:*`),
      deleteCacheByPattern(`claims:agent:info-request:${claimId}`),
      deleteCacheByPattern(`claims:hospital:detail:${claimId}`),
      deleteCacheByPattern(`claims:hospital:detail:${claimId}:*`),
      deleteCacheByPattern(`claims:hospital:pending-info-request:${claimId}`),
      deleteCacheByPattern(`claims:hospital:pending-info-request:${claimId}:*`),
      deleteCacheByPattern("claims:agent:list:*"),
      deleteCacheByPattern("claims:hospital:list:*"),
    ]);

    return NextResponse.json(
      {
        document: insertedDocument,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    if (uploadedStoragePath) {
      await cleanupUploadedDocument(uploadedStoragePath);
    }

    return toErrorResponse(error);
  } finally {
    client.release();
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();

  try {
    const session = await requireSession();
    assertAllowedRole(session.role);

    const { id } = await context.params;
    const claimId = claimIdSchema.parse(id);

    const claim = await getAuthorizedAgentClaim(client, claimId, session);
    if (!claim) {
      throw new AgentClaimDocumentError(404, "Claim not found");
    }

    const cacheKey = `claims:agent:documents:${claimId}`;
    const cached = await getJsonCache<{
      version: string;
      documents: DocumentRow[];
    }>(cacheKey);

    if (cached && cached.version === new Date(claim.updated_at).toISOString()) {
      return NextResponse.json({ documents: cached.documents });
    }

    const result = await client.query<DocumentRow>(
      `
        SELECT
          document_id,
          doc_type::text AS doc_type,
          file_url,
          created_at,
          status
        FROM public.claim_document
        WHERE claim_id = $1
        ORDER BY created_at DESC
      `,
      [claimId]
    );

    const response = { documents: result.rows };
    await setJsonCache(
      cacheKey,
      {
        version: new Date(claim.updated_at).toISOString(),
        ...response,
      },
      30
    );

    return NextResponse.json(response);
  } catch (error) {
    return toErrorResponse(error);
  } finally {
    client.release();
  }
}
