const crypto = require("crypto");
const { randomUUID: uuidv4 } = require("crypto");
const pool = require("../config/db");

const TOKEN_BYTES = 32;
const DEFAULT_TTL_HOURS = 48;

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Creates a new setup/reset token for a user and stores only its hash.
 * Returns the RAW token — this is the only time it exists in plaintext,
 * so the caller must put it straight into the email link and never log it.
 */
async function createSetupToken(userId, purpose = "set_password", ttlHours = DEFAULT_TTL_HOURS) {
  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await pool.query(
    `
    INSERT INTO account_setup_tokens (id, user_id, token_hash, purpose, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [uuidv4(), userId, tokenHash, purpose, expiresAt]
  );

  return rawToken;
}

/**
 * Verifies a raw token from an incoming request. Returns the token row
 * (with userId/purpose) if valid, or null if missing/expired/already used.
 * Does NOT mark it used — call `consumeSetupToken` after the password
 * update succeeds, so a failed DB write doesn't burn the token.
 */
async function verifySetupToken(rawToken) {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);

  const result = await pool.query(
    `
    SELECT id, user_id, purpose, expires_at, used_at
    FROM account_setup_tokens
    WHERE token_hash = $1
    `,
    [tokenHash]
  );

  const row = result.rows[0];
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  return { id: row.id, userId: row.user_id, purpose: row.purpose };
}

async function consumeSetupToken(tokenId) {
  await pool.query(
    "UPDATE account_setup_tokens SET used_at = NOW() WHERE id = $1",
    [tokenId]
  );
}

module.exports = { createSetupToken, verifySetupToken, consumeSetupToken };
