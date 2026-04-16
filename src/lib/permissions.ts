// ─── Agency Permission System ─────────────────────────────
// Defines granular permissions for agency members

export const PERMISSION_KEYS = [
  "dashboard.view",
  "clients.view",
  "clients.create",
  "clients.edit",
  "clients.delete",
  "claims.view",
  "claims.create",
  "claims.edit",
  "claims.submit",
  "appointments.view",
  "appointments.create",
  "appointments.manage",
  "marketplace.view",
  "referral.view",
  "referral.manage",
  "requests.view",
  "requests.manage",
  "settings.view",
  "settings.edit",
  "team.view",
  "team.manage",
  "team.invite",
  "branding.view",
  "branding.edit",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

// Agency member roles
export type AgencyMemberRole = "master_admin" | "admin" | "manager" | "agent";

export const AGENCY_MEMBER_ROLES: AgencyMemberRole[] = [
  "master_admin",
  "admin",
  "manager",
  "agent",
];

export const ROLE_LABELS: Record<AgencyMemberRole, string> = {
  master_admin: "Master Admin",
  admin: "Admin",
  manager: "Manager",
  agent: "Agent",
};

// Default permissions per role
export const DEFAULT_ROLE_PERMISSIONS: Record<AgencyMemberRole, PermissionKey[]> = {
  master_admin: [...PERMISSION_KEYS], // all permissions
  admin: [
    "dashboard.view",
    "clients.view", "clients.create", "clients.edit", "clients.delete",
    "claims.view", "claims.create", "claims.edit", "claims.submit",
    "appointments.view", "appointments.create", "appointments.manage",
    "marketplace.view",
    "referral.view", "referral.manage",
    "requests.view", "requests.manage",
    "settings.view", "settings.edit",
    "team.view", "team.invite",
    "branding.view",
  ],
  manager: [
    "dashboard.view",
    "clients.view", "clients.create", "clients.edit",
    "claims.view", "claims.create", "claims.edit", "claims.submit",
    "appointments.view", "appointments.create", "appointments.manage",
    "marketplace.view",
    "referral.view",
    "requests.view", "requests.manage",
    "settings.view",
    "team.view",
  ],
  agent: [
    "dashboard.view",
    "clients.view", "clients.create", "clients.edit",
    "claims.view", "claims.create", "claims.edit", "claims.submit",
    "appointments.view", "appointments.create",
    "marketplace.view",
    "referral.view",
    "requests.view",
    "settings.view",
  ],
};

// Map permission keys to sidebar nav paths
export const PERMISSION_TO_NAV: Record<string, PermissionKey> = {
  clients: "clients.view",
  claims: "claims.view",
  appointments: "appointments.view",
  network: "marketplace.view",
  referral: "referral.view",
  requests: "requests.view",
  settings: "settings.view",
};
