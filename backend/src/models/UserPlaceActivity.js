import mongoose from "mongoose";

const userPlaceActivitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    placeId: {
        type: String,
        required: true
    },

    placeName: {
        type: String,
        required: true
    },

    location: {
        lat: Number,
        lng: Number
    },

    photographyType: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        enum: ["interested", "scheduled", "visited"],
        default: "interested",
        index: true
    },

    scheduledDate: {
        type: Date,
        default: null
    },

    visitedAt: {
        type: Date,
        default: null
    },

    emailNotify: {
        type: Boolean,
        default: false
    },

    // lightweight UI info
    preview: {
        score: Number,
        highlights: [String],
        photographyType: String,
        imageUrl: String
    },

    metadataTimestamp: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

userPlaceActivitySchema.index({ userId: 1, status: 1 });

export default mongoose.model("UserPlaceActivity", userPlaceActivitySchema);