const pool = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { createSetupToken } = require("../utils/accountSetupToken");
const { sendAdminInviteEmail } = require("../services/mailService");
const { logAudit, getAuditLogs } = require("../utils/auditLogger");

function generateTempPassword() {
  return crypto.randomBytes(6).toString("hex").slice(0, 10);
}

let rbacMigrationRan = false;
async function runRbacMigration() {
  if (rbacMigrationRan) return;
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

      UPDATE users
      SET role = 'super_admin',
          permissions = '["*"]'::jsonb,
          status = 'active'
      WHERE role = 'admin' OR role = 'super_admin' OR email = 'techadmin@thewhyservices.com';
    `);
    rbacMigrationRan = true;
    console.log("✅ RBAC schema migration verified and executed.");
  } catch (err) {
    console.error("⚠️ RBAC schema migration error:", err.message);
  }
}

runRbacMigration();

/**
 * GET /api/admin/users
 * Lists all administrative users (super_admin, admin, custom, etc.) excluding role='student' / role='applicant'.
 */
const getAllAdminUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, full_name, email, phone, role, COALESCE(status, 'active') as status, COALESCE(permissions, '[]'::jsonb) as permissions, created_at
      FROM users
      WHERE role NOT IN ('student', 'applicant')
      ORDER BY created_at DESC
      `
    );

    const users = result.rows.map((user) => {
      let perms = user.permissions;
      if (typeof perms === "string") {
        try { perms = JSON.parse(perms); } catch { perms = []; }
      }
      if (!Array.isArray(perms)) perms = [];

      return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        permissions: perms,
        createdAt: user.created_at,
      };
    });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * POST /api/admin/users/invite
 * Invites a new administrative user with specified role and permissions.
 */
const inviteAdminUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { fullName, email, phone, role, permissions } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required.",
      });
    }

    const existing = await client.query(
      "SELECT id, role, email FROM users WHERE email = $1",
      [email]
    );

    const assignedRole = role || "admin";
    const assignedPermissions = Array.isArray(permissions) ? JSON.stringify(permissions) : "[]";
    let userId;

    await client.query("BEGIN");

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      // Upgrade / update existing user to administrative user
      await client.query(
        `
        UPDATE users
        SET full_name = $1,
            phone = COALESCE($2, phone),
            role = $3,
            status = 'active',
            permissions = $4::jsonb
        WHERE id = $5
        `,
        [fullName, phone || null, assignedRole, assignedPermissions, userId]
      );
    } else {
      userId = uuidv4();
      const tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      await client.query(
        `
        INSERT INTO users (id, full_name, email, phone, password_hash, role, status, permissions)
        VALUES ($1, $2, $3, $4, $5, $6, 'active', $7::jsonb)
        `,
        [userId, fullName, email, phone || null, passwordHash, assignedRole, assignedPermissions]
      );
    }

    await client.query("COMMIT");

    // Generate setup token & send invitation email
    let mailSent = true;
    let mailErrorMsg = "";
    const adminFrontendUrl = process.env.ADMIN_FRONTEND_URL || "https://why-website-admin-panel.vercel.app";
    let setupUrl = "";

    try {
      const rawToken = await createSetupToken(userId, "set_password");
      setupUrl = `${adminFrontendUrl}/set-password?token=${rawToken}`;
      await sendAdminInviteEmail({
        to: email,
        fullName,
        roleName: assignedRole,
        rawToken,
      });
    } catch (mailErr) {
      mailSent = false;
      mailErrorMsg = mailErr.message;
      console.error(`⚠️ Failed to send admin invite email to ${email}:`, mailErr.message);
    }

    await logAudit(req, "INVITE_ADMIN_USER", `Invited/updated user ${email} with role '${assignedRole}'`);

    res.status(200).json({
      success: true,
      mailSent,
      setupUrl: !mailSent ? setupUrl : undefined,
      message: mailSent
        ? `Invitation email sent to ${email}`
        : `User updated/invited, but email dispatch failed (${mailErrorMsg}). Setup link: ${setupUrl}`,
      user: {
        id: userId,
        fullName,
        email,
        role: assignedRole,
        status: "active",
        permissions: Array.isArray(permissions) ? permissions : [],
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error inviting admin user:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * Toggle active/inactive status of an admin user.
 */
const setUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'inactive'.",
      });
    }

    const targetUserRes = await pool.query("SELECT email FROM users WHERE id = $1", [id]);
    if (targetUserRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const targetEmail = targetUserRes.rows[0].email;
    if (targetEmail === "techadmin@thewhyservices.com" && status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Primary Super Admin account (techadmin@thewhyservices.com) cannot be deactivated.",
      });
    }

    // Prevent deactivating oneself
    if (req.user && req.user.id === id && status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account.",
      });
    }

    const result = await pool.query(
      "UPDATE users SET status = $1 WHERE id = $2 RETURNING id, full_name, email, status",
      [status, id]
    );

    await logAudit(req, "TOGGLE_USER_STATUS", `Set status of ${targetEmail} to '${status}'`);

    res.status(200).json({
      success: true,
      message: `User status updated to '${status}'`,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error setting user status:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * PUT /api/admin/users/:id/permissions
 * Update user role and permissions matrix.
 */
const updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: "Permissions must be an array.",
      });
    }

    const existing = await pool.query("SELECT role, email FROM users WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (existing.rows[0].email === "techadmin@thewhyservices.com") {
      return res.status(400).json({
        success: false,
        message: "Primary Super Admin permissions are permanent and cannot be modified.",
      });
    }

    const assignedRole = role || existing.rows[0].role;
    const assignedPermissions = JSON.stringify(permissions);

    await pool.query(
      `
      UPDATE users
      SET role = $1, permissions = $2::jsonb
      WHERE id = $3
      `,
      [assignedRole, assignedPermissions, id]
    );

    await logAudit(req, "UPDATE_USER_PERMISSIONS", `Updated permissions for ${existing.rows[0].email} to role '${assignedRole}'`);

    res.status(200).json({
      success: true,
      message: "User permissions updated successfully.",
    });
  } catch (error) {
    console.error("Error updating user permissions:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * POST /api/admin/users/:id/resend-invite
 * Resends the account setup invitation email to an admin user.
 */
const resendUserInvite = async (req, res) => {
  try {
    const { id } = req.params;

    const userRes = await pool.query(
      "SELECT id, full_name, email, role FROM users WHERE id = $1",
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const user = userRes.rows[0];
    const rawToken = await createSetupToken(user.id, "set_password");

    await sendAdminInviteEmail({
      to: user.email,
      fullName: user.full_name,
      roleName: user.role,
      rawToken,
    });

    await logAudit(req, "RESEND_USER_INVITE", `Resent invitation email to ${user.email}`);

    res.status(200).json({
      success: true,
      message: `Invitation email resent to ${user.email}`,
    });
  } catch (error) {
    console.error("Error resending admin invite email:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to send invitation email." });
  }
};

/**
 * GET /api/admin/audit-logs
 * Fetch administrative action audit logs.
 */
const getAuditLogsController = async (req, res) => {
  try {
    const logs = await getAuditLogs(150);
    res.status(200).json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  getAllAdminUsers,
  inviteAdminUser,
  setUserStatus,
  updateUserPermissions,
  resendUserInvite,
  getAuditLogsController,
  runRbacMigration,
};
