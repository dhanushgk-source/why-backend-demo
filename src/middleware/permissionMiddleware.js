/**
 * Permission Middleware
 * Checks if req.user has required module and action permissions.
 * Supports wildcard '*' and 'module:*' permissions.
 */
function hasUserPermission(user, module, action) {
  if (!user) return false;

  // Super admin role has full wildcard access
  if (user.role === "super_admin") return true;

  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  // Wildcard permissions
  if (permissions.includes("*")) return true;
  if (module && permissions.includes(`${module}:*`)) return true;

  // Exact module:action permission
  if (module && action && permissions.includes(`${module}:${action}`)) return true;

  return false;
}

function requirePermission(module, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (hasUserPermission(req.user, module, action)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires '${module}:${action}' permission.`,
    });
  }
}

module.exports = {
  hasUserPermission,
  requirePermission,
};
