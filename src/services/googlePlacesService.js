const pool = require("../config/db");

const DEFAULT_PLACE_ID = "ChIJgy4rs2gXrjsRSwftbC3nHTw";

/**
 * Fallback sample Google Reviews used if Google Maps API key is not yet set or during testing.
 */
const SAMPLE_GOOGLE_REVIEWS = [
  {
    google_review_id: "g_rev_001_rahul_m",
    author_name: "Rahul Mukhopadhyay",
    rating: 5,
    text: "Outstanding service! WHY PRO accompanied my father to the hospital when I couldn't be there. Kept me informed on WhatsApp throughout the consultation.",
    profile_photo_url: "https://lh3.googleusercontent.com/a/ACg8ocI_default_user_1=s120-c-rp-mo-br100",
    time: Date.now() - 86400000 * 2
  },
  {
    google_review_id: "g_rev_002_sunita_r",
    author_name: "Sunita Reddy",
    rating: 5,
    text: "Very professional and empathetic team in Bengaluru. My mother felt completely safe and cared for during her clinic visit. Highly recommended!",
    profile_photo_url: "https://lh3.googleusercontent.com/a/ACg8ocI_default_user_2=s120-c-rp-mo-br100",
    time: Date.now() - 86400000 * 5
  },
  {
    google_review_id: "g_rev_003_aravind_k",
    author_name: "Aravind Kumar",
    rating: 5,
    text: "Clear communication, verified companions, and zero hassle. Perfect companion service for family members.",
    profile_photo_url: null,
    time: Date.now() - 86400000 * 8
  }
];

/**
 * Sync Google Reviews for WHY Services into the database as pending testimonials.
 */
async function syncGoogleReviews(forcedApiKey = null, forcedPlaceId = null) {
  const apiKey = forcedApiKey || process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  const placeId = forcedPlaceId || process.env.GOOGLE_PLACE_ID || DEFAULT_PLACE_ID;

  let reviewsToProcess = [];
  let isMocked = false;

  if (apiKey && apiKey.startsWith("AIzaSy")) {
    try {
      console.log(`fetching Google Places reviews for Place ID: ${placeId}...`);
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,reviews,user_ratings_total&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.result && Array.isArray(data.result.reviews)) {
        reviewsToProcess = data.result.reviews.map((r, index) => ({
          google_review_id: r.author_url || `g_rev_${placeId}_${r.time}_${index}`,
          author_name: r.author_name || "Google User",
          rating: r.rating || 5,
          text: r.text || "",
          profile_photo_url: r.profile_photo_url || null,
          time: r.time ? r.time * 1000 : Date.now()
        }));
      } else {
        console.warn(`Google Places API returned status: ${data.status} (${data.error_message || "No reviews returned"}).`);
        isMocked = true;
        reviewsToProcess = SAMPLE_GOOGLE_REVIEWS;
      }
    } catch (fetchErr) {
      console.error("Error calling Google Places API:", fetchErr.message);
      isMocked = true;
      reviewsToProcess = SAMPLE_GOOGLE_REVIEWS;
    }
  } else {
    console.log("No standard Google Places API key configured (AIzaSy...). Using sample Google reviews for demonstration.");
    isMocked = true;
    reviewsToProcess = SAMPLE_GOOGLE_REVIEWS;
  }

  let importedCount = 0;
  let skippedCount = 0;

  for (const rev of reviewsToProcess) {
    if (!rev.text || !rev.text.trim()) continue;

    const reviewId = rev.google_review_id;

    // Check if already exists in DB
    const existing = await pool.query(
      "SELECT id FROM testimonials WHERE google_review_id = $1",
      [reviewId]
    );

    if (existing.rows.length > 0) {
      skippedCount++;
      continue;
    }

    // Insert as pending review for admin moderation
    await pool.query(
      `
      INSERT INTO testimonials
        (name, role_or_title, service_type, rating, feedback_text, status, source, google_review_id, profile_photo_url, created_at)
      VALUES
        ($1, $2, $3, $4, $5, 'pending', 'google', $6, $7, NOW())
      `,
      [
        rev.author_name,
        "Google Reviewer",
        "Google Review",
        rev.rating,
        rev.text.trim(),
        reviewId,
        rev.profile_photo_url || null
      ]
    );

    importedCount++;
  }

  return {
    success: true,
    importedCount,
    skippedCount,
    totalProcessed: reviewsToProcess.length,
    isMocked,
    message: isMocked
      ? `Synced ${importedCount} Google reviews (sample mode until standard Google Maps API key is configured).`
      : `Successfully synced ${importedCount} new Google reviews from Google Places API (${skippedCount} already exist).`
  };
}

module.exports = {
  syncGoogleReviews,
  DEFAULT_PLACE_ID
};
