const express = require('express');
const router = express.Router();

const {
  createPost,
  getPostBySlug,
  getPostById,
  updatePost,
  deletePost,
  listPosts,
  subscribeNewsletter,
  sendNewsletterCampaign,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listSubscribers,
  unsubscribeNewsletter,
  deleteSubscriber,
} = require('../controllers/blogController');

const authenticate = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');

// ── Public routes ──────────────────────────────────────────────────────────
router.get('/', listPosts);                         // GET /api/blog?category=&search=&page=&limit=
router.get('/categories', listCategories);          // GET /api/blog/categories
router.post('/subscribe', subscribeNewsletter);     // POST /api/blog/subscribe
router.post('/unsubscribe', unsubscribeNewsletter); // POST /api/blog/unsubscribe
router.get('/unsubscribe', unsubscribeNewsletter);  // GET /api/blog/unsubscribe

// ── Admin-only routes (authenticated) ─────────────────────────────────────
router.get('/subscribers', authenticate, adminOnly, listSubscribers); // GET /api/blog/subscribers
router.delete('/subscribers/:email', authenticate, adminOnly, deleteSubscriber); // DELETE /api/blog/subscribers/:email
router.post('/send-newsletter', authenticate, adminOnly, sendNewsletterCampaign); // POST /api/blog/send-newsletter
router.post('/', authenticate, adminOnly, createPost);                 // POST /api/blog
router.get('/admin/:postId', authenticate, adminOnly, getPostById);    // GET /api/blog/admin/:postId
router.put('/:postId', authenticate, adminOnly, updatePost);           // PUT /api/blog/:postId
router.delete('/:postId', authenticate, adminOnly, deletePost);        // DELETE /api/blog/:postId

// Categories Admin
router.post('/categories', authenticate, adminOnly, createCategory);         // POST /api/blog/categories
router.put('/categories/:catId', authenticate, adminOnly, updateCategory);   // PUT /api/blog/categories/:catId
router.delete('/categories/:catId', authenticate, adminOnly, deleteCategory);// DELETE /api/blog/categories/:catId

// ── Single Post By Slug MUST BE LAST to prevent catching static routes ──
router.get('/:slug', getPostBySlug);                // GET /api/blog/:slug

module.exports = router;
