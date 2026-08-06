const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

async function runSettingsMigration() {
  try {
    // 1. Site Settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INT PRIMARY KEY DEFAULT 1,
        phone_number TEXT NOT NULL DEFAULT '+91 98765 43210',
        whatsapp_number TEXT NOT NULL DEFAULT '+91 98765 43210',
        support_email TEXT NOT NULL DEFAULT 'support@thewhyservices.com',
        office_address TEXT NOT NULL DEFAULT '123 Care Avenue, Chennai, Tamil Nadu, India',
        working_hours TEXT NOT NULL DEFAULT 'Mon - Sat: 9:00 AM - 7:00 PM',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure initial row exists
    const checkSettings = await pool.query("SELECT id FROM site_settings WHERE id = 1");
    if (checkSettings.rows.length === 0) {
      await pool.query(`
        INSERT INTO site_settings (id, phone_number, whatsapp_number, support_email, office_address, working_hours)
        VALUES (1, '+91 98765 43210', '+91 98765 43210', 'support@thewhyservices.com', '123 Care Avenue, Chennai, Tamil Nadu, India', 'Mon - Sat: 9:00 AM - 7:00 PM');
      `);
      console.log("✅ Created default site_settings row.");
    }

    // 2. Pricing Plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing_plans (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        price TEXT NOT NULL,
        billing_cycle TEXT DEFAULT 'month',
        description TEXT,
        features TEXT[] DEFAULT '{}',
        is_popular BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const checkPricing = await pool.query("SELECT COUNT(*)::int AS count FROM pricing_plans");
    if (checkPricing.rows[0].count === 0) {
      const plan1 = uuidv4();
      const plan2 = uuidv4();
      const plan3 = uuidv4();

      await pool.query(
        `
        INSERT INTO pricing_plans (id, title, price, billing_cycle, description, features, is_popular, is_active, sort_order)
        VALUES 
        ($1, 'Basic Assistance', '₹1,999', 'month', 'Essential companion care & travel support for seniors.', $2, false, true, 1),
        ($3, 'Companionship Pro', '₹3,999', 'month', 'Comprehensive hospital assistance, mobility & daily care.', $4, true, true, 2),
        ($5, 'Elite Care Package', '₹7,999', 'month', '24/7 priority concierge, dedicated caregiver & medical support.', $6, false, true, 3)
        `,
        [
          plan1,
          ["Dedicated Care Assistant", "Travel & Hospital Escort", "Weekly Check-ins", "Emergency Call Line"],
          plan2,
          ["All Basic Features", "24/7 Emergency Line", "Hospital Appointment Escort", "Personal Companion Support", "Monthly Medical Summary"],
          plan3,
          ["All Pro Features", "Dedicated 1-on-1 Companion", "Priority Concierge Dispatch", "Family Portal Live Tracking", "Comprehensive Care Kit"],
        ]
      );
      console.log("✅ Seeded default pricing_plans.");
    }
  } catch (err) {
    console.error("⚠️ Settings migration error:", err.message);
  }
}

// Automatically trigger migration on file import
runSettingsMigration();

/**
 * GET /api/settings/public (Public)
 */
const getPublicSettings = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM site_settings WHERE id = 1");
    res.status(200).json({
      success: true,
      settings: result.rows[0] || {},
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * PUT /api/admin/settings (Admin Protected)
 */
const updateSettingsAdmin = async (req, res) => {
  try {
    const { phone_number, whatsapp_number, support_email, office_address, working_hours } = req.body;

    await pool.query(
      `
      UPDATE site_settings
      SET 
        phone_number = COALESCE($1, phone_number),
        whatsapp_number = COALESCE($2, whatsapp_number),
        support_email = COALESCE($3, support_email),
        office_address = COALESCE($4, office_address),
        working_hours = COALESCE($5, working_hours),
        updated_at = NOW()
      WHERE id = 1
      `,
      [phone_number, whatsapp_number, support_email, office_address, working_hours]
    );

    const updated = await pool.query("SELECT * FROM site_settings WHERE id = 1");

    res.status(200).json({
      success: true,
      message: "Site settings updated successfully",
      settings: updated.rows[0],
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/pricing/public (Public)
 */
const getPublicPricingPlans = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM pricing_plans WHERE is_active = true ORDER BY sort_order ASC, created_at ASC"
    );
    res.status(200).json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    console.error("Error fetching public pricing plans:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/admin/pricing (Admin Protected)
 */
const getAllPricingPlansAdmin = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pricing_plans ORDER BY sort_order ASC, created_at ASC");
    res.status(200).json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    console.error("Error fetching admin pricing plans:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * POST /api/admin/pricing (Admin Protected)
 */
const createPricingPlan = async (req, res) => {
  try {
    const { title, price, billing_cycle, description, features, is_popular, is_active, sort_order } = req.body;
    const id = uuidv4();

    const formattedFeatures = Array.isArray(features)
      ? features
      : typeof features === "string"
      ? features.split("\n").map((f) => f.trim()).filter(Boolean)
      : [];

    await pool.query(
      `
      INSERT INTO pricing_plans (id, title, price, billing_cycle, description, features, is_popular, is_active, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        id,
        title,
        price,
        billing_cycle || "month",
        description || "",
        formattedFeatures,
        Boolean(is_popular),
        is_active !== undefined ? Boolean(is_active) : true,
        parseInt(sort_order, 10) || 0,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Pricing plan created successfully",
    });
  } catch (error) {
    console.error("Error creating pricing plan:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * PUT /api/admin/pricing/:id (Admin Protected)
 */
const updatePricingPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, price, billing_cycle, description, features, is_popular, is_active, sort_order } = req.body;

    const formattedFeatures = Array.isArray(features)
      ? features
      : typeof features === "string"
      ? features.split("\n").map((f) => f.trim()).filter(Boolean)
      : [];

    await pool.query(
      `
      UPDATE pricing_plans
      SET
        title = COALESCE($1, title),
        price = COALESCE($2, price),
        billing_cycle = COALESCE($3, billing_cycle),
        description = COALESCE($4, description),
        features = $5,
        is_popular = COALESCE($6, is_popular),
        is_active = COALESCE($7, is_active),
        sort_order = COALESCE($8, sort_order)
      WHERE id = $9
      `,
      [
        title,
        price,
        billing_cycle,
        description,
        formattedFeatures,
        is_popular,
        is_active,
        sort_order,
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Pricing plan updated successfully",
    });
  } catch (error) {
    console.error("Error updating pricing plan:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * DELETE /api/admin/pricing/:id (Admin Protected)
 */
const deletePricingPlan = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM pricing_plans WHERE id = $1", [id]);
    res.status(200).json({
      success: true,
      message: "Pricing plan removed",
    });
  } catch (error) {
    console.error("Error deleting pricing plan:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  runSettingsMigration,
  getPublicSettings,
  updateSettingsAdmin,
  getPublicPricingPlans,
  getAllPricingPlansAdmin,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
};
