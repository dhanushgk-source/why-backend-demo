const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const {
  uploadProImage,
  getProImageStream,
  deleteProImage,
} = require("../services/googleDriveProService");

let proSchemaRan = false;
async function ensureProSchema() {
  if (proSchemaRan) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pros (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          designation VARCHAR(255) DEFAULT 'WHY PRO',
          is_verified BOOLEAN DEFAULT true,
          services JSONB DEFAULT '[]'::jsonb,
          city VARCHAR(255) DEFAULT 'Bengaluru',
          service_area VARCHAR(255),
          bio TEXT,
          languages JSONB DEFAULT '[]'::jsonb,
          experience_years VARCHAR(50),
          services_completed INT DEFAULT 0,
          rating NUMERIC(3,2),
          training_status VARCHAR(255) DEFAULT 'Verified & Trained',
          image_url TEXT,
          image_file_id TEXT,
          status VARCHAR(50) DEFAULT 'published',
          is_featured BOOLEAN DEFAULT false,
          sort_order INT DEFAULT 0,
          field_visibility JSONB DEFAULT '{
              "photo": true,
              "name": true,
              "designation": true,
              "verification_badge": true,
              "bio": true,
              "services": true,
              "languages": true,
              "city": true,
              "service_area": true,
              "experience": true,
              "services_completed": true,
              "customer_rating": false,
              "training_status": true,
              "view_profile_button": true
          }'::jsonb,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pro_section_settings (
          key VARCHAR(50) PRIMARY KEY DEFAULT 'main',
          show_section BOOLEAN DEFAULT true,
          section_heading TEXT DEFAULT 'Meet Our PROs',
          section_description TEXT DEFAULT 'Meet the trained professionals who are here to make every journey easier, safer, and more comfortable.',
          cards_per_row INT DEFAULT 3,
          show_profile_image BOOLEAN DEFAULT true,
          show_verification_badge BOOLEAN DEFAULT true,
          show_location BOOLEAN DEFAULT true,
          show_services BOOLEAN DEFAULT true,
          show_description BOOLEAN DEFAULT true,
          show_view_profile BOOLEAN DEFAULT true,
          enable_filters BOOLEAN DEFAULT true,
          filter_hospital_assistance BOOLEAN DEFAULT true,
          filter_travel_assistance BOOLEAN DEFAULT true,
          filter_city BOOLEAN DEFAULT true,
          filter_language BOOLEAN DEFAULT true,
          sort_mode VARCHAR(50) DEFAULT 'manual',
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      INSERT INTO pro_section_settings (key) VALUES ('main') ON CONFLICT (key) DO NOTHING;
    `);
    proSchemaRan = true;
  } catch (err) {
    console.error("⚠️ PRO schema migration error:", err.message);
  }
}

/**
 * Public: Get Published PROs & Public Section Settings
 */
const getPublicPros = async (req, res) => {
  try {
    await ensureProSchema();

    // Fetch settings
    const settingsRes = await pool.query(
      `SELECT * FROM pro_section_settings WHERE key = 'main'`
    );
    const settings = settingsRes.rows[0] || {};

    // Determine order
    let orderByClause = "is_featured DESC, sort_order ASC, created_at DESC";
    if (settings.sort_mode === "newest") {
      orderByClause = "is_featured DESC, created_at DESC";
    } else if (settings.sort_mode === "name_asc") {
      orderByClause = "is_featured DESC, name ASC";
    } else if (settings.sort_mode === "featured_first") {
      orderByClause = "is_featured DESC, sort_order ASC";
    }

    // Only published PROs appear publicly
    const prosRes = await pool.query(
      `SELECT * FROM pros WHERE LOWER(status) = 'published' ORDER BY ${orderByClause}`
    );

    res.status(200).json({
      success: true,
      settings,
      pros: prosRes.rows,
    });
  } catch (error) {
    console.error("Error getting public PROs:", error);
    res.status(500).json({
      success: false,
      message: "Server error loading PRO directory.",
    });
  }
};

/**
 * Public: Get Section Settings only
 */
const getPublicSettings = async (req, res) => {
  try {
    await ensureProSchema();
    const result = await pool.query(
      `SELECT * FROM pro_section_settings WHERE key = 'main'`
    );
    res.status(200).json({
      success: true,
      settings: result.rows[0] || {},
    });
  } catch (error) {
    console.error("Error getting PRO settings:", error);
    res.status(500).json({
      success: false,
      message: "Server error loading PRO settings.",
    });
  }
};

/**
 * Public Proxy: Stream Image
 */
const getProImage = async (req, res) => {
  try {
    const { fileId } = req.params;
    const driveRes = await getProImageStream(fileId);

    res.setHeader(
      "Content-Type",
      driveRes.headers["content-type"] || "image/jpeg"
    );
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");

    driveRes.data
      .on("error", (err) => {
        console.error("PRO image stream error:", err.message);
        if (!res.headersSent) res.sendStatus(404);
      })
      .pipe(res);
  } catch (error) {
    console.error("Get PRO Image Error:", error.message);
    res.status(404).send("Image not found");
  }
};

/**
 * Admin: Get All PROs (includes drafts, unpublished, archived, etc.)
 */
const getAdminPros = async (req, res) => {
  try {
    await ensureProSchema();

    const { search, status, service, city, featured } = req.query;

    let query = `SELECT * FROM pros WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(city) LIKE $${params.length} OR LOWER(designation) LIKE $${params.length})`;
    }

    if (status && status !== "all") {
      params.push(status.toLowerCase());
      query += ` AND LOWER(status) = $${params.length}`;
    }

    if (service && service !== "all") {
      params.push(`%${service.toLowerCase()}%`);
      query += ` AND EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(services) elem 
        WHERE LOWER(elem) LIKE $${params.length}
      )`;
    }

    if (city && city !== "all") {
      params.push(`%${city.toLowerCase()}%`);
      query += ` AND LOWER(city) LIKE $${params.length}`;
    }

    if (featured === "true") {
      query += ` AND is_featured = true`;
    }

    query += ` ORDER BY is_featured DESC, sort_order ASC, created_at DESC`;

    const result = await pool.query(query, params);

    const settingsRes = await pool.query(
      `SELECT * FROM pro_section_settings WHERE key = 'main'`
    );

    res.status(200).json({
      success: true,
      pros: result.rows,
      settings: settingsRes.rows[0] || {},
    });
  } catch (error) {
    console.error("Error getting admin PROs:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching PRO list.",
    });
  }
};

/**
 * Admin: Create PRO
 */
const createPro = async (req, res) => {
  try {
    await ensureProSchema();

    const {
      name,
      designation,
      is_verified,
      services,
      city,
      service_area,
      bio,
      languages,
      experience_years,
      services_completed,
      rating,
      training_status,
      status,
      is_featured,
      field_visibility,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "PRO name is required.",
      });
    }

    let imageUrl = null;
    let imageFileId = null;

    if (req.file) {
      const upload = await uploadProImage(req.file);
      imageUrl = upload.imageUrl;
      imageFileId = upload.fileId;
    }

    // Next max sort_order
    const maxOrderRes = await pool.query(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM pros"
    );
    const sort_order = maxOrderRes.rows[0]?.next_order || 0;

    const id = uuidv4();

    // Parse JSON fields safely if sent as stringified JSON
    const parsedServices = typeof services === "string" ? JSON.parse(services) : (services || ["Hospital Assistance"]);
    const parsedLanguages = typeof languages === "string" ? JSON.parse(languages) : (languages || ["English", "Kannada"]);
    const parsedFieldVisibility = typeof field_visibility === "string" ? JSON.parse(field_visibility) : (field_visibility || {
      photo: true,
      name: true,
      designation: true,
      verification_badge: true,
      bio: true,
      services: true,
      languages: true,
      city: true,
      service_area: true,
      experience: true,
      services_completed: true,
      customer_rating: false,
      training_status: true,
      view_profile_button: true,
    });

    await pool.query(
      `
      INSERT INTO pros (
        id, name, designation, is_verified, services, city, service_area,
        bio, languages, experience_years, services_completed, rating,
        training_status, image_url, image_file_id, status, is_featured,
        sort_order, field_visibility, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
      )
      `,
      [
        id,
        name.trim(),
        designation || "WHY PRO",
        is_verified !== undefined ? Boolean(is_verified) : true,
        JSON.stringify(parsedServices),
        city || "Bengaluru",
        service_area || "",
        bio || "",
        JSON.stringify(parsedLanguages),
        experience_years || "",
        services_completed ? parseInt(services_completed, 10) : 0,
        rating ? parseFloat(rating) : null,
        training_status || "Verified & Trained",
        imageUrl,
        imageFileId,
        status || "published",
        is_featured !== undefined ? Boolean(is_featured) : false,
        sort_order,
        JSON.stringify(parsedFieldVisibility),
      ]
    );

    res.status(201).json({
      success: true,
      message: "PRO profile created successfully.",
      id,
    });
  } catch (error) {
    console.error("Error creating PRO:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating PRO profile.",
    });
  }
};

/**
 * Admin: Update PRO
 */
const updatePro = async (req, res) => {
  try {
    await ensureProSchema();
    const { id } = req.params;

    const existingRes = await pool.query(`SELECT * FROM pros WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "PRO profile not found.",
      });
    }

    const existing = existingRes.rows[0];

    let imageUrl = existing.image_url;
    let imageFileId = existing.image_file_id;

    if (req.file) {
      if (imageFileId) {
        await deleteProImage(imageFileId);
      }
      const upload = await uploadProImage(req.file);
      imageUrl = upload.imageUrl;
      imageFileId = upload.fileId;
    }

    const {
      name,
      designation,
      is_verified,
      services,
      city,
      service_area,
      bio,
      languages,
      experience_years,
      services_completed,
      rating,
      training_status,
      status,
      is_featured,
      field_visibility,
      remove_photo,
    } = req.body;

    if (remove_photo === "true" && imageFileId) {
      await deleteProImage(imageFileId);
      imageUrl = null;
      imageFileId = null;
    }

    const parsedServices = typeof services === "string" ? JSON.parse(services) : (services !== undefined ? services : existing.services);
    const parsedLanguages = typeof languages === "string" ? JSON.parse(languages) : (languages !== undefined ? languages : existing.languages);
    const parsedFieldVisibility = typeof field_visibility === "string" ? JSON.parse(field_visibility) : (field_visibility !== undefined ? field_visibility : existing.field_visibility);

    await pool.query(
      `
      UPDATE pros SET
        name = COALESCE($1, name),
        designation = COALESCE($2, designation),
        is_verified = COALESCE($3, is_verified),
        services = $4,
        city = COALESCE($5, city),
        service_area = COALESCE($6, service_area),
        bio = COALESCE($7, bio),
        languages = $8,
        experience_years = COALESCE($9, experience_years),
        services_completed = COALESCE($10, services_completed),
        rating = $11,
        training_status = COALESCE($12, training_status),
        image_url = $13,
        image_file_id = $14,
        status = COALESCE($15, status),
        is_featured = COALESCE($16, is_featured),
        field_visibility = $17,
        updated_at = NOW()
      WHERE id = $18
      `,
      [
        name ? name.trim() : null,
        designation || null,
        is_verified !== undefined ? Boolean(is_verified) : null,
        JSON.stringify(parsedServices),
        city || null,
        service_area !== undefined ? service_area : null,
        bio !== undefined ? bio : null,
        JSON.stringify(parsedLanguages),
        experience_years !== undefined ? experience_years : null,
        services_completed !== undefined && services_completed !== "" ? parseInt(services_completed, 10) : null,
        rating !== undefined && rating !== "" ? parseFloat(rating) : null,
        training_status !== undefined ? training_status : null,
        imageUrl,
        imageFileId,
        status || null,
        is_featured !== undefined ? Boolean(is_featured) : null,
        JSON.stringify(parsedFieldVisibility),
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "PRO profile updated successfully.",
    });
  } catch (error) {
    console.error("Error updating PRO:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating PRO profile.",
    });
  }
};

/**
 * Admin: Delete PRO
 */
const deletePro = async (req, res) => {
  try {
    await ensureProSchema();
    const { id } = req.params;

    const existingRes = await pool.query(`SELECT image_file_id FROM pros WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "PRO profile not found.",
      });
    }

    if (existingRes.rows[0].image_file_id) {
      await deleteProImage(existingRes.rows[0].image_file_id);
    }

    await pool.query(`DELETE FROM pros WHERE id = $1`, [id]);

    res.status(200).json({
      success: true,
      message: "PRO profile deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting PRO:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting PRO profile.",
    });
  }
};

/**
 * Admin: Reorder PROs
 */
const reorderPros = async (req, res) => {
  try {
    await ensureProSchema();
    const { items } = req.body; // Array of { id, sort_order } or ["id1", "id2"]

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "items must be an array.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const id = typeof item === "string" ? item : item.id;
        const sort_order = typeof item === "object" && item.sort_order !== undefined ? item.sort_order : i;

        if (id) {
          await client.query(
            `UPDATE pros SET sort_order = $1, updated_at = NOW() WHERE id = $2`,
            [sort_order, id]
          );
        }
      }

      await client.query("COMMIT");
      res.status(200).json({
        success: true,
        message: "PRO order updated successfully.",
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error reordering PROs:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating PRO order.",
    });
  }
};

/**
 * Admin: Update Section Settings
 */
const updateProSettings = async (req, res) => {
  try {
    await ensureProSchema();

    const {
      show_section,
      section_heading,
      section_description,
      cards_per_row,
      show_profile_image,
      show_verification_badge,
      show_location,
      show_services,
      show_description,
      show_view_profile,
      enable_filters,
      filter_hospital_assistance,
      filter_travel_assistance,
      filter_city,
      filter_language,
      sort_mode,
    } = req.body;

    await pool.query(
      `
      UPDATE pro_section_settings SET
        show_section = COALESCE($1, show_section),
        section_heading = COALESCE($2, section_heading),
        section_description = COALESCE($3, section_description),
        cards_per_row = COALESCE($4, cards_per_row),
        show_profile_image = COALESCE($5, show_profile_image),
        show_verification_badge = COALESCE($6, show_verification_badge),
        show_location = COALESCE($7, show_location),
        show_services = COALESCE($8, show_services),
        show_description = COALESCE($9, show_description),
        show_view_profile = COALESCE($10, show_view_profile),
        enable_filters = COALESCE($11, enable_filters),
        filter_hospital_assistance = COALESCE($12, filter_hospital_assistance),
        filter_travel_assistance = COALESCE($13, filter_travel_assistance),
        filter_city = COALESCE($14, filter_city),
        filter_language = COALESCE($15, filter_language),
        sort_mode = COALESCE($16, sort_mode),
        updated_at = NOW()
      WHERE key = 'main'
      `,
      [
        show_section !== undefined ? Boolean(show_section) : null,
        section_heading || null,
        section_description || null,
        cards_per_row ? parseInt(cards_per_row, 10) : null,
        show_profile_image !== undefined ? Boolean(show_profile_image) : null,
        show_verification_badge !== undefined ? Boolean(show_verification_badge) : null,
        show_location !== undefined ? Boolean(show_location) : null,
        show_services !== undefined ? Boolean(show_services) : null,
        show_description !== undefined ? Boolean(show_description) : null,
        show_view_profile !== undefined ? Boolean(show_view_profile) : null,
        enable_filters !== undefined ? Boolean(enable_filters) : null,
        filter_hospital_assistance !== undefined ? Boolean(filter_hospital_assistance) : null,
        filter_travel_assistance !== undefined ? Boolean(filter_travel_assistance) : null,
        filter_city !== undefined ? Boolean(filter_city) : null,
        filter_language !== undefined ? Boolean(filter_language) : null,
        sort_mode || null,
      ]
    );

    const result = await pool.query(
      `SELECT * FROM pro_section_settings WHERE key = 'main'`
    );

    res.status(200).json({
      success: true,
      message: "PRO section settings updated successfully.",
      settings: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating PRO settings:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating PRO settings.",
    });
  }
};

module.exports = {
  getPublicPros,
  getPublicSettings,
  getProImage,
  getAdminPros,
  createPro,
  updatePro,
  deletePro,
  reorderPros,
  updateProSettings,
};
