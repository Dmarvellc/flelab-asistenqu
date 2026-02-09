export const roles = [
  "super_admin",
  "admin_agency",
  "insurance_admin",
  "hospital_admin",
  "agent_manager",
  "agent",
  "developer",
] as const;

export type Role = (typeof roles)[number];

const routeRoleMap: Array<{ prefix: string; roles: Role[] }> = [
  {
    prefix: "/admin-agency-insurance",
    roles: ["super_admin", "admin_agency", "insurance_admin"],
  },
  {
    prefix: "/hospital",
    roles: ["super_admin", "hospital_admin"],
  },
  {
    prefix: "/agent",
    roles: ["super_admin", "agent_manager"],
  },
  {
    prefix: "/agent-portal",
    roles: ["super_admin", "agent"],
  },
  {
    prefix: "/developer",
    roles: ["super_admin", "developer"],
  },
];

export function normalizeRole(value?: string | null): Role | null {
  if (!value) return null;
  return roles.includes(value as Role) ? (value as Role) : null;
}

export function getAllowedRolesForPath(pathname: string): Role[] | null {
  const match = routeRoleMap.find((route) =>
    pathname.startsWith(route.prefix)
  );
  return match ? match.roles : null;
}

export function isRoleAllowed(role: Role | null, pathname: string): boolean {
  const allowed = getAllowedRolesForPath(pathname);
  if (!allowed) return true;
  if (!role) return false;
  return allowed.includes(role);
}
