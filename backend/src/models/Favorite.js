import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  locationName: { type: String, required: true },
  score: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  // NEW fields for richer display
  photographyType: { type: String, default: '' },
  highlights: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Favorite', favoriteSchema);