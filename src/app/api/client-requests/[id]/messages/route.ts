import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { ClientRequestError, postRequestMessage } from "@/lib/client-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/client-requests/[id]/messages
 *   body: { body: string, attachmentUrl?: string }
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = (await req.json()) as { body: string; attachmentUrl?: string };
    if (!body.body || !body.body.trim()) {
      return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });
    }
    await postRequestMessage({
      requestId: id,
      senderUserId: session.userId,
      body: body.body,
      attachmentUrl: body.attachmentUrl,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
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
}
