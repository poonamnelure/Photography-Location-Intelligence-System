// src/controllers/photoController.js
import Photo from '../models/Photo.js';
import Job   from '../models/Job.js';
import imageProcessingQueue from '../queue/imageProcessingQueue.js';
import { PHOTOGRAPHY_TYPES } from '../utils/photographyConfig.js';

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/photos/upload
   Body (multipart/form-data):
     - photos[]          File[]  (up to 100 files, 100 MB total)
     - photographyType   string  one of PHOTOGRAPHY_TYPES
───────────────────────────────────────────────────────────────────────── */
export const uploadPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded. Make sure you are sending files with key "photos" as form-data.',
      });
    }

    // Validate photography type — default to GENERAL if omitted
    const rawType         = (req.body.photographyType || 'GENERAL').toUpperCase().trim();
    const photographyType = Object.values(PHOTOGRAPHY_TYPES).includes(rawType)
      ? rawType
      : 'GENERAL';

    // Get userId from verified JWT token
    const userId = req.user?.id || null;

    // Persist photo documents — linked to this user
    const photos = await Photo.insertMany(
      req.files.map(file => ({
        userId,                                  // ✅ user-linked
        imageUrl:        `/uploads/${file.filename}`,
        photographyType,
        status:          'UPLOADED',
      }))
    );

    // Create job record — linked to this user
    const job = await Job.create({
      userId,                                    // ✅ user-linked
      photoIds:        photos.map(p => p._id),
      photographyType,
      status:          'PENDING',
      progress:        0,
      stage:           'Queued',
      summary: {
        total:    photos.length,
        best:     0,
        average:  0,
        rejected: 0,
        failed:   0,
      },
    });

    // Push to BullMQ queue — your existing logic untouched
    await imageProcessingQueue.add('process-images', {
      jobId:           job._id.toString(),
      photoIds:        photos.map(p => p._id.toString()),
      photographyType,
    });

    return res.status(202).json({
      success:         true,
      jobId:           job._id,
      photographyType,
      totalPhotos:     photos.length,
      message:         `${photos.length} photo(s) queued for analysis as "${photographyType}" photography.`,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Upload failed.',
      error:   error.message,
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/photos/best
   Query params:
     - photographyType  string  (optional filter)
     - page             number  (default 1)
     - limit            number  (default 50)
───────────────────────────────────────────────────────────────────────── */
export const getBestPhotos = async (req, res) => {
  try {
    const { photographyType, page = 1, limit = 50 } = req.query;

    // Only return THIS user's best photos
    const query = {
      category: 'BEST',
      status:   'PROCESSED',
      userId:   req.user.id,                     // ✅ user-filtered
    };

    if (photographyType) {
      query.photographyType = photographyType.toUpperCase();
    }

    const skip   = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const photos = await Photo.find(query)
      .sort({ 'scores.aestheticScore': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-analysis.objects -analysis.labelMap');

    const total = await Photo.countDocuments(query);

    return res.json({
      success: true,
      photos,
      count:   photos.length,
      total,
    });

  } catch (error) {
    console.error('getBestPhotos error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch best photos.',
      error:   error.message,
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/photos/results/:jobId
   Returns all photos for a job, grouped by category.
   Only accessible by the user who created the job.
───────────────────────────────────────────────────────────────────────── */
export const getJobResults = async (req, res) => {
  try {
    // Find job — make sure it belongs to the logged-in user
    const job = await Job.findOne({
      _id:    req.params.jobId,
      userId: req.user.id,                       // ✅ user-filtered (privacy)
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.',                // same msg whether not found OR wrong user
      });
    }

    // Only return photos belonging to this user
    const photos = await Photo.find({
      _id:    { $in: job.photoIds },
      userId: req.user.id,                       // ✅ user-filtered
    }).sort({ 'scores.aestheticScore': -1 });

    const grouped = {
      best:     photos.filter(p => p.category === 'BEST'),
      average:  photos.filter(p => p.category === 'AVERAGE'),
      rejected: photos.filter(p => p.category === 'REJECTED'),
      failed:   photos.filter(p => p.status   === 'FAILED'),
    };

    return res.json({
      success: true,
      job: {
        id:              job._id,
        status:          job.status,
        progress:        job.progress,
        stage:           job.stage,
        photographyType: job.photographyType,
        summary:         job.summary,
        createdAt:       job.createdAt,
      },
      photos: grouped,
    });

  } catch (error) {
    console.error('getJobResults error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch results.',
      error:   error.message,
    });
  }
};

// Add this function to your existing photoController.js
export const getUserGroupedPhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    const photos = await Photo.find({ userId }).sort({ createdAt: -1 });

    const grouped = {
      best:     photos.filter(p => p.category === 'BEST'),
      average:  photos.filter(p => p.category === 'AVERAGE'),
      rejected: photos.filter(p => p.category === 'REJECTED')
    };

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch photos' });
  }
};