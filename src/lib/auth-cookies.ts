import { cookies } from "next/headers";
import { normalizeRole, type Role } from "@/lib/rbac";

const ROLE_COOKIE_KEYS = [
  "session_super_admin_role",
  "session_developer_role",
  "session_admin_agency_role",
  "session_hospital_role",
  "session_agent_role",
] as const;

const USER_ID_COOKIE_KEYS = [
  "session_super_admin_user_id",
  "session_developer_user_id",
  "session_admin_agency_user_id",
  "session_hospital_user_id",
  "session_agent_user_id",
] as const;

export async function getRoleFromCookies(): Promise<Role | null> {
  const cookieStore = await cookies();
  for (const key of ROLE_COOKIE_KEYS) {
    const role = normalizeRole(cookieStore.get(key)?.value);
    if (role) return role;
  }
  return null;
}

export async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  for (const key of USER_ID_COOKIE_KEYS) {
    const value = cookieStore.get(key)?.value;
    if (value) return value;
  }
  return null;
}

export async function getHospitalUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("session_hospital_user_id")?.value ?? null;
}

export async function getAgentUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("session_agent_user_id")?.value ?? null;
}

export async function getAdminAgencyUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("session_admin_agency_user_id")?.value ?? null;
}

export async function getDeveloperUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return (
    cookieStore.get("session_developer_user_id")?.value ??
    cookieStore.get("session_super_admin_user_id")?.value ??
    null
  );
}
