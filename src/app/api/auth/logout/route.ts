import { NextResponse } from "next/server";

function clearCookiesForPrefix(response: NextResponse, prefix: string) {
  response.cookies.set(`${prefix}_role`, "", { path: "/", maxAge: 0 });
  response.cookies.set(`${prefix}_user_id`, "", { path: "/", maxAge: 0 });
  response.cookies.set(`${prefix}_status`, "", { path: "/", maxAge: 0 });
}

function clearAllCookies(response: NextResponse) {
  const prefixes = [
    "session_agent",
    "session_hospital",
    "session_developer",
    "session_admin_agency",
    "session_super_admin",
    "session_generic"
  ];
  prefixes.forEach(p => clearCookiesForPrefix(response, p));

  // Legacy
  response.cookies.set("rbac_role", "", { path: "/", maxAge: 0 });
  response.cookies.set("app_user_id", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_status", "", { path: "/", maxAge: 0 });
}

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  const referer = request.headers.get("referer") || "";

  if (referer.includes("/agent")) {
    clearCookiesForPrefix(response, "session_agent");
  } else if (referer.includes("/hospital")) {
    clearCookiesForPrefix(response, "session_hospital");
  } else if (referer.includes("/developer")) {
    clearCookiesForPrefix(response, "session_developer");
  } else if (referer.includes("/admin-agency")) {
    clearCookiesForPrefix(response, "session_admin_agency");
  } else {
    // If we can't determine context, or if it is a general logout, clear all?
    // Let's be safe and clear all if we can't determine.
    clearAllCookies(response);
  }

  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");

  // Determine redirect target
  let redirectUrl = "/login";
  let prefixToClear = "session_generic";

  if (from === "agent" || request.url.includes("/agent")) {
    redirectUrl = "/agent/login";
    prefixToClear = "session_agent";
  } else if (from === "hospital" || request.url.includes("/hospital")) {
    redirectUrl = "/hospital/login";
    prefixToClear = "session_hospital";
  } else if (from === "developer" || request.url.includes("/developer")) {
    redirectUrl = "/developer/login";
    prefixToClear = "session_developer";
  } else if (from === "admin-agency" || request.url.includes("/admin-agency")) {
    redirectUrl = "/admin-agency/login";
    prefixToClear = "session_admin_agency";
  }

  const response = NextResponse.redirect(new URL(redirectUrl, request.url));

  if (prefixToClear === "session_generic") {
    clearAllCookies(response);
  } else {
    clearCookiesForPrefix(response, prefixToClear);
  }

  return response;
}
