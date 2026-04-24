"""
Permission-based RBAC system for WATOS v2.5.

Instead of checking roles directly, we check permissions.
Each permission maps to the roles that can perform that action.
"""

# Maps permission strings to the roles that are allowed
PERMISSIONS: dict[str, list[str]] = {
    # Task permissions
    "task:create":       ["admin", "operator"],
    "task:read":         ["admin", "operator", "member"],
    "task:update":       ["admin", "operator", "member"],
    "task:delete":       ["admin", "operator"],
    "task:assign":       ["admin", "operator"],

    # Project permissions
    "project:create":    ["admin", "operator"],
    "project:read":      ["admin", "operator", "member"],
    "project:update":    ["admin", "operator"],
    "project:delete":    ["admin"],

    # User management
    "user:list":         ["admin", "operator"],
    "user:update":       ["admin", "operator"],
    "user:deactivate":   ["admin"],

    # ML & Analytics
    "ml:retrain":        ["admin"],
    "ml:read":           ["admin", "operator"],
    "analytics:read":    ["admin", "operator"],

    # Admin
    "admin:panel":       ["admin", "operator"],
    "audit:read":        ["admin"],

    # Collaboration
    "comment:create":    ["admin", "operator", "member"],
    "comment:delete":    ["admin", "operator"],
    "attachment:upload":  ["admin", "operator", "member"],
    "attachment:delete":  ["admin", "operator"],
}


def has_permission(role: str, permission: str) -> bool:
    """Check if a role has a specific permission."""
    allowed_roles = PERMISSIONS.get(permission, [])
    return role in allowed_roles


def get_user_permissions(role: str) -> list[str]:
    """Return all permissions for a given role."""
    return [perm for perm, roles in PERMISSIONS.items() if role in roles]
