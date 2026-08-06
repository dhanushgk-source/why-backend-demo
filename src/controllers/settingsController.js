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

    // 2. Service Pricing table with explicit Day and Night rates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_pricing (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        day_price TEXT NOT NULL DEFAULT '1,499',
        night_price TEXT NOT NULL DEFAULT '2,499',
        included_hours TEXT DEFAULT 'Up to 4 Hours',
        extra_note TEXT DEFAULT 'Extra hours will be charged additionally beyond the included 4 hours.',
        features TEXT[] DEFAULT '{}',
        sort_order INT DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const checkPricing = await pool.query("SELECT COUNT(*)::int AS count FROM service_pricing");
    if (checkPricing.rows[0].count === 0) {
      const plan1 = uuidv4();
      const plan2 = uuidv4();

      await pool.query(
        `
        INSERT INTO service_pricing (id, title, description, day_price, night_price, included_hours, extra_note, features, sort_order, is_active)
        VALUES 
        (
          $1, 
          'Hospital Assistance', 
          'Professional support inside hospitals and clinics.', 
          '1,499', 
          '2,499', 
          'Up to 4 Hours', 
          'Extra hours will be charged additionally beyond the included 4 hours.', 
          $2, 
          1, 
          true
        ),
        (
          $3, 
          'Travel Assistance', 
          'Companionship and support for your travel journey.', 
          '999', 
          '1,499', 
          'Up to 4 Hours', 
          'Extra hours will be charged additionally beyond the included 4 hours.', 
          $4, 
          2, 
          true
        )
        `,
        [
          plan1,
          [
            "Verified WHY Professional",
            "Hospital visit assistance",
            "Doctor communication support",
            "Prescription & report collection",
            "Live updates to family",
            "Wheelchair & navigation assistance",
            "Booking support",
          ],
          plan2,
          [
            "Verified WHY Professional",
            "Door-to-door travel support",
            "Assistance during travel (pick-up & drop)",
            "Travel arrangements support",
            "Live updates to family",
            "Booking support",
          ],
        ]
      );
      console.log("✅ Seeded default Hospital & Travel Assistance pricing with Day & Night rates.");
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
      "SELECT * FROM service_pricing WHERE is_active = true ORDER BY sort_order ASC, created_at ASC"
    );
    res.status(200).json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    console.error("Error fetching public service pricing:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/admin/pricing (Admin Protected)
 */
const getAllPricingPlansAdmin = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM service_pricing ORDER BY sort_order ASC, created_at ASC");
    res.status(200).json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    console.error("Error fetching admin service pricing:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * POST /api/admin/pricing (Admin Protected)
 */
const createPricingPlan = async (req, res) => {
  try {
    const { title, description, day_price, night_price, included_hours, extra_note, features, sort_order, is_active } = req.body;
    const id = uuidv4();

    const formattedFeatures = Array.isArray(features)
      ? features
      : typeof features === "string"
      ? features.split("\n").map((f) => f.trim()).filter(Boolean)
      : [];

    await pool.query(
      `
      INSERT INTO service_pricing (id, title, description, day_price, night_price, included_hours, extra_note, features, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        id,
        title,
        description || "",
        day_price || "1,499",
        night_price || "2,499",
        included_hours || "Up to 4 Hours",
        extra_note || "Extra hours will be charged additionally beyond the included 4 hours.",
        formattedFeatures,
        parseInt(sort_order, 10) || 1,
        is_active !== undefined ? Boolean(is_active) : true,
      ]
    );

    res.status(201).json({
      success: true,
      message: "New service created successfully",
    });
  } catch (error) {
    console.error("Error creating service pricing:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * PUT /api/admin/pricing/:id (Admin Protected)
 */
const updatePricingPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, day_price, night_price, included_hours, extra_note, features, sort_order, is_active } = req.body;

    const formattedFeatures = Array.isArray(features)
      ? features
      : typeof features === "string"
      ? features.split("\n").map((f) => f.trim()).filter(Boolean)
      : [];

    await pool.query(
      `
      UPDATE service_pricing
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        day_price = COALESCE($3, day_price),
        night_price = COALESCE($4, night_price),
        included_hours = COALESCE($5, included_hours),
        extra_note = COALESCE($6, extra_note),
        features = $7,
        sort_order = COALESCE($8, sort_order),
        is_active = COALESCE($9, is_active)
      WHERE id = $10
      `,
      [
        title,
        description,
        day_price,
        night_price,
        included_hours,
        extra_note,
        formattedFeatures,
        sort_order,
        is_active,
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Service pricing updated successfully",
    });
  } catch (error) {
    console.error("Error updating service pricing:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * DELETE /api/admin/pricing/:id (Admin Protected)
 */
const deletePricingPlan = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM service_pricing WHERE id = $1", [id]);
    res.status(200).json({
      success: true,
      message: "Service removed",
    });
  } catch (error) {
    console.error("Error deleting service pricing:", error);
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
