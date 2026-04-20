import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  cancelClientRequest,
  ClientRequestError,
  decideClientRequest,
  getRequestDetail,
} from "@/lib/client-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET   /api/client-requests/[id]            — full detail (header + messages + audit)
 * PATCH /api/client-requests/[id]            — hospital decides OR agent cancels
 *   body: { action: "approve"|"reject"|"cancel", reason?: string }
 */

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const detail = await getRequestDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ request: detail });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = (await req.json()) as { action: string; reason?: string };

    if (body.action === "approve" || body.action === "reject") {
      if (!["hospital_admin", "developer", "super_admin"].includes(session.role)) {
        return NextResponse.json(
          { error: "Hanya rumah sakit yang boleh menyetujui/menolak." },
          { status: 403 },
        );
      }
      await decideClientRequest({
        requestId: id,
        decidedBy: session.userId,
        decision: body.action === "approve" ? "approved" : "rejected",
        reason: body.reason,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "cancel") {
      if (!["agent", "agent_manager"].includes(session.role)) {
        return NextResponse.json(
          { error: "Hanya agen pembuat yang bisa membatalkan." },
          { status: 403 },
        );
      }
      await cancelClientRequest({
        requestId: id,
        agentUserId: session.userId,
        reason: body.reason,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
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
