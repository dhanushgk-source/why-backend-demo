const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

async function runSettingsMigration() {
  try {
    // 1. Site Settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INT PRIMARY KEY DEFAULT 1,
        phone_number TEXT NOT NULL DEFAULT '+91 90365 99439',
        whatsapp_number TEXT NOT NULL DEFAULT '919090254343',
        support_email TEXT NOT NULL DEFAULT 'support@whyservices.in',
        office_address TEXT NOT NULL DEFAULT 'Ground Floor, 14/1, Balajikrupa 2nd Main Road, Seshadripuram, Bengaluru North, Bengaluru – 560020, Karnataka',
        working_hours TEXT NOT NULL DEFAULT '24/7 Support',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure initial row exists
    const checkSettings = await pool.query("SELECT id FROM site_settings WHERE id = 1");
    if (checkSettings.rows.length === 0) {
      await pool.query(`
        INSERT INTO site_settings (id, phone_number, whatsapp_number, support_email, office_address, working_hours)
        VALUES (1, '+91 90365 99439', '919090254343', 'support@whyservices.in', 'Ground Floor, 14/1, Balajikrupa 2nd Main Road, Seshadripuram, Bengaluru North, Bengaluru – 560020, Karnataka', '24/7 Support');
      `);
      console.log("✅ Created default site_settings row.");
    }

    // 2. Service Tier Pricing Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_tier_pricing (
        id UUID PRIMARY KEY,
        service_category TEXT NOT NULL,
        tier_name TEXT NOT NULL,
        day_base NUMERIC(10,2) NOT NULL DEFAULT 999.00,
        day_addl NUMERIC(10,2) NOT NULL DEFAULT 250.00,
        day_ot NUMERIC(10,2) NOT NULL DEFAULT 350.00,
        night_base NUMERIC(10,2) NOT NULL DEFAULT 1498.50,
        night_addl NUMERIC(10,2) NOT NULL DEFAULT 350.00,
        night_ot NUMERIC(10,2) NOT NULL DEFAULT 450.00,
        badge_note TEXT,
        sort_order INT DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Update old tier names if present in database
    await pool.query(`UPDATE service_tier_pricing SET tier_name = 'Standard Companion Care' WHERE tier_name LIKE '%Tier 1%';`);
    await pool.query(`UPDATE service_tier_pricing SET tier_name = 'Travel Companion Care' WHERE tier_name LIKE '%Single Tier%';`);

    const checkPricing = await pool.query("SELECT COUNT(*)::int AS count FROM service_tier_pricing");
    if (checkPricing.rows[0].count === 0) {
      const tier1 = uuidv4();
      const tier2 = uuidv4();
      const tier3 = uuidv4();
      const tier4 = uuidv4();

      await pool.query(
        `
        INSERT INTO service_tier_pricing 
        (id, service_category, tier_name, day_base, day_addl, day_ot, night_base, night_addl, night_ot, badge_note, sort_order, is_active)
        VALUES 
        ($1, 'Hospital', 'Standard Companion Care', 999.00, 250.00, 350.00, 1498.50, 350.00, 450.00, 'Companion Support', 1, true),
        ($2, 'Hospital', 'Trained Companion Care', 1200.00, 250.00, 350.00, 1800.00, 350.00, 450.00, 'During App Launch', 2, true),
        ($3, 'Hospital', 'Skilled Nurse Care', 1400.00, 250.00, 350.00, 2100.00, 350.00, 450.00, 'During App Launch', 3, true),
        ($4, 'Travel', 'Travel Companion Care', 999.00, 250.00, 350.00, 1498.50, 350.00, 450.00, 'Full Journey Escort', 4, true)
        `,
        [tier1, tier2, tier3, tier4]
      );
      console.log("✅ Seeded exact service tier pricing matrix with updated titles.");
    }
  } catch (err) {
    console.error("⚠️ Settings migration error:", err.message);
  }
}

runSettingsMigration();

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

const getPublicPricingPlans = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM service_tier_pricing WHERE is_active = true ORDER BY sort_order ASC, created_at ASC"
    );
    res.status(200).json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    console.error("Error fetching public tier pricing:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllPricingPlansAdmin = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM service_tier_pricing ORDER BY sort_order ASC, created_at ASC");
    res.status(200).json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    console.error("Error fetching admin tier pricing:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const createPricingPlan = async (req, res) => {
  try {
    const {
      service_category,
      tier_name,
      day_base,
      day_addl,
      day_ot,
      night_base,
      night_addl,
      night_ot,
      badge_note,
      sort_order,
      is_active,
    } = req.body;

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO service_tier_pricing 
      (id, service_category, tier_name, day_base, day_addl, day_ot, night_base, night_addl, night_ot, badge_note, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        id,
        service_category || "Hospital",
        tier_name,
        parseFloat(day_base) || 999.00,
        parseFloat(day_addl) || 250.00,
        parseFloat(day_ot) || 350.00,
        parseFloat(night_base) || 1498.50,
        parseFloat(night_addl) || 350.00,
        parseFloat(night_ot) || 450.00,
        badge_note || "",
        parseInt(sort_order, 10) || 1,
        is_active !== undefined ? Boolean(is_active) : true,
      ]
    );

    res.status(201).json({
      success: true,
      message: "New tier added to pricing matrix",
    });
  } catch (error) {
    console.error("Error creating tier pricing:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updatePricingPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      service_category,
      tier_name,
      day_base,
      day_addl,
      day_ot,
      night_base,
      night_addl,
      night_ot,
      badge_note,
      sort_order,
      is_active,
    } = req.body;

    await pool.query(
      `
      UPDATE service_tier_pricing
      SET
        service_category = COALESCE($1, service_category),
        tier_name = COALESCE($2, tier_name),
        day_base = COALESCE($3, day_base),
        day_addl = COALESCE($4, day_addl),
        day_ot = COALESCE($5, day_ot),
        night_base = COALESCE($6, night_base),
        night_addl = COALESCE($7, night_addl),
        night_ot = COALESCE($8, night_ot),
        badge_note = COALESCE($9, badge_note),
        sort_order = COALESCE($10, sort_order),
        is_active = COALESCE($11, is_active)
      WHERE id = $12
      `,
      [
        service_category,
        tier_name,
        day_base,
        day_addl,
        day_ot,
        night_base,
        night_addl,
        night_ot,
        badge_note,
        sort_order,
        is_active,
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Tier rates updated successfully",
    });
  } catch (error) {
    console.error("Error updating tier pricing:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deletePricingPlan = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM service_tier_pricing WHERE id = $1", [id]);
    res.status(200).json({
      success: true,
      message: "Tier removed from pricing matrix",
    });
  } catch (error) {
    console.error("Error deleting tier pricing:", error);
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
