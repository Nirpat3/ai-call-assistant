export type PermissionAction = "read" | "create" | "update" | "delete" | "export" | "manage";

export type PermissionModule =
  | "organizations"
  | "users"
  | "calls"
  | "contacts"
  | "settings"
  | "reports"
  | "billing"
  | "integrations"
  | "messages"
  | "calendar"
  | "email"
  | "tasks"
  | "projects"
  | "crm"
  | "support"
  | "ai";

export type UserRole = "admin" | "manager" | "member" | "viewer";

export type PermissionMap = Partial<Record<PermissionModule, PermissionAction[]>>;

export const rolePermissions: Record<UserRole, PermissionMap> = {
  admin: {
    organizations: ["read", "create", "update", "delete", "manage"],
    users: ["read", "create", "update", "delete", "manage"],
    calls: ["read", "create", "update", "delete", "export", "manage"],
    contacts: ["read", "create", "update", "delete", "export", "manage"],
    settings: ["read", "create", "update", "delete", "manage"],
    reports: ["read", "export", "manage"],
    billing: ["read", "update", "manage"],
    integrations: ["read", "create", "update", "delete", "manage"],
    messages: ["read", "create", "update", "delete"],
    calendar: ["read", "create", "update", "delete"],
    email: ["read", "create", "update", "delete"],
    tasks: ["read", "create", "update", "delete", "manage"],
    projects: ["read", "create", "update", "delete", "manage"],
    crm: ["read", "create", "update", "delete", "export", "manage"],
    support: ["read", "create", "update", "delete", "export", "manage"],
    ai: ["read", "create", "update", "delete", "manage"],
  },
  manager: {
    organizations: ["read", "update"],
    users: ["read", "create", "update"],
    calls: ["read", "create", "update", "export"],
    contacts: ["read", "create", "update", "export"],
    settings: ["read"],
    reports: ["read", "export"],
    billing: ["read"],
    integrations: ["read"],
    messages: ["read", "create", "update"],
    calendar: ["read", "create", "update"],
    email: ["read", "create", "update"],
    tasks: ["read", "create", "update", "delete"],
    projects: ["read", "create", "update"],
    crm: ["read", "create", "update", "export"],
    support: ["read", "create", "update", "export"],
    ai: ["read", "create", "update"],
  },
  member: {
    organizations: ["read"],
    users: ["read"],
    calls: ["read", "create", "update"],
    contacts: ["read", "create", "update"],
    settings: ["read"],
    reports: ["read"],
    billing: [],
    integrations: ["read"],
    messages: ["read", "create", "update"],
    calendar: ["read", "create", "update"],
    email: ["read", "create", "update"],
    tasks: ["read", "create", "update"],
    projects: ["read", "create", "update"],
    crm: ["read", "create", "update"],
    support: ["read", "create", "update"],
    ai: ["read", "create"],
  },
  viewer: {
    organizations: ["read"],
    users: ["read"],
    calls: ["read"],
    contacts: ["read"],
    settings: ["read"],
    reports: ["read"],
    billing: [],
    integrations: [],
    messages: ["read"],
    calendar: ["read"],
    email: ["read"],
    tasks: ["read"],
    projects: ["read"],
    crm: ["read"],
    support: ["read"],
    ai: ["read"],
  },
};

export function normalizeRole(role?: string | null): UserRole {
  if (role === "admin" || role === "manager" || role === "member" || role === "viewer") {
    return role;
  }

  return "member";
}

export function getPermissionsForRole(role?: string | null): PermissionMap {
  return rolePermissions[normalizeRole(role)];
}

export function hasPermission(
  permissions: PermissionMap | undefined | null,
  module: PermissionModule,
  action: PermissionAction = "read"
): boolean {
  const modulePermissions = permissions?.[module] || [];
  return modulePermissions.includes(action) || modulePermissions.includes("manage");
}
