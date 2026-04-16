import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveAgencyById, updateAgencyBranding } from "@/lib/agency-resolver";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const branding = await resolveAgencyById(session.agencyId);
    if (!branding) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    return NextResponse.json(branding);
  } catch (error) {
    console.error("Failed to fetch branding:", error);
    return NextResponse.json({ error: "Failed to fetch branding" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate slug uniqueness if changing
    if (body.slug) {
      const { dbPool } = await import("@/lib/db");
      const existing = await dbPool.query(
        "SELECT agency_id FROM public.agency WHERE slug = $1 AND agency_id != $2",
        [body.slug.toLowerCase(), session.agencyId]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
      }
    }

    await updateAgencyBranding(session.agencyId, {
      name: body.name,
      slug: body.slug,
      logoUrl: body.logoUrl,
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      accentColor: body.accentColor,
      sidebarBg: body.sidebarBg,
      sidebarText: body.sidebarText,
      loginBg: body.loginBg,
    });

    const updated = await resolveAgencyById(session.agencyId);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update branding:", error);
    return NextResponse.json({ error: "Failed to update branding" }, { status: 500 });
  }
}
