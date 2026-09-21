const pool = require("../config/db");
const { randomUUID: uuidv4 } = require("crypto");

let auditTableMigrated = false;

async function initAuditTable() {
  if (auditTableMigrated) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY,
        actor_id UUID,
        actor_name TEXT,
        actor_email TEXT,
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    auditTableMigrated = true;
  } catch (err) {
    console.error("⚠️ Audit table migration error:", err.message);
  }
}

initAuditTable();

/**
 * Log an administrative audit action
 */
async function logAudit(req, action, details = "") {
  try {
    await initAuditTable();
    const actorId = req.user?.id || null;
    const actorName = req.user?.fullName || req.user?.email || "System";
    const actorEmail = req.user?.email || "system@thewhyservices.com";

    await pool.query(
      `
      INSERT INTO audit_logs (id, actor_id, actor_name, actor_email, action, details)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [uuidv4(), actorId, actorName, actorEmail, action, details]
    );
  } catch (err) {
    console.error("⚠️ Failed to record audit log:", err.message);
  }
}

/**
 * Fetch audit logs (ordered by created_at DESC)
 */
async function getAuditLogs(limit = 100) {
  await initAuditTable();
  const res = await pool.query(
    `
    SELECT id, actor_id, actor_name, actor_email, action, details, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );
  return res.rows.map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    action: row.action,
    details: row.details,
    createdAt: row.created_at,
  }));
}

module.exports = {
  logAudit,
  getAuditLogs,
};
