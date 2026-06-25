# MediQueue AI — Hospital Management & Queue System

> **Full-stack hospital management platform** with real-time queues, AI triage scoring, ML-powered no-show prediction, and bed management. Built with React + Node.js/Express + MongoDB + FastAPI.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Project Structure](#3-project-structure)
4. [Environment Setup](#4-environment-setup)
5. [Running MongoDB](#5-running-mongodb)
6. [Installing Dependencies](#6-installing-dependencies)
7. [Training the AI Model](#7-training-the-ai-model)
8. [Running All Services](#8-running-all-services)
9. [Seeding Demo Data](#9-seeding-demo-data)
10. [Demo Credentials](#10-demo-credentials)
11. [API Reference](#11-api-reference)
12. [Tech Stack](#12-tech-stack)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Browser / App                  │
│         React + Vite (port 5173)                │
└──────────────────────┬──────────────────────────┘
                       │  REST + WebSocket
┌──────────────────────▼──────────────────────────┐
│           Node.js / Express API                 │
│         TypeScript (port 5000)                  │
│  Auth · Appointments · Queue · Beds · Triage    │
└──────┬───────────────────────────┬──────────────┘
       │  Mongoose                 │  HTTP (axios)
┌──────▼──────┐        ┌──────────▼──────────────┐
│  MongoDB    │        │   Python FastAPI         │
│  (port      │        │   No-Show AI Service     │
│  27017)     │        │   (port 8001)            │
└─────────────┘        └─────────────────────────┘
```

### Key Features

| Feature | Details |
|---|---|
| **Real-time Queue** | Socket.IO — live updates across doctor, patient, and admin views |
| **AI Triage Engine** | Rule-based vitals + symptom scoring (critical / urgent / moderate / low) |
| **No-Show Prediction** | XGBoost / RandomForest ML microservice — per-appointment risk score |
| **Bed Management** | Allocate, discharge, track occupancy with live dashboard |
| **Role-Based Access** | `admin` · `reception` · `doctor` · `nurse` · `patient` |
| **Medical Assessments** | Pre-booking vitals capture, triage override with audit trail |

---

## 2. Prerequisites

| Tool | Minimum Version | Check |
|---|---|---|
| **Node.js** | 18.x LTS | `node -v` |
| **npm** | 9.x | `npm -v` |
| **Python** | 3.10+ | `python3 --version` |
| **pip** | 22+ | `pip3 --version` |
| **MongoDB** | 6.0+ (Community) | `mongod --version` |
| **Git** | any | `git --version` |

> **Windows users:** Use [MongoDB Compass](https://www.mongodb.com/products/compass) or run MongoDB via Docker (see §5).

---

## 3. Project Structure

```
mediqueue-ai/
├── package.json                  # Root: concurrently scripts
├── README.md
│
├── client/                       # React frontend (Vite + TypeScript)
│   ├── .env.example
│   ├── vite.config.ts
│   └── src/
│       ├── pages/                # patient · doctor · reception · auth
│       ├── components/           # BedAllocationBoard, LiveQueueBoard …
│       ├── hooks/                # useRealtimeQueue, useRealtimeBeds …
│       ├── services/             # api.client.ts, socket.service.ts
│       └── store/                # authStore, uiStore (Zustand)
│
├── server/                       # Node.js + Express API (TypeScript)
│   ├── .env.example
│   ├── nodemon.json
│   └── src/
│       ├── app.ts                # Express app setup
│       ├── server.ts             # HTTP + Socket.IO bootstrap
│       ├── config/               # db.ts · env.ts · socket.ts
│       ├── controllers/          # appointment · bed · queue · auth …
│       ├── models/               # Mongoose schemas
│       ├── routes/               # Express routers
│       ├── services/             # triage · noShowPrediction · token
│       ├── utils/
│       │   ├── seed.ts           # ← Demo data seed script (Step 7)
│       │   ├── ApiError.ts
│       │   ├── ApiResponse.ts
│       │   └── asyncHandler.ts
│       └── validators/           # Zod schemas
│
└── ai-no-show-service/           # Python FastAPI ML microservice
    ├── requirements.txt
    ├── train_model.py            # Generates + trains the model
    ├── models/                   # Created after training (gitignored)
    │   ├── no_show_model.pkl
    │   └── model_metadata.json
    └── app/
        ├── main.py               # FastAPI app
        ├── model_loader.py
        └── schemas.py
```

---

## 4. Environment Setup

### 4a. Server (`server/.env`)

Copy the example and fill in your values:

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
# ── MongoDB ────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/mediqueue_ai

# ── JWT ────────────────────────────────────────────
JWT_ACCESS_SECRET=change_me_to_a_long_random_string_32chars
JWT_REFRESH_SECRET=change_me_to_another_long_random_string
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# ── Server ─────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ── AI Microservice ────────────────────────────────
ML_SERVICE_URL=http://localhost:8001

# ── CORS ───────────────────────────────────────────
CLIENT_ORIGIN=http://localhost:5173
```

> **Security:** Never commit `.env` files. Generate secure secrets with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 4b. Client (`client/.env`)

```bash
cp client/.env.example client/.env
```

Edit `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 5. Running MongoDB

### Option A — Local Install (recommended)

```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0

# Ubuntu / Debian
sudo systemctl start mongod
sudo systemctl enable mongod

# Windows (run as Administrator in PowerShell)
net start MongoDB
```

Verify it's up:

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
# Expected: { ok: 1 }
```

### Option B — Docker

```bash
docker run -d \
  --name mediqueue-mongo \
  -p 27017:27017 \
  -v mediqueue_data:/data/db \
  mongo:7.0

# To stop:
docker stop mediqueue-mongo
```

---

## 6. Installing Dependencies

Install all three workspaces in one command from the project root:

```bash
npm run install:all
```

This runs:
- `npm install` (root — installs `concurrently`)
- `npm install --prefix server`
- `npm install --prefix client`

### Python AI Service

```bash
cd ai-no-show-service

# Create a virtual environment (strongly recommended)
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

---

## 7. Training the AI Model

The no-show prediction service requires a trained model file before it can start. Run this **once** (from inside the virtual environment):

```bash
cd ai-no-show-service
source .venv/bin/activate          # skip if already activated

# Train with RandomForest (default, faster):
python train_model.py

# Or train with XGBoost (slightly higher accuracy):
python train_model.py --model xgb
```

Expected output:

```
              precision    recall  f1-score   support
        show       0.78      0.85      0.81       987
    no_show       0.62      0.50      0.55       413

ROC-AUC: 0.7943

Saved model -> models/no_show_model.pkl
Saved metadata -> models/model_metadata.json
```

The `models/` directory is created automatically inside `ai-no-show-service/`.

> **Note:** You only need to retrain if you want to experiment with different model parameters. The seed script and the rest of the system work with whichever model pkl is present.

---

## 8. Running All Services

### 8a. Start everything (recommended)

From the **project root**, run all three services concurrently:

```bash
npm run dev:all
```

This starts:
| Service | Port | Log prefix |
|---|---|---|
| Node.js API | `5000` | `[server]` |
| React frontend | `5173` | `[client]` |
| Python AI service | `8001` | Python stdout |

### 8b. Start services individually (debugging)

**Terminal 1 — Backend API:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

**Terminal 3 — AI microservice:**
```bash
cd ai-no-show-service
source .venv/bin/activate
uvicorn app.main:app --port 8001 --reload
```

### 8c. Verify all services are up

```bash
# Backend health
curl http://localhost:5000/api/health

# AI service health
curl http://localhost:8001/health

# Frontend — open in browser
open http://localhost:5173
```

Expected responses:
```json
// Backend
{"success": true, "message": "OK"}

// AI service
{"status": "ok"}
```

---

## 9. Seeding Demo Data

With MongoDB and the backend running, seed the database with realistic demo data (departments, doctors, patients, appointments, beds, queue entries):

### Add the seed script to `server/package.json`

Open `server/package.json` and add this to the `"scripts"` section:

```json
{
  "scripts": {
    "dev": "nodemon",
    "build": "tsc",
    "seed": "ts-node -r tsconfig-paths/register src/utils/seed.ts"
  }
}
```

Install `ts-node` if not already present:

```bash
cd server
npm install --save-dev ts-node tsconfig-paths
```

### Run the seed

```bash
cd server
npm run seed
```

Expected output:

```
🌱  MediQueue AI — Seed Script
══════════════════════════════════════════════

📡  Connecting to MongoDB: mongodb://localhost:27017/mediqueue_ai
✅  Connected

🗑   Clearing existing collections…
✅  Collections cleared

🏥  Seeding departments…
    ↳ 9 departments created

👥  Seeding staff users…
    ↳ 13 staff users created

🩺  Seeding doctor profiles…
    ↳ 9 doctor profiles created

🤒  Seeding patients…
    ↳ 8 patients created

📅  Seeding appointments…
    ↳ 14 appointments created

🔢  Seeding queue entries…
    ↳ 6 queue entries created

🛏   Seeding beds…
    ↳ 33 beds created

🛏   1 bed allocation created (Arun Prakash → CARD-B-03)

══════════════════════════════════════════════
✅  SEED COMPLETE
```

> **Re-seeding:** The script is idempotent — it drops and re-inserts all data on every run. Safe to run multiple times.

### What gets seeded

| Collection | Count | Notes |
|---|---|---|
| Departments | 9 | Cardiology, Ortho, Peds, Gen Med, Derm, ENT, Gynae, Neuro, Emergency |
| Users (staff) | 13 | 1 admin, 1 reception, 2 nurses, 9 doctors |
| Users (patients) | 8 | Realistic Indian patient profiles |
| Doctor Profiles | 9 | One per department, with specializations and working hours |
| Patients | 8 | Full profiles with chronic conditions, allergies, emergency contacts |
| Appointments | 14 | Mix of today's, yesterday's (completed/no-show), and future |
| Queue Entries | 4-6 | Today's live queue (waiting / called / in_progress) |
| Beds | 33 | General, ICU, Private, Pediatric, Maternity, Emergency beds |
| Bed Allocations | 1 | Arun Prakash admitted to CARD-B-03 (active) |

---

## 10. Demo Credentials

All accounts use the same password: **`Demo@1234`**

| Role | Email | Dashboard |
|---|---|---|
| **Admin** | `admin@mediqueue.com` | Full system access, user management |
| **Reception** | `reception@mediqueue.com` | Book appointments, manage queue, allocate beds |
| **Nurse** | `nurse1@mediqueue.com` | Triage assessments, queue management |
| **Nurse** | `nurse2@mediqueue.com` | Same as above |
| **Doctor — Cardiology** | `dr.arjun@mediqueue.com` | Doctor queue, assessments |
| **Doctor — Orthopedics** | `dr.meena@mediqueue.com` | Doctor queue |
| **Doctor — Pediatrics** | `dr.ravi@mediqueue.com` | Doctor queue |
| **Doctor — General Medicine** | `dr.sunita@mediqueue.com` | Doctor queue |
| **Doctor — Dermatology** | `dr.kiran@mediqueue.com` | Doctor queue |
| **Doctor — ENT** | `dr.pooja@mediqueue.com` | Doctor queue |
| **Doctor — Gynecology** | `dr.ramesh@mediqueue.com` | Doctor queue |
| **Doctor — Neurology** | `dr.anita@mediqueue.com` | Doctor queue |
| **Doctor — Emergency** | `dr.vikram@mediqueue.com` | Doctor queue |
| **Patient** | `rajesh.krishnan@gmail.com` | Book appointments, view queue |
| **Patient** | `deepa.s@yahoo.com` | Book appointments, view queue |
| **Patient** | `faisal.m@outlook.com` | Book appointments, view queue |
| **Patient** | `kavya.reddy@gmail.com` | Book appointments, view queue |
| **Patient** | `arun.p@gmail.com` | Currently admitted (bed CARD-B-03) |
| **Patient** | `preethi.n@gmail.com` | Book appointments |
| **Patient** | `sathish.k@gmail.com` | Book appointments |
| **Patient** | `nithya.mohan@gmail.com` | Book appointments |

---

## 11. API Reference

Base URL: `http://localhost:5000/api`

All protected routes require `Authorization: Bearer <accessToken>` header, or the `accessToken` cookie set at login.

### Auth

| Method | Route | Body | Access |
|---|---|---|---|
| `POST` | `/auth/register` | `{name, email, phone, password, role}` | Public |
| `POST` | `/auth/login` | `{email, password}` | Public |
| `POST` | `/auth/logout` | — | Authenticated |
| `POST` | `/auth/refresh` | — | Public (uses refreshToken cookie) |
| `GET` | `/auth/me` | — | Authenticated |

### Departments

| Method | Route | Access |
|---|---|---|
| `GET` | `/departments` | All |
| `GET` | `/departments/:id` | All |
| `POST` | `/departments` | Admin |
| `PATCH` | `/departments/:id` | Admin |
| `DELETE` | `/departments/:id` | Admin |

### Doctors

| Method | Route | Access |
|---|---|---|
| `GET` | `/doctors` | All |
| `GET` | `/doctors/:id` | All |
| `POST` | `/doctors` | Admin |
| `PATCH` | `/doctors/:id` | Admin, Doctor (self) |

### Patients

| Method | Route | Access |
|---|---|---|
| `GET` | `/patients` | Admin, Reception, Nurse, Doctor |
| `GET` | `/patients/:id` | Admin, Reception, Nurse, Doctor, Patient (self) |
| `POST` | `/patients` | Admin, Reception |
| `PATCH` | `/patients/:id` | Admin, Reception |

### Appointments

| Method | Route | Access |
|---|---|---|
| `GET` | `/appointments` | Admin, Reception, Doctor, Nurse |
| `GET` | `/appointments/:id` | All roles |
| `POST` | `/appointments` | Admin, Reception, Patient |
| `PATCH` | `/appointments/:id/status` | Admin, Reception, Doctor, Nurse |

### Queue

| Method | Route | Query Params | Access |
|---|---|---|---|
| `GET` | `/queue` | `?doctorId=&departmentId=&date=` | All |
| `GET` | `/queue/estimated-wait` | `?queueEntryId=` | All |
| `POST` | `/queue/call-next` | `{doctorId}` | Admin, Reception, Doctor |
| `PATCH` | `/queue/:id/status` | `{status}` | Admin, Reception, Doctor, Nurse |

### Beds

| Method | Route | Access |
|---|---|---|
| `GET` | `/beds` | All |
| `GET` | `/beds/:id` | All |
| `POST` | `/beds` | Admin |
| `PATCH` | `/beds/:id` | Admin, Reception |
| `PATCH` | `/beds/:id/status` | Admin, Reception |
| `POST` | `/beds/:id/allocate` | Admin, Reception |
| `POST` | `/beds/:id/discharge` | Admin, Reception |
| `GET` | `/beds/allocations` | Admin, Reception, Doctor, Nurse |
| `DELETE` | `/beds/:id` | Admin |

### Assessments (Triage)

| Method | Route | Access |
|---|---|---|
| `POST` | `/assessments/score-only` | Admin, Reception, Nurse, Doctor |
| `POST` | `/assessments` | Admin, Reception, Nurse, Doctor |
| `GET` | `/assessments` | Admin, Reception, Nurse, Doctor |
| `GET` | `/assessments/:id` | All |
| `PATCH` | `/assessments/:id` | Admin, Nurse, Doctor |
| `PATCH` | `/assessments/:id/link-appointment` | Admin, Reception, Nurse, Doctor |
| `PATCH` | `/assessments/:id/triage-override` | Admin, Nurse, Doctor |

### Admin

| Method | Route | Access |
|---|---|---|
| `GET` | `/admin/users` | Admin |
| `GET` | `/admin/users/:id` | Admin |
| `PATCH` | `/admin/users/:id/activate` | Admin |
| `PATCH` | `/admin/users/:id/deactivate` | Admin |
| `PATCH` | `/admin/users/:id/role` | Admin |
| `DELETE` | `/admin/users/:id` | Admin |
| `GET` | `/admin/stats` | Admin, Reception |

### AI Service (port 8001)

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/model-info` | Trained model metadata |
| `POST` | `/predict-no-show` | Single appointment no-show risk |
| `POST` | `/predict-no-show/batch` | Batch predictions |

---

## 12. Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** — build tool
- **Tailwind CSS** — styling
- **Zustand** — state management
- **Socket.IO Client** — real-time updates
- **Axios** — HTTP client

### Backend
- **Node.js 18** + **TypeScript**
- **Express 4** — HTTP framework
- **Socket.IO** — WebSocket server
- **Mongoose** — MongoDB ODM
- **bcryptjs** — password hashing
- **jsonwebtoken** — JWT auth
- **Zod** — request validation
- **date-fns** — date utilities
- **nodemon** — dev auto-reload

### AI Microservice
- **Python 3.10+**
- **FastAPI** — REST API framework
- **scikit-learn** — ML pipeline
- **XGBoost** — gradient boosting
- **pandas / numpy** — data processing
- **joblib** — model serialisation

### Database
- **MongoDB 6+** — primary datastore

---

## 13. Troubleshooting

### `MongoServerError: E11000 duplicate key error`
The seed script is idempotent — run `npm run seed` again. If it persists, run:
```bash
mongosh mediqueue_ai --eval "db.dropDatabase()"
npm run seed
```

### `Error: Cannot find module '../models/Notification.model'`
The `Notification` model file must exist. If missing, create a stub:
```typescript
// server/src/models/Notification.model.ts
import { Schema, model } from "mongoose";
const notificationSchema = new Schema({}, { timestamps: true });
export default model("Notification", notificationSchema);
```

### AI service: `FileNotFoundError: no_show_model.pkl`
You need to train the model first:
```bash
cd ai-no-show-service
source .venv/bin/activate
python train_model.py
```

### AI service unreachable (no-show prediction returns null)
This is **non-fatal** — appointments and queues continue working. The API logs `[noShowPrediction] ML service unreachable` and stores `null` risk scores. Start the Python service to enable predictions.

### WebSocket connection refused
Ensure `VITE_SOCKET_URL=http://localhost:5000` in `client/.env` and that the backend is running on port 5000.

### `ts-node: command not found` when running seed
```bash
cd server
npm install --save-dev ts-node tsconfig-paths
npm run seed
```

### MongoDB connection timeout
Check that MongoDB is running:
```bash
sudo systemctl status mongod      # Linux
brew services list | grep mongodb # macOS
```

### Port already in use
```bash
# Find and kill the process on port 5000
lsof -ti:5000 | xargs kill -9

# Or change the port in server/.env:
PORT=5001
# and update client/.env:
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

---

## Quick Start Checklist

```
□ MongoDB is running (port 27017)
□ cp server/.env.example server/.env   → fill in values
□ cp client/.env.example client/.env   → fill in values
□ npm run install:all                  → from project root
□ cd ai-no-show-service && pip install -r requirements.txt
□ python train_model.py                → train the ML model
□ npm run dev:all                      → from project root (starts all 3 services)
□ cd server && npm run seed            → seed demo data
□ Open http://localhost:5173           → login with demo credentials
```

---

*MediQueue AI — Built for Santosh Medical Department*