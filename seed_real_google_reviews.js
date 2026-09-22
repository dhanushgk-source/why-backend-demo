const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const REAL_GOOGLE_REVIEWS = [
  {
    name: 'Saritha Madhuri',
    role_or_title: 'Google Reviewer',
    service_type: 'Google Review',
    rating: 5,
    feedback_text: 'A very practical and much-needed initiative. Professional, kind, and handles elder assistance with the patience it actually requires.',
    status: 'approved',
    source: 'google',
    google_review_id: 'g_rev_saritha_madhuri',
    review_url: 'https://www.google.com/search?q=WHY+SERVICES+INDIA+PRIVATE+LIMITED',
  },
  {
    name: 'Rakesh Gowda',
    role_or_title: 'Google Reviewer',
    service_type: 'Google Review',
    rating: 5,
    feedback_text: "This is a very helpful program for people. Love the idea and initiative, it's something new and needed.",
    status: 'approved',
    source: 'google',
    google_review_id: 'g_rev_rakesh_gowda',
    review_url: 'https://www.google.com/search?q=WHY+SERVICES+INDIA+PRIVATE+LIMITED',
  },
  {
    name: 'Shriya A',
    role_or_title: 'Google Reviewer',
    service_type: 'Google Review',
    rating: 5,
    feedback_text: "Excellent service from WHY – We Help You. Their background-verified WHY PRO was caring, professional, and supportive during my family's hospital visit.",
    status: 'approved',
    source: 'google',
    google_review_id: 'g_rev_shriya_a',
    review_url: 'https://www.google.com/search?q=WHY+SERVICES+INDIA+PRIVATE+LIMITED',
  },
  {
    name: 'DEVAVIRUDAN',
    role_or_title: 'Google Reviewer',
    service_type: 'Google Review',
    rating: 5,
    feedback_text: 'Good servic3',
    status: 'approved',
    source: 'google',
    google_review_id: 'g_rev_devavirudan',
    review_url: 'https://www.google.com/search?q=WHY+SERVICES+INDIA+PRIVATE+LIMITED',
  },
  {
    name: 'Sneha Kondli',
    role_or_title: 'Google Reviewer',
    service_type: 'Google Review',
    rating: 5,
    feedback_text: 'Why Services is a thoughtful initiative that addresses a real need by providing reliable assistance, especially for families managing elder care.',
    status: 'approved',
    source: 'google',
    google_review_id: 'g_rev_sneha_kondli',
    review_url: 'https://www.google.com/search?q=WHY+SERVICES+INDIA+PRIVATE+LIMITED',
  },
];

async function seed() {
  try {
    console.log('Connecting to Database...');

    // 1. Delete old fake/mock Google reviews
    const deleteRes = await pool.query(
      `DELETE FROM testimonials WHERE source = 'google' OR google_review_id LIKE 'g_rev_%' OR name IN ('Rahul Mukhopadhyay', 'Sunita Reddy', 'Aravind Kumar')`
    );
    console.log(`Deleted ${deleteRes.rowCount} fake sample reviews.`);

    // 2. Insert the 5 REAL Google Reviews
    for (const rev of REAL_GOOGLE_REVIEWS) {
      const existing = await pool.query("SELECT id FROM testimonials WHERE google_review_id = $1 OR name = $2", [rev.google_review_id, rev.name]);
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO testimonials (name, role_or_title, service_type, rating, feedback_text, status, source, google_review_id, review_url, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            rev.name,
            rev.role_or_title,
            rev.service_type,
            rev.rating,
            rev.feedback_text,
            rev.status,
            rev.source,
            rev.google_review_id,
            rev.review_url,
          ]
        );
        console.log(`Inserted real Google Review: ${rev.name}`);
      } else {
        await pool.query(
          `UPDATE testimonials SET
             feedback_text = $1,
             rating = $2,
             review_url = $3,
             status = $4,
             source = $5
           WHERE id = $6`,
          [rev.feedback_text, rev.rating, rev.review_url, rev.status, rev.source, existing.rows[0].id]
        );
        console.log(`Updated real Google Review: ${rev.name}`);
      }
    }

    const all = await pool.query('SELECT name, source, status, review_url FROM testimonials ORDER BY created_at DESC');
    console.log('Current DB Testimonials after seed:');
    console.table(all.rows);

    console.log('✅ Real Google Reviews Seed Completed Successfully!');
  } catch (err) {
    console.error('Seed Error:', err);
  } finally {
    await pool.end();
  }
}

seed();
