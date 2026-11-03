# Bolti Basti - Multilingual Voice-First Civic Complaint Reporting Platform

Bolti Basti (बोलती बस्ती) empowers citizens to report civic grievances (roads, water, electricity, sanitation, drainage, etc.) in their local mother tongue (Marathi, Hindi, English) simply by speaking. 

Powered by **Sarvam AI**:
- **Sarvam Saaras V4**: Multilingual Speech-to-Text conversion.
- **Sarvam-105B**: Structured civic grievance information extraction (category, location, landmark, urgency, duration).
- **Sarvam Bulbul V4 Flash**: Multilingual spoken voice confirmation in the citizen's chosen language.

> [!NOTE]
> **Demo Disclaimer**: Bolti Basti is a hackathon innovation prototype. Generated ticket IDs are demo tickets and are not officially affiliated with or submitted to any municipal corporation.

---

## Architecture Overview

```
bolti-basti/
├── backend/
│   ├── src/
│   │   ├── config/db.js             # SQLite database initialization (node:sqlite)
│   │   ├── services/sarvamService.js# Sarvam AI (Saaras v4, 105B, Bulbul v4-flash)
│   │   ├── routes/complaints.js     # Ticket creation, updates, listing & stats
│   │   ├── routes/ai.js             # Voice transcription, extraction & audio synthesis
│   │   └── server.js                # Express app entry & error handling
│   ├── .env                         # Backend environment variables (SARVAM_API_KEY)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/              # Voice recorder, edit form, ticket confirmation, admin dashboard
│   │   ├── services/api.js          # Backend API client
│   │   ├── App.jsx                  # Main interface
│   │   └── index.css                # Civic-tech styling
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v26)
- **Sarvam AI API Key**: Sign up at [Sarvam AI](https://sarvam.ai) and obtain an API key.

### 2. Backend Setup
```bash
cd backend
npm install
# Configure your .env file
cp .env.example .env
# Edit .env and set your SARVAM_API_KEY
npm run dev
```
Backend runs on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.
