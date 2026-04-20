import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  ClientRequestError,
  createClientRequest,
  listRequestsForClient,
  listRequestsForHospital,
  type ClientRequestType,
  type RequestedByRelation,
} from "@/lib/client-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/client-requests?clientId=...     — list for one client (any role)
 * GET  /api/client-requests?hospitalId=...   — list for hospital queue
 *
 * POST /api/client-requests                  — agent creates a new request
 *   body: {
 *     clientId, hospitalId, claimId?, requestType,
 *     payload, notes, requestedByRelation, requestedByName
 *   }
 */

export async function GET(req: Request) {
  try {
    await requireSession();
    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId");
    const hospitalId = url.searchParams.get("hospitalId");
    const status = url.searchParams.get("status") as
      | "pending"
      | "approved"
      | "rejected"
      | "cancelled"
      | null;

    if (clientId) {
      return NextResponse.json({ requests: await listRequestsForClient(clientId) });
    }
    if (hospitalId) {
      return NextResponse.json({
        requests: await listRequestsForHospital(hospitalId, {
          status: status ?? undefined,
        }),
      });
    }
    return NextResponse.json({ error: "clientId or hospitalId required" }, { status: 400 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!["agent", "agent_manager"].includes(session.role)) {
      return NextResponse.json(
        { error: "Hanya agen yang boleh membuat permintaan." },
        { status: 403 },
      );
    }

    const body = (await req.json()) as {
      clientId: string;
      hospitalId: string;
      claimId?: string | null;
      requestType: ClientRequestType;
      payload?: Record<string, unknown>;
      notes?: string;
      requestedByRelation?: RequestedByRelation;
      requestedByName?: string;
    };

    if (!body.clientId || !body.hospitalId || !body.requestType) {
      return NextResponse.json(
        { error: "clientId, hospitalId, requestType wajib diisi." },
        { status: 400 },
      );
    }

    const { id } = await createClientRequest({
      agentUserId: session.userId,
      clientId: body.clientId,
      hospitalId: body.hospitalId,
      claimId: body.claimId ?? null,
      requestType: body.requestType,
      payload: body.payload,
      notes: body.notes,
      requestedByRelation: body.requestedByRelation,
      requestedByName: body.requestedByName,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  if (err instanceof ClientRequestError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  const code =
    err instanceof Error && "statusCode" in err
      ? (err as { statusCode: number }).statusCode
      : 500;
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "error" },
    { status: code },
  );
}
