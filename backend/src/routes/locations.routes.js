import express from "express"
import { searchLocations } from "../controllers/locations.controllers.js"

const router = express.Router()

router.post("/search", searchLocations)

export default router   