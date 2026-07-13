const pool = require("../db/db");

const {
  uploadAdImage,
  deleteAdImage,
  getAdImageStream,
} = require("../services/googleAdService");

/**
 * Create Advertisement
 */
exports.createAd = async (req, res) => {
  try {
    let imageUrl = null;
    let imageFileId = null;

    if (req.file) {
      const upload = await uploadAdImage(req.file);

      imageUrl = upload.imageUrl;
      imageFileId = upload.fileId;
    }

    const {
      title,
      subtitle,
      description,
      button_text,
      button_link,
      background_color,
      text_color,
      position,
      priority,
      is_active,
      start_date,
      end_date,
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO advertisements
      (
        title,
        subtitle,
        description,
        image_url,
        image_file_id,
        button_text,
        button_link,
        background_color,
        text_color,
        position,
        priority,
        is_active,
        start_date,
        end_date
      )

      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      )

      RETURNING *
      `,
      [
        title,
        subtitle,
        description,
        imageUrl,
        imageFileId,
        button_text,
        button_link,
        background_color,
        text_color,
        position,
        priority || 1,
        is_active ?? true,
        start_date || null,
        end_date || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Advertisement created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get All Advertisements
 */
exports.getAdvertisements = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM advertisements
      ORDER BY priority DESC, created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get Advertisement By ID
 */
exports.getAdvertisement = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM advertisements
      WHERE id=$1
      `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update Advertisement
 */
exports.updateAdvertisement = async (req, res) => {
  try {
    const id = req.params.id;

    const existing = await pool.query(
      `
      SELECT *
      FROM advertisements
      WHERE id=$1
      `,
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    let imageUrl = existing.rows[0].image_url;
    let imageFileId = existing.rows[0].image_file_id;

    if (req.file) {
      if (imageFileId) {
        await deleteAdImage(imageFileId);
      }

      const upload = await uploadAdImage(req.file);

      imageUrl = upload.imageUrl;
      imageFileId = upload.fileId;
    }

    const {
      title,
      subtitle,
      description,
      button_text,
      button_link,
      background_color,
      text_color,
      position,
      priority,
      is_active,
      start_date,
      end_date,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE advertisements

      SET
        title=$1,
        subtitle=$2,
        description=$3,
        image_url=$4,
        image_file_id=$5,
        button_text=$6,
        button_link=$7,
        background_color=$8,
        text_color=$9,
        position=$10,
        priority=$11,
        is_active=$12,
        start_date=$13,
        end_date=$14,
        updated_at=NOW()

      WHERE id=$15

      RETURNING *
      `,
      [
        title,
        subtitle,
        description,
        imageUrl,
        imageFileId,
        button_text,
        button_link,
        background_color,
        text_color,
        position,
        priority,
        is_active,
        start_date,
        end_date,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Advertisement updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete Advertisement
 */
exports.deleteAdvertisement = async (req, res) => {
  try {
    const id = req.params.id;

    const existing = await pool.query(
      `
      SELECT *
      FROM advertisements
      WHERE id=$1
      `,
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    if (existing.rows[0].image_file_id) {
      await deleteAdImage(existing.rows[0].image_file_id);
    }

    await pool.query(
      `
      DELETE FROM advertisements
      WHERE id=$1
      `,
      [id]
    );

    res.json({
      success: true,
      message: "Advertisement deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Stream Advertisement Image
 */
exports.getAdvertisementImage = async (req, res) => {
  try {
    const response = await getAdImageStream(req.params.fileId);

    response.data.pipe(res);
  } catch (error) {
    console.error(error);

    res.status(404).json({
      success: false,
      message: "Image not found",
    });
  }
};