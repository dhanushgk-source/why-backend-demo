const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "why_secret_jwt_key_2026";

    const decoded = jwt.verify(token, secret);

    // Safe DB fetch for user status & permissions
    const userRes = await pool.query(
      `
      SELECT id, full_name, email, phone, role,
             COALESCE(status, 'active') as status,
             COALESCE(permissions, '[]'::jsonb) as permissions
      FROM users
      WHERE id = $1
      `,
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User account not found",
      });
    }

    const user = userRes.rows[0];

    const isTechAdmin = user.email === "techadmin@thewhyservices.com";

    if (user.status === "inactive" && !isTechAdmin) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact Super Admin.",
      });
    }

    // Standardize permissions as JS array
    let permissions = user.permissions;
    if (typeof permissions === "string") {
      try {
        permissions = JSON.parse(permissions);
      } catch {
        permissions = [];
      }
    }
    if (!Array.isArray(permissions)) {
      permissions = [];
    }

    let role = user.role;
    if (isTechAdmin) {
      role = "super_admin";
      permissions = ["*"];
    } else if (role === "super_admin") {
      permissions = ["*"];
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: role,
      status: isTechAdmin ? "active" : user.status,
      permissions: permissions,
    };

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authenticate;