import express from 'express';
import { getJobStatus } from '../controllers/jobController.js';

import { verifyToken } from "../auth/auth.middleware.js";

const router = express.Router();

router.get('/:id/status', verifyToken, getJobStatus);

export default router;