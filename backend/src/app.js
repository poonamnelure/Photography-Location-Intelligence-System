import express from "express"
import cors from "cors"
import locationRoutes from "./routes/locations.routes.js"
import reportRoutes  from "./routes/report.routes.js"
import photosRoutes from './routes/photos.js';
import jobsRoutes from './routes/jobs.js';
import cookieParser from "cookie-parser";
import authRoutes from "./auth/auth.routes.js";
import favoritesRoutes from './routes/favorites.js';
import activityRoutes from './routes/activity.routes.js'
import reviewRoutes from './routes/review.routes.js'
import { initNotificationCron } from './services/notification.cron.js'

const app = express()

console.log("Backend Client ID:", process.env.GOOGLE_CLIENT_ID);

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    
    if (!origin || 
        origin === allowedOrigin || 
        origin.startsWith('http://localhost:') || 
        origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS request from origin: ${origin}`);
      callback(null, false); // Pass false instead of Error to avoid 500 status on preflight
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(cookieParser());
app.use(express.json())

app.use("/api/health", ( req, res ) =>{
    res.json({
        status: "OK",
        message:"All is good"
    });
});

app.use('/uploads', express.static('uploads'));

app.use('/api/photos', photosRoutes);
app.use('/api/jobs', jobsRoutes);


app.use("/api/locations", locationRoutes)
app.use("/api/report", reportRoutes)

app.use("/api/auth", authRoutes);


app.use('/api/favorites', favoritesRoutes);

app.use("/api/activity", activityRoutes)

app.use("/api/review", reviewRoutes)

// Initialize notification cron job (visit reminders + review requests)
initNotificationCron();

export default app;