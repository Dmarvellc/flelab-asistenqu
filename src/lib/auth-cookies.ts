import { cookies } from "next/headers";
import { normalizeRole, type Role } from "@/lib/rbac";

export async function getRoleFromCookies(): Promise<Role | null> {
  const cookieStore = await cookies();
  return normalizeRole(cookieStore.get("rbac_role")?.value);
}

export async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("app_user_id")?.value ?? null;
}
