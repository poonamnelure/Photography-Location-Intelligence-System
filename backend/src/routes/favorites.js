import express from 'express';
import Favorite from '../models/Favorite.js';
import { verifyToken } from '../auth/auth.middleware.js';

const router = express.Router();

// GET all favorites for logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(favorites);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST add a favorite
router.post('/', verifyToken, async (req, res) => {
  try {
    const { locationName, score, imageUrl, photographyType, highlights } = req.body;
    const existing = await Favorite.findOne({ userId: req.user.id, locationName });
    if (existing) return res.status(200).json({ message: 'Already in favorites' });
    const favorite = new Favorite({
      userId: req.user.id,
      locationName,
      score,
      imageUrl,
      photographyType: photographyType || '',
      highlights: highlights || [],
    });
    await favorite.save();
    res.status(201).json({ success: true, favorite });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a favorite (optional)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Favorite.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;