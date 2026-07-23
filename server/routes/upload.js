import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

/* ── Configure Cloudinary ── */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

/* ── Multer ↔ Cloudinary storage ── */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'postcomposer',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, crop: 'limit' },          // resize large images
      { quality: 'auto:good', fetch_format: 'auto' }, // smart compression + WebP delivery
    ],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,   // 8 MB per file
    files: 4,                     // max 4 images
  },
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only JPG, PNG, WebP allowed.`));
    }
  },
});

/* ── POST /api/upload ────────────────────────────────────────────
   Accepts: multipart/form-data with field name "images" (1–4 files)
   Returns: [{ id, url, publicId }]
──────────────────────────────────────────────────────────────── */
router.post('/', upload.array('images', 4), (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images received.' });
    }

    const uploaded = req.files.map(file => ({
      id:       crypto.randomUUID(),
      url:      file.path,           // Cloudinary HTTPS URL
      publicId: file.filename,       // Cloudinary public_id (for deletions)
    }));

    res.status(201).json({ images: uploaded });
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /api/upload/:publicId ────────────────────────────── */
router.delete('/:publicId(*)', async (req, res, next) => {
  try {
    // publicId may contain slashes (e.g. "postcomposer/abc123")
    const result = await cloudinary.uploader.destroy(req.params.publicId);
    res.json({ result });
  } catch (err) {
    next(err);
  }
});

export default router;
