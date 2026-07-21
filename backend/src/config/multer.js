// src/config/multer.js
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_, file, cb) => {
    // Add random suffix to guarantee uniqueness (even if same millisecond)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_, file, cb) => {
    // Added image/jfif so .jfif files are accepted too
    const allowed = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/jfif',
    ];

    // Some browsers send .jfif files with mimetype image/jpeg — still fine
    // Some send it as application/octet-stream — we check extension as fallback
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.jfif'];

    if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed: JPG, PNG, WEBP, JFIF`), false);
    }
  },
});

export default upload;