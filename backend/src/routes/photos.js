// src/routes/photos.js
import express from 'express';
import upload  from '../config/multer.js';
import {
  uploadPhotos,
  getBestPhotos,
  getJobResults,
  getUserGroupedPhotos   // <-- add this
} from '../controllers/photoController.js';
import { verifyToken } from '../auth/auth.middleware.js';

// Add this line after your existing routes
const router = express.Router();

// POST /api/photos/upload
// verifyToken first → then multer parses files → then controller
router.post('/upload', verifyToken, upload.array('photos', 100), uploadPhotos);

// GET /api/photos/best?photographyType=LANDSCAPE&page=1&limit=50
router.get('/best', verifyToken, getBestPhotos);

// GET /api/photos/results/:jobId
router.get('/results/:jobId', verifyToken, getJobResults);

router.get('/user', verifyToken, getUserGroupedPhotos);
export default router;