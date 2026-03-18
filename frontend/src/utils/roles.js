export const ROLES = {
  ADMIN: "Admin",
  DEVELOPER: "Developer",
  TESTER: "Tester"
};

export const PERMISSIONS = {
  DASHBOARD: "dashboard",
  BUGS: "bugs",
  CREATE_BUG: "create_bug",
  MY_WORK: "my_work",
  NOTIFICATIONS: "notifications",
  ACTIVITY: "activity",
  TEAM: "team",
  BUG_STATUS: "bug_status",
  BUG_QUICK_ACTIONS: "bug_quick_actions",
  UNASSIGNED_FILTER: "unassigned_filter"
};

const rolePermissions = {
  [ROLES.ADMIN]: new Set([
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.BUGS,
    PERMISSIONS.CREATE_BUG,
    PERMISSIONS.MY_WORK,
    PERMISSIONS.NOTIFICATIONS,
    PERMISSIONS.ACTIVITY,
    PERMISSIONS.TEAM,
    PERMISSIONS.BUG_STATUS,
    PERMISSIONS.BUG_QUICK_ACTIONS,
    PERMISSIONS.UNASSIGNED_FILTER
  ]),
  [ROLES.DEVELOPER]: new Set([
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.BUGS,
    PERMISSIONS.CREATE_BUG,
    PERMISSIONS.MY_WORK,
    PERMISSIONS.NOTIFICATIONS,
    PERMISSIONS.ACTIVITY,
    PERMISSIONS.BUG_STATUS,
    PERMISSIONS.BUG_QUICK_ACTIONS,
    PERMISSIONS.UNASSIGNED_FILTER
  ]),
  [ROLES.TESTER]: new Set([
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.BUGS,
    PERMISSIONS.CREATE_BUG,
    PERMISSIONS.MY_WORK,
    PERMISSIONS.NOTIFICATIONS
  ])
};

export function normalizeRole(role) {
  const knownRoles = Object.values(ROLES);
  return knownRoles.includes(role) ? role : ROLES.TESTER;
}

export function hasPermission(user, permission) {
  if (!user) return false;
  const normalizedRole = normalizeRole(user.role);
  return rolePermissions[normalizedRole]?.has(permission) || false;
}

export function getRoleSummary(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === ROLES.ADMIN) {
    return "Full access to team, activity, bug flow, and workspace management.";
  }

  if (normalizedRole === ROLES.DEVELOPER) {
    return "Can work on bugs, update status, and review delivery activity.";
  }

  return "Focused access for reporting bugs, tracking work, and staying notified.";
}
