import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import multer from 'multer';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { ApiError } from '../utils/apiError.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imageDirectory = path.join(__dirname, '..', '..', 'uploads', 'images');
const imageExtensions = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif']
]);

fs.mkdirSync(imageDirectory, { recursive: true });

const imageUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, callback) {
      callback(null, imageDirectory);
    },
    filename(_req, file, callback) {
      callback(null, `${Date.now()}-${randomUUID()}${imageExtensions.get(file.mimetype)}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    if (!imageExtensions.has(file.mimetype)) {
      callback(new ApiError(400, 'Only PNG, JPG, WEBP, or GIF images can be uploaded.'));
      return;
    }

    callback(null, true);
  }
});

router.use(requireAuth, requireAdmin);
router.post('/images', (req, res, next) => {
  imageUpload.single('image')(req, res, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      next(new ApiError(400, 'Image must be 5 MB or smaller.'));
      return;
    }
    if (error) {
      next(error);
      return;
    }
    if (!req.file) {
      next(new ApiError(400, 'Choose an image to upload.'));
      return;
    }

    res.status(201).json({
      url: `/uploads/images/${req.file.filename}`
    });
  });
});

export default router;
