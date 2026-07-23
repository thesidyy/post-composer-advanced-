import express from 'express';
import { Op } from 'sequelize';
import Post from '../models/Post.js';

const router = express.Router();

/* ── GET /api/posts ─────────────────────────────────────────────
   Query params:
     search   – text search on post body
     tag      – exact tag filter
     sort     – 'asc' | 'desc' (default 'desc')
     limit    – integer (default 50, max 200)
     skip     – integer (default 0, for pagination)
──────────────────────────────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const { search, tag, sort = 'desc', limit = 50, skip = 0 } = req.query;

    const where = {};

    // Basic text search using LIKE
    if (search) {
      where.text = { [Op.like]: `%${search}%` };
    }

    // Tag filter: since tags are stored as a JSON array, we can search the stringified JSON
    if (tag) {
      where.tags = { [Op.like]: `%"${tag}"%` };
    }

    const sortOrder = sort === 'asc' ? 'ASC' : 'DESC';
    const limitNum  = Math.min(parseInt(limit) || 50, 200);
    const skipNum   = parseInt(skip) || 0;

    const { rows: posts, count: total } = await Post.findAndCountAll({
      where,
      order: [['createdAt', sortOrder]],
      offset: skipNum,
      limit: limitNum,
    });

    res.json({ posts, total, limit: limitNum, skip: skipNum });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/posts/:id ──────────────────────────────────────── */
router.get('/:id', async (req, res, next) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/posts ─────────────────────────────────────────── */
router.post('/', async (req, res, next) => {
  try {
    const { text = '', tags = [], images = [], gif = null } = req.body;

    // Validate
    if (!text.trim() && images.length === 0 && !gif) {
      return res.status(400).json({ error: 'Post must have text, images, or a GIF.' });
    }
    if (text.length > 600) {
      return res.status(400).json({ error: 'Text exceeds 600 characters.' });
    }
    if (!Array.isArray(tags) || tags.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 tags allowed.' });
    }
    if (images.length > 4) {
      return res.status(400).json({ error: 'Maximum 4 images allowed.' });
    }

    const post = await Post.create({ text, tags, images, gif });
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /api/posts/:id/like ───────────────────────────────── */
router.patch('/:id/like', async (req, res, next) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.liked  = !post.liked;
    post.likes  = post.liked ? post.likes + 1 : Math.max(0, post.likes - 1);
    await post.save();

    res.json(post);
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /api/posts/:id/bookmark ──────────────────────────── */
router.patch('/:id/bookmark', async (req, res, next) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.bookmarked = !post.bookmarked;
    await post.save();

    res.json(post);
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /api/posts/:id ───────────────────────────────────── */
router.delete('/:id', async (req, res, next) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Clean up Cloudinary images
    let images = post.images;
    if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch (e) { images = []; }
    }

    if (images && images.length) {
      try {
        const { v2: cloudinary } = await import('cloudinary');
        const publicIds = images.map(img => img.publicId).filter(Boolean);
        if (publicIds.length) {
          await cloudinary.api.delete_resources(publicIds);
        }
      } catch (cloudErr) {
        // Non-fatal: log but don't fail the delete
        console.warn('Cloudinary cleanup warning:', cloudErr.message);
      }
    }

    await post.destroy();
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

export default router;
