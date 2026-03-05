import { cookies } from "next/headers";
import { normalizeRole, type Role } from "@/lib/rbac";

export async function getRoleFromCookies(): Promise<Role | null> {
  const cookieStore = await cookies();
  
  const devRole = cookieStore.get("session_developer_role")?.value;
  if (devRole) return normalizeRole(devRole);

  const superRole = cookieStore.get("session_super_admin_role")?.value;
  if (superRole) return normalizeRole(superRole);

  const hospitalRole = cookieStore.get("session_hospital_role")?.value;
  if (hospitalRole) return normalizeRole(hospitalRole);

  const agentRole = cookieStore.get("session_agent_role")?.value;
  if (agentRole) return normalizeRole(agentRole);

  const adminAgencyRole = cookieStore.get("session_admin_agency_role")?.value;
  if (adminAgencyRole) return normalizeRole(adminAgencyRole);

  return normalizeRole(cookieStore.get("rbac_role")?.value);
}

export async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  
  const devId = cookieStore.get("session_developer_user_id")?.value;
  if (devId) return devId;

  const superId = cookieStore.get("session_super_admin_user_id")?.value;
  if (superId) return superId;

  const hospitalId = cookieStore.get("session_hospital_user_id")?.value;
  if (hospitalId) return hospitalId;

  const agentId = cookieStore.get("session_agent_user_id")?.value;
  if (agentId) return agentId;

  const adminAgencyId = cookieStore.get("session_admin_agency_user_id")?.value;
  if (adminAgencyId) return adminAgencyId;

  return cookieStore.get("app_user_id")?.value ?? null;
}
