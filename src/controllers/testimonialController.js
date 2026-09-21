const pool = require("../config/db");

let migrationRan = false;

/**
 * Automatically creates the testimonials table if it doesn't exist
 */
async function runTestimonialsMigration() {
  if (migrationRan) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role_or_title VARCHAR(255) DEFAULT 'Valued Client',
        service_type VARCHAR(255) DEFAULT 'General Services',
        rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
        feedback_text TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        admin_notes TEXT,
        source VARCHAR(50) DEFAULT 'website',
        google_review_id VARCHAR(255),
        profile_photo_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'website';
      ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS google_review_id VARCHAR(255);
      ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

      CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials(status);
      CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON testimonials(created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_testimonials_google_review_id ON testimonials(google_review_id) WHERE google_review_id IS NOT NULL;
    `);
    migrationRan = true;
    console.log("✅ Testimonials schema migration verified and executed.");
  } catch (err) {
    console.error("⚠️ Testimonials schema migration error:", err.message);
  }
}

// Run migration on module load
runTestimonialsMigration();

/**
 * POST /api/testimonials
 * Public submission of feedback/testimonial (defaults to status 'pending')
 */
const submitTestimonial = async (req, res) => {
  try {
    const { name, email, role_or_title, service_type, rating, feedback_text } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Your name is required.",
      });
    }

    if (!feedback_text || !feedback_text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Feedback text is required.",
      });
    }

    let maxWords = 60;
    try {
      const settingsRes = await pool.query("SELECT testimonial_word_limit FROM site_settings WHERE id = 1");
      if (settingsRes.rows[0]?.testimonial_word_limit) {
        maxWords = parseInt(settingsRes.rows[0].testimonial_word_limit, 10);
      }
    } catch (e) {
      maxWords = 60;
    }

    const wordCount = feedback_text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > maxWords) {
      return res.status(400).json({
        success: false,
        message: `Feedback text must not exceed ${maxWords} words (currently ${wordCount} words).`,
      });
    }

    const parsedRating = parseInt(rating, 10);
    const validRating = !isNaN(parsedRating) && parsedRating >= 1 && parsedRating <= 5 ? parsedRating : 5;

    const result = await pool.query(
      `
      INSERT INTO testimonials
        (name, email, role_or_title, service_type, rating, feedback_text, status)
      VALUES
        ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
      `,
      [
        name.trim(),
        email ? email.trim() : null,
        role_or_title && role_or_title.trim() ? role_or_title.trim() : "Valued Client",
        service_type && service_type.trim() ? service_type.trim() : "General Services",
        validRating,
        feedback_text.trim(),
      ]
    );

    res.status(201).json({
      success: true,
      message: "Thank you! Your feedback has been submitted successfully and is pending review by our team.",
      testimonial: result.rows[0],
    });
  } catch (error) {
    console.error("Error submitting testimonial:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while submitting your feedback. Please try again.",
    });
  }
};

/**
 * GET /api/testimonials
 * Fetch approved testimonials for public website display
 */
const getPublicTestimonials = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name, role_or_title, service_type, rating, feedback_text, source, google_review_id, profile_photo_url, created_at
      FROM testimonials
      WHERE status = 'approved'
      ORDER BY rating DESC, created_at DESC
      `
    );

    res.status(200).json({
      success: true,
      testimonials: result.rows,
    });
  } catch (error) {
    console.error("Error fetching public testimonials:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load testimonials.",
    });
  }
};

/**
 * POST /api/admin/testimonials/sync-google
 * Manually trigger Google Business Reviews sync into database as pending reviews
 */
const { syncGoogleReviews } = require("../services/googlePlacesService");

const syncGoogleReviewsAdmin = async (req, res) => {
  try {
    const { apiKey, placeId } = req.body || {};
    const syncResult = await syncGoogleReviews(apiKey, placeId);
    res.status(200).json(syncResult);
  } catch (error) {
    console.error("Error syncing Google reviews:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to sync Google reviews.",
    });
  }
};

/**
 * GET /api/admin/testimonials
 * List all testimonials for admin panel moderation (supports status filter)
 */
const getAllTestimonialsAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    let query = "SELECT * FROM testimonials";
    const params = [];

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query += " WHERE status = $1";
      params.push(status);
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      testimonials: result.rows,
    });
  } catch (error) {
    console.error("Error fetching admin testimonials:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching testimonials.",
    });
  }
};

/**
 * PATCH /api/admin/testimonials/:id/status
 * Update testimonial moderation status ('approved', 'rejected', 'pending')
 */
const updateTestimonialStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'approved', 'rejected', or 'pending'.",
      });
    }

    const existing = await pool.query("SELECT * FROM testimonials WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found.",
      });
    }

    const result = await pool.query(
      `
      UPDATE testimonials
      SET status = $1,
          admin_notes = COALESCE($2, admin_notes),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [status, admin_notes || null, id]
    );

    res.status(200).json({
      success: true,
      message: `Testimonial status updated to '${status}'.`,
      testimonial: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating testimonial status:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating status.",
    });
  }
};

/**
 * DELETE /api/admin/testimonials/:id
 * Delete a testimonial entry
 */
const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query("SELECT * FROM testimonials WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found.",
      });
    }

    await pool.query("DELETE FROM testimonials WHERE id = $1", [id]);

    res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting testimonial.",
    });
  }
};

module.exports = {
  runTestimonialsMigration,
  submitTestimonial,
  getPublicTestimonials,
  getAllTestimonialsAdmin,
  updateTestimonialStatus,
  deleteTestimonial,
  syncGoogleReviewsAdmin,
};
