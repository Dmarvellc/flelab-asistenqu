import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("rbac_role", "", { path: "/", maxAge: 0 });
  response.cookies.set("app_user_id", "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("rbac_role", "", { path: "/", maxAge: 0 });
  response.cookies.set("app_user_id", "", { path: "/", maxAge: 0 });
  return response;
}
