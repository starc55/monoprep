import { randomUUID } from 'crypto';
import { Router } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import multer from 'multer';
import {
  createUserSupabaseClient,
  requireSupabaseAdminClient
} from '../config/supabase.js';
import {
  requireAdmin,
  requireAuth,
  requireExamManager
} from '../middleware/auth.middleware.js';
import { uploadLimiter } from '../middleware/rateLimit.middleware.js';
import { ApiError } from '../utils/apiError.js';

const router = Router();
const imageExtensions = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif']
]);
const documentExtensions = new Map([
  ['application/pdf', '.pdf'],
  ['application/msword', '.doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx']
]);
const passageAssetExtensions = new Map([
  ...documentExtensions,
  ...imageExtensions
]);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
    parts: 2,
    fieldNameSize: 50
  },
  fileFilter(_req, file, callback) {
    if (!imageExtensions.has(file.mimetype)) {
      callback(new ApiError(400, 'Only PNG, JPG, WEBP, or GIF images can be uploaded.'));
      return;
    }

    callback(null, true);
  }
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
    fields: 0,
    parts: 2,
    fieldNameSize: 50
  },
  fileFilter(_req, file, callback) {
    if (!passageAssetExtensions.has(file.mimetype)) {
      callback(new ApiError(400, 'Only PDF, DOC, DOCX, PNG, JPG, WEBP, or GIF files can be uploaded.'));
      return;
    }

    callback(null, true);
  }
});

function isVerifiedPassageAsset(file, detectedType) {
  if (!detectedType) return false;
  if (imageExtensions.has(file.mimetype)) {
    return detectedType.mime === file.mimetype;
  }
  if (file.mimetype === 'application/msword') {
    return detectedType.mime === 'application/x-cfb';
  }
  return detectedType.mime === file.mimetype;
}

function safeDisplayName(value = 'document') {
  return String(value)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'document';
}

function receiveImage(req, res, next, uploadVerifiedImage) {
  imageUpload.single('image')(req, res, async (error) => {
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

    try {
      const detectedType = await fileTypeFromBuffer(req.file.buffer);
      if (!detectedType || detectedType.mime !== req.file.mimetype || !imageExtensions.has(detectedType.mime)) {
        next(new ApiError(400, 'The uploaded file content is not a supported image.'));
        return;
      }

      const { supabase, bucket, objectPath, upsert = false } = uploadVerifiedImage(
        req,
        detectedType
      );
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, req.file.buffer, {
          contentType: detectedType.mime,
          upsert
        });

      if (uploadError) {
        throw new ApiError(502, 'The image could not be stored.');
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      res.status(201).json({
        url: upsert ? `${data.publicUrl}?v=${Date.now()}` : data.publicUrl
      });
    } catch (uploadError) {
      next(uploadError);
    }
  });
}

function receivePassageAsset(req, res, next) {
  documentUpload.single('file')(req, res, async (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      next(new ApiError(400, 'Passage material must be 20 MB or smaller.'));
      return;
    }
    if (error) {
      next(error);
      return;
    }
    if (!req.file) {
      next(new ApiError(400, 'Choose passage material to upload.'));
      return;
    }

    try {
      const detectedType = await fileTypeFromBuffer(req.file.buffer);
      if (!isVerifiedPassageAsset(req.file, detectedType)) {
        next(new ApiError(400, 'The uploaded file content does not match its declared type.'));
        return;
      }

      const extension = passageAssetExtensions.get(req.file.mimetype);
      const objectPath = `${req.authUser.id}/passages/${Date.now()}-${randomUUID()}${extension}`;
      const supabase = requireSupabaseAdminClient();
      const { error: uploadError } = await supabase.storage
        .from('exam-assets')
        .upload(objectPath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) {
        throw new ApiError(502, 'The passage material could not be stored.');
      }

      const { data } = supabase.storage.from('exam-assets').getPublicUrl(objectPath);
      res.status(201).json({
        url: data.publicUrl,
        name: safeDisplayName(req.file.originalname),
        mimeType: req.file.mimetype
      });
    } catch (uploadError) {
      next(uploadError);
    }
  });
}

router.post('/avatar', requireAuth, uploadLimiter, (req, res, next) => {
  receiveImage(req, res, next, (request, detectedType) => ({
    supabase: createUserSupabaseClient(request.accessToken),
    bucket: 'avatars',
    objectPath: `${request.authUser.id}/avatar${imageExtensions.get(detectedType.mime)}`,
    upsert: true
  }));
});

router.post('/images', requireAuth, requireExamManager, uploadLimiter, (req, res, next) => {
  receiveImage(req, res, next, (request, detectedType) => ({
    supabase: requireSupabaseAdminClient(),
    bucket: 'exam-assets',
    objectPath: `${request.authUser.id}/${Date.now()}-${randomUUID()}${imageExtensions.get(detectedType.mime)}`
  }));
});

router.post('/passage-files', requireAuth, requireExamManager, uploadLimiter, receivePassageAsset);

router.post('/teacher-images', requireAuth, requireAdmin, uploadLimiter, (req, res, next) => {
  receiveImage(req, res, next, (request, detectedType) => ({
    supabase: requireSupabaseAdminClient(),
    bucket: 'teacher-files',
    objectPath: `${request.authUser.id}/${Date.now()}-${randomUUID()}${imageExtensions.get(detectedType.mime)}`
  }));
});

export default router;
