import { getSession } from "@/lib/auth";
import { type Role } from "@/lib/rbac";

export async function getRoleFromCookies(): Promise<Role | null> {
  const session = await getSession();
  return session?.role ?? null;
}

export async function getUserIdFromCookies(): Promise<string | null> {
  const session = await getSession();
  return session?.userId ?? null;
}

export async function getHospitalUserIdFromCookies(): Promise<string | null> {
  const session = await getSession();
  return session?.role === "hospital_admin" ? session.userId : null;
}

export async function getAgentUserIdFromCookies(): Promise<string | null> {
  const session = await getSession();
  return session && (session.role === "agent" || session.role === "agent_manager")
    ? session.userId
    : null;
}

export async function getAdminAgencyUserIdFromCookies(): Promise<string | null> {
  const session = await getSession();
  return session && (session.role === "admin_agency" || session.role === "insurance_admin")
    ? session.userId
    : null;
}

export async function getDeveloperUserIdFromCookies(): Promise<string | null> {
  const session = await getSession();
  return session && (session.role === "developer" || session.role === "super_admin")
    ? session.userId
    : null;
}
