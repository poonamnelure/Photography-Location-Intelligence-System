import express from 'express'
import { generateReport } from '../controllers/report.controller.js'

const route = express.Router()

route.post("/generate", generateReport)

export default route