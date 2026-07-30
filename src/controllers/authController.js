const pool = require("../config/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { verifySetupToken, consumeSetupToken } = require("../utils/accountSetupToken");
    

const register = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // Check existing email
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await pool.query(
      `
      INSERT INTO users
      (
        id,
        full_name,
        email,
        phone,
        password_hash
      )
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        uuidv4(),
        fullName,
        email,
        phone,
        hashedPassword,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const login = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required"
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (user.role === "student") {
      const studentResult = await pool.query(
        "SELECT status FROM students WHERE user_id = $1",
        [user.id]
      );

      if (studentResult.rows[0]?.status === "inactive") {
        return res.status(403).json({
          success: false,
          message: "This account has been deactivated. Contact your administrator."
        });
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
};

/**
 * POST /api/auth/register-student
 * Public self-signup for the learning portal specifically. Deliberately
 * separate from `register` above (which is shared with the careers/job
 * applicant signup) — this one also creates a `students` row so the account
 * shows up in the admin panel's student list, ready to be assigned a
 * training. It is NOT auto-enrolled in anything.
 */
const registerStudent = async (req, res) => {
  const client = await pool.connect();
  try {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query("BEGIN");

    const userId = uuidv4();
    await client.query(
      `
      INSERT INTO users (id, full_name, email, phone, password_hash, role)
      VALUES ($1,$2,$3,$4,$5,'student')
      `,
      [userId, fullName, email, phone || null, hashedPassword]
    );

    await client.query(
      `
      INSERT INTO students (id, user_id, full_name, email, phone, status)
      VALUES ($1,$2,$3,$4,$5,'active')
      `,
      [uuidv4(), userId, fullName, email, phone || null]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Account created successfully. You can log in now — an administrator will assign your training shortly.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  } finally {
    client.release();
  }
};

/**
 * POST /api/auth/set-password
 * body: { token, newPassword }
 * Consumes a one-time setup/reset token (see utils/accountSetupToken.js and
 * services/mailService.js) and sets the user's password. Used both for
 * brand-new admin-created students setting their first password, and for
 * admin-triggered password resets.
 */
const setPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Token and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const tokenRow = await verifySetupToken(token);
    if (!tokenRow) {
      return res.status(400).json({
        success: false,
        message: "This link is invalid or has expired. Ask an administrator to resend it.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      tokenRow.userId,
    ]);
    await consumeSetupToken(tokenRow.id);

    return res.status(200).json({ success: true, message: "Password set — you can log in now." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  registerStudent,
  setPassword,
};