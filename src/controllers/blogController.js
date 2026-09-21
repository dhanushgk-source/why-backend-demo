const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Helper to generate slug
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// Auto-run schema column check & seed default categories with priority order
(async function ensureSchemaAndCategories() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_categories (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE post_categories ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url TEXT;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS hero_bg_url TEXT;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS theme_style VARCHAR(20) DEFAULT 'dark';
    `);

    // Check if categories table is empty, seed defaults with explicit priority
    const checkCats = await pool.query(`SELECT COUNT(*) FROM post_categories`);
    if (parseInt(checkCats.rows[0]?.count || 0, 10) === 0) {
      const defaults = [
        { name: "Hospital Assistance", order: 1 },
        { name: "Travel Assistance", order: 2 },
        { name: "Healthcare & Support", order: 3 },
        { name: "Safety & Well-being", order: 4 },
        { name: "Company News", order: 5 },
      ];
      for (const item of defaults) {
        const slug = slugify(item.name);
        await pool.query(
          `INSERT INTO post_categories (id, name, slug, display_order) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [uuidv4(), item.name, slug, item.order]
        );
      }
    }
  } catch (err) {
    console.error('ensureSchemaAndCategories error', err.message);
  }
})();

/** Create a new blog post */
async function createPost(req, res) {
  try {
    const {
      title,
      excerpt,
      content,
      categoryId,
      seoTitle,
      seoDescription,
      seoKeywords,
      primaryKeyword,
      secondaryKeywords,
      status = 'draft',
      publishedAt,
      scheduledAt,
      featuredImageUrl,
      featuredImageFileId,
      videoUrl,
      heroBgUrl,
      themeStyle = 'dark',
    } = req.body;

    const slug = slugify(title);
    const authorId = req.user.id;
    const postId = uuidv4();

    const cleanCatId = categoryId && categoryId.trim() !== '' ? categoryId : null;
    const cleanPubAt = publishedAt || (status === 'published' ? new Date() : null);

    const postResult = await pool.query(
      `INSERT INTO posts (
        id, title, slug, excerpt, content, category_id, author_id,
        seo_title, seo_description, seo_keywords, primary_keyword, secondary_keywords,
        status, published_at, scheduled_at, featured_image_url, featured_image_file_id,
        video_url, hero_bg_url, theme_style
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20
      ) RETURNING *`,
      [
        postId,
        title,
        slug,
        excerpt,
        content,
        cleanCatId,
        authorId,
        seoTitle,
        seoDescription,
        seoKeywords,
        primaryKeyword,
        secondaryKeywords,
        status,
        cleanPubAt,
        scheduledAt,
        featuredImageUrl,
        featuredImageFileId,
        videoUrl,
        heroBgUrl,
        themeStyle,
      ]
    );

    res.status(201).json({ success: true, post: postResult.rows[0] });
  } catch (err) {
    console.error('createPost error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** Update an existing post */
async function updatePost(req, res) {
  try {
    const { postId } = req.params;
    const {
      title,
      excerpt,
      content,
      categoryId,
      seoTitle,
      seoDescription,
      seoKeywords,
      primaryKeyword,
      secondaryKeywords,
      status,
      publishedAt,
      scheduledAt,
      featuredImageUrl,
      featuredImageFileId,
      videoUrl,
      heroBgUrl,
      themeStyle,
    } = req.body;

    const slug = title ? slugify(title) : undefined;
    const fields = [];
    const values = [];
    let idx = 1;
    if (title) { fields.push(`title = $${idx++}`); values.push(title); }
    if (slug) { fields.push(`slug = $${idx++}`); values.push(slug); }
    if (excerpt !== undefined) { fields.push(`excerpt = $${idx++}`); values.push(excerpt); }
    if (content !== undefined) { fields.push(`content = $${idx++}`); values.push(content); }
    if (categoryId !== undefined) {
      fields.push(`category_id = $${idx++}`);
      values.push(categoryId && categoryId.trim() !== '' ? categoryId : null);
    }
    if (videoUrl !== undefined) { fields.push(`video_url = $${idx++}`); values.push(videoUrl || null); }
    if (heroBgUrl !== undefined) { fields.push(`hero_bg_url = $${idx++}`); values.push(heroBgUrl || null); }
    if (themeStyle !== undefined) { fields.push(`theme_style = $${idx++}`); values.push(themeStyle); }
    if (seoTitle !== undefined) { fields.push(`seo_title = $${idx++}`); values.push(seoTitle); }
    if (seoDescription !== undefined) { fields.push(`seo_description = $${idx++}`); values.push(seoDescription); }
    if (seoKeywords !== undefined) { fields.push(`seo_keywords = $${idx++}`); values.push(seoKeywords); }
    if (primaryKeyword !== undefined) { fields.push(`primary_keyword = $${idx++}`); values.push(primaryKeyword); }
    if (secondaryKeywords !== undefined) { fields.push(`secondary_keywords = $${idx++}`); values.push(secondaryKeywords); }
    if (status) { fields.push(`status = $${idx++}`); values.push(status); }
    if (publishedAt) { fields.push(`published_at = $${idx++}`); values.push(publishedAt); }
    if (scheduledAt) { fields.push(`scheduled_at = $${idx++}`); values.push(scheduledAt); }
    if (featuredImageUrl !== undefined) { fields.push(`featured_image_url = $${idx++}`); values.push(featuredImageUrl || null); }
    if (featuredImageFileId !== undefined) { fields.push(`featured_image_file_id = $${idx++}`); values.push(featuredImageFileId || null); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(postId);
    const query = `UPDATE posts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    console.error('updatePost error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** Delete a post (admin) */
async function deletePost(req, res) {
  try {
    const { postId } = req.params;
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error('deletePost error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** List posts with optional filters (public) */
async function listPosts(req, res) {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let baseQuery = `SELECT p.*, c.name AS category_name FROM posts p LEFT JOIN post_categories c ON p.category_id = c.id WHERE p.status = 'published'`;
    const params = [];
    let idx = 1;
    if (category) {
      const catSlug = slugify(category);
      baseQuery += ` AND (c.slug = $${idx} OR LOWER(c.name) = LOWER($${idx + 1}) OR c.slug = $${idx + 2})`;
      params.push(catSlug, category, category);
      idx += 3;
    }
    if (search) { baseQuery += ` AND (p.title ILIKE $${idx++} OR p.excerpt ILIKE $${idx++})`; params.push(`%${search}%`, `%${search}%`); }
    baseQuery += ` ORDER BY p.published_at DESC NULLS LAST LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);
    const result = await pool.query(baseQuery, params);
    res.json({ success: true, posts: result.rows, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('listPosts error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** Get a single post by slug (public) */
async function getPostBySlug(req, res) {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      `SELECT p.*, c.name AS category_name FROM posts p LEFT JOIN post_categories c ON p.category_id = c.id WHERE p.slug = $1 AND p.status = 'published'`,
      [slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    console.error('getPostBySlug error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** Get a single post by ID (admin) */
async function getPostById(req, res) {
  try {
    const { postId } = req.params;
    const result = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    console.error('getPostById error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** Subscribe to newsletter (public) */
async function subscribeNewsletter(req, res) {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    await pool.query(
      `INSERT INTO newsletter_subscribers (id, email, name) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT (email) DO NOTHING`,
      [email.trim().toLowerCase(), name || null]
    );

    try {
      const { sendNewsletterWelcomeEmail } = require('../services/mailService');
      await sendNewsletterWelcomeEmail({ to: email, name });
    } catch (mailErr) {
      console.error('Newsletter confirmation mail error (non-fatal):', mailErr.message);
    }

    res.json({ success: true, message: 'Subscribed successfully! Confirmation email sent.' });
  } catch (err) {
    console.error('subscribeNewsletter error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** Unsubscribe from newsletter (public) */
async function unsubscribeNewsletter(req, res) {
  try {
    const email = req.body?.email || req.query?.email;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await pool.query(
      `DELETE FROM newsletter_subscribers WHERE LOWER(email) = $1 RETURNING *`,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Email address not found in subscribers list.' });
    }

    res.json({
      success: true,
      message: 'You have been unsubscribed successfully. Your email has been deleted from our database.',
      unsubscribedEmail: cleanEmail,
    });
  } catch (err) {
    console.error('unsubscribeNewsletter error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** Delete a subscriber manually (admin) */
async function deleteSubscriber(req, res) {
  try {
    const { email } = req.params;
    if (!email) return res.status(400).json({ success: false, message: 'Email param required' });

    await pool.query(
      `DELETE FROM newsletter_subscribers WHERE LOWER(email) = LOWER($1)`,
      [decodeURIComponent(email).trim()]
    );

    res.json({ success: true, message: 'Subscriber deleted successfully' });
  } catch (err) {
    console.error('deleteSubscriber error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}


/** Send custom newsletter campaign to all or selected subscribers (admin) */
async function sendNewsletterCampaign(req, res) {
  try {
    const {
      subject,
      preheader,
      heading,
      headerTagline,
      content,
      ctaLabel,
      ctaUrl,
      targetType = 'all',
      selectedEmails = [],
    } = req.body;

    if (!subject || !content) {
      return res.status(400).json({ success: false, message: 'Subject and Content required' });
    }

    let subscribers = [];

    if (targetType === 'selected' && Array.isArray(selectedEmails) && selectedEmails.length > 0) {
      const cleanEmails = selectedEmails.map((e) => e.trim().toLowerCase());
      const subsResult = await pool.query(
        `SELECT email, name FROM newsletter_subscribers WHERE LOWER(email) = ANY($1::text[])`,
        [cleanEmails]
      );
      subscribers = subsResult.rows;

      // Fallback: if any selected emails are not in newsletter_subscribers table directly
      if (subscribers.length < cleanEmails.length) {
        const foundSet = new Set(subscribers.map((s) => s.email.toLowerCase()));
        for (const mail of cleanEmails) {
          if (!foundSet.has(mail)) {
            subscribers.push({ email: mail, name: '' });
          }
        }
      }
    } else {
      const subsResult = await pool.query(`SELECT email, name FROM newsletter_subscribers`);
      subscribers = subsResult.rows;
    }

    if (subscribers.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients selected or found' });
    }

    const { sendCustomNewsletterEmail } = require('../services/mailService');

    let sentCount = 0;
    const errors = [];

    for (const sub of subscribers) {
      try {
        await sendCustomNewsletterEmail({
          to: sub.email,
          name: sub.name,
          subject,
          preheader,
          heading,
          headerTagline,
          content,
          ctaLabel,
          ctaUrl,
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed sending campaign to ${sub.email}:`, err.message);
        errors.push(`${sub.email}: ${err.message}`);
      }
    }

    if (sentCount === 0 && errors.length > 0) {
      return res.status(500).json({
        success: false,
        message: `Email dispatch failed: ${errors[0]}`,
        errors,
      });
    }

    res.json({
      success: true,
      message: `Corporate Newsletter broadcast sent to ${sentCount} ${sentCount === 1 ? 'recipient' : 'recipients'}.`,
    });
  } catch (err) {
    console.error('sendNewsletterCampaign error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** List all categories ordered by Priority / Display Order (public & admin) */
async function listCategories(req, res) {
  try {
    const result = await pool.query(`SELECT * FROM post_categories ORDER BY display_order ASC, name ASC`);
    res.json({ success: true, categories: result.rows });
  } catch (err) {
    console.error('listCategories error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** Create a new category with priority / display order (admin) */
async function createCategory(req, res) {
  try {
    const { name, displayOrder } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Category name required' });
    
    const trimmedName = name.trim();
    const slug = slugify(trimmedName);

    const existing = await pool.query(
      `SELECT * FROM post_categories WHERE LOWER(name) = LOWER($1) OR slug = $2`,
      [trimmedName, slug]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({ success: true, message: 'Category already exists', category: existing.rows[0] });
    }

    let finalOrder = Number(displayOrder);
    if (isNaN(finalOrder) || finalOrder <= 0) {
      const maxRes = await pool.query(`SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM post_categories`);
      finalOrder = parseInt(maxRes.rows[0]?.next_order || 1, 10);
    }

    const catId = uuidv4();
    const result = await pool.query(
      `INSERT INTO post_categories (id, name, slug, display_order) VALUES ($1, $2, $3, $4) RETURNING *`,
      [catId, trimmedName, slug, finalOrder]
    );

    res.status(201).json({ success: true, message: 'Category created', category: result.rows[0] });
  } catch (err) {
    console.error('createCategory error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** Update category name & priority order (admin) */
async function updateCategory(req, res) {
  try {
    const { catId } = req.params;
    const { name, displayOrder } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (name && name.trim()) {
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
      fields.push(`slug = $${idx++}`);
      values.push(slugify(name.trim()));
    }

    if (displayOrder !== undefined && displayOrder !== null) {
      fields.push(`display_order = $${idx++}`);
      values.push(Number(displayOrder));
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(catId);
    const query = `UPDATE post_categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, message: 'Category updated', category: result.rows[0] });
  } catch (err) {
    console.error('updateCategory error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** Delete a category (admin) */
async function deleteCategory(req, res) {
  try {
    const { catId } = req.params;
    await pool.query('DELETE FROM posts WHERE category_id = $1', [catId]);
    await pool.query('DELETE FROM post_categories WHERE id = $1', [catId]);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    console.error('deleteCategory error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** List newsletter subscribers (admin) */
async function listSubscribers(req, res) {
  try {
    const result = await pool.query(`SELECT * FROM newsletter_subscribers ORDER BY created_at DESC`);
    res.json({ success: true, subscribers: result.rows });
  } catch (err) {
    console.error('listSubscribers error', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  createPost,
  updatePost,
  deletePost,
  listPosts,
  getPostBySlug,
  getPostById,
  subscribeNewsletter,
  sendNewsletterCampaign,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listSubscribers,
  unsubscribeNewsletter,
  deleteSubscriber,
};
