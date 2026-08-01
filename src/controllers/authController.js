const pool = require("../config/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
    

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

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const userResult = await pool.query(
      "SELECT id, full_name, email FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "If an account exists for this email, a password reset link has been sent.",
      });
    }

    const user = userResult.rows[0];
    const { createSetupToken } = require("../utils/accountSetupToken");
    const { sendPasswordResetEmail } = require("../services/mailService");

    const rawToken = await createSetupToken(user.id, "reset_password");
    await sendPasswordResetEmail({
      to: user.email,
      fullName: user.full_name,
      rawToken,
    });

    return res.status(200).json({
      success: true,
      message: "If an account exists for this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("⚠️ Error sending forgot password email:", error);
    return res.status(500).json({ success: false, message: "Failed to send password reset link" });
  }
};

const setPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Token and new password are required" });
    }

    const { verifySetupToken, consumeSetupToken } = require("../utils/accountSetupToken");

    const tokenRow = await verifySetupToken(token);
    if (!tokenRow) {
      return res.status(400).json({
        success: false,
        message: "This link is invalid or has expired. Please request a new link.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      tokenRow.userId,
    ]);

    await consumeSetupToken(tokenRow.id);

    return res.status(200).json({
      success: true,
      message: "Password set successfully",
    });
  } catch (error) {
    console.error("⚠️ Error setting password:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  setPassword,
};