# 📸 LensIQ – Context-Aware Photography Location Intelligence Platform

### AI-Powered Photography Planning & Photo Quality Analysis Platform

![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb)
![Express](https://img.shields.io/badge/Express.js-Framework-000000?style=for-the-badge&logo=express)
![Google Maps](https://img.shields.io/badge/Google-Maps_API-4285F4?style=for-the-badge&logo=googlemaps)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

# 🌟 Project Overview

LensIQ is an AI-powered web platform that assists photographers in discovering the most suitable photography locations using intelligent contextual analysis.

The system recommends locations based on:

- 📍 Photography Type
- ☀️ Weather Conditions
- 🌅 Lighting Quality
- 👥 Crowd Density
- 🗺️ Accessibility
- 🌍 Environmental Context

In addition, LensIQ provides an **AI-powered Photo Quality Analysis** module that evaluates uploaded photographs for quality, blur detection, sharpness, composition, and aesthetic score.

The platform helps photographers make better decisions **before** and **after** a photoshoot.

---

# 🎯 Problem Statement

Finding the perfect photography location requires considerable time and manual research.

Photographers often need to evaluate multiple factors such as weather, lighting, crowd density, accessibility, and timing before selecting a location.

LensIQ automates this process by intelligently analyzing multiple real-world parameters and generating ranked photography recommendations using an AI-powered scoring engine.

---

# ✨ Key Features

- 📍 Smart Photography Location Recommendation
- ☀️ Weather Intelligence
- 🌅 Lighting Analysis
- 🧠 Context-Aware Recommendation Engine
- 🗺️ Google Maps & Places Integration
- 📊 Suitability Score Meter
- 🏆 Ranked Photography Locations
- 🤖 AI Photo Quality Analysis
- 🔍 Blur Detection
- 🖼️ Personal Photo Gallery
- 📄 Downloadable Reports

---

# 🏗️ System Architecture

The overall architecture illustrates the interaction between the user interface, backend services, Location Intelligence Engine, AI Photo Analysis module, external APIs, and intelligent scoring system.

<p align="center">
<img src="screenshots/system-architecture.png" width="700">
</p>

---

# 📷 Application Screenshots

## 🏠 1. Home Page

The landing page allows photographers to select photography type, location, date, and search radius.

<p align="center">
<img src="screenshots/home-page.png" width="900">
</p>

---

## 🔍 2. Smart Location Search

Users can search locations using intelligent filters and Google Maps integration.

<p align="center">
<img src="screenshots/smart-location-search.png" width="900">
</p>

---

## 📊 3. Location Suitability Dashboard

Displays real-time suitability analysis based on weather, lighting, accessibility, and contextual environmental parameters.

<p align="center">
<img src="screenshots/suitability-dashboard.png" width="900">
</p>

---

## 🏆 4. Ranked Photography Locations

Locations are ranked using the weighted scoring engine with suitability reports, navigation, and scheduling support.

<p align="center">
<img src="screenshots/ranked-photography-locations.png" width="900">
</p>

---

## ⭐ 5. User Review Display & Feedback Analysis

Displays community reviews and feedback to help photographers make informed decisions.

<p align="center">
<img src="screenshots/user-review-feedback-analysis.png" width="900">
</p>

---

## 🤖 6. AI Photo Quality Analysis

Evaluates uploaded photographs using AI techniques including blur detection, sharpness analysis, image quality assessment, and aesthetic scoring.

<p align="center">
<img src="screenshots/photo-quality-analysis.png" width="700">
</p>

---

## 🖼️ 7. Personalized Photo Collection Dashboard

Allows users to organize photographs, view AI analysis results, and manage their personal photography collection.

<p align="center">
<img src="screenshots/personalized-dashboard.png" width="900">
</p>

---

# 💻 Technology Stack

| Category | Technologies |
|-----------|--------------|
| Frontend | React, HTML5, CSS3, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| AI | OpenCV, Image Processing |
| APIs | Google Maps API, Google Places API, OpenWeather API, Geolocation API |

---

# 📁 Project Structure

```text
Photography-Location-Intelligence-System
│
├── frontend/
├── backend/
├── screenshots/
│   ├── home-page.png
│   ├── smart-location-search.png
│   ├── suitability-dashboard.png
│   ├── ranked-photography-locations.png
│   ├── user-review-feedback-analysis.png
│   ├── photo-quality-analysis.png
│   ├── personalized-dashboard.png
│   └── system-architecture.png
│
├── README.md
├── package.json
└── .gitignore
```

---

# ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/poonamnelure/Photography-Location-Intelligence-System.git
```

Move into the project folder:

```bash
cd Photography-Location-Intelligence-System
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

---

# 🔄 How It Works

1. User selects the photography category.
2. User enters location, search radius, and preferred date.
3. Google APIs fetch nearby photography locations.
4. Environmental and weather data are collected.
5. The AI-based weighted scoring engine evaluates all candidate locations.
6. Ranked recommendations are generated.
7. Users can upload photographs for AI-powered quality analysis.

---

# 🧩 Core Modules

- User Interface
- Location Intelligence Engine
- Candidate Generator
- Context Enrichment Layer
- Weighted Scoring Engine
- Suitability Meter
- AI Photo Analysis Module

---

# 🌐 APIs Used

- Google Maps API
- Google Places API
- OpenWeather API
- Geolocation API

---

# 🚀 Future Enhancements

- 📱 Mobile Application
- 🚁 Drone Photography Support
- 🤖 AI Composition Suggestions
- ☁️ Cloud Deployment
- 📷 Personalized Recommendation Engine
- 🌍 Offline Navigation Support

---

# 🙏 Acknowledgements

Special thanks to:

- Google Maps Platform
- Google Places API
- OpenWeather API
- MongoDB
- React
- Node.js
- Express.js

---

# 📄 License

This project is licensed under the **MIT License**.

---

## ⭐ If you found this project useful, consider giving it a Star on GitHub.
