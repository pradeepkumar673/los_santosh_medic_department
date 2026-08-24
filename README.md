# MediQueue AI — Hospital Management System with EmergencyFlow AI

A full-stack hospital management platform featuring intelligent queue management, AI-powered no-show prediction, real-time bed allocation, and the flagship **EmergencyFlow AI** — a proactive emergency command system that predicts resource shortages and coordinates multi-hospital response.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Router |
| **Backend** | Node.js + Express + TypeScript + MongoDB + Socket.IO |
| **ML Service** | Python FastAPI + scikit-learn + XGBoost |
| **Real-time** | Socket.IO with JWT-authenticated rooms |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Python 3.10+

### Installation

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd mediqueue-ai

# Server
cd server && npm install

# Client
cd ../client && npm install

# ML Service
cd ../ai-no-show-service && pip install -r requirements.txt
```

### Environment Setup

```bash
# Server
cp server/.env.example server/.env
# Edit MONGO_URI, JWT secrets, etc.

# Client
cp client/.env.example client/.env
```

### Seed the Database

```bash
cd server
npm run seed
```

This creates 21 demo accounts and a complete demo scenario including the EmergencyFlow AI active incident.

### Run All Services

```bash
# Terminal 1: MongoDB
mongod

# Terminal 2: ML Service
cd ai-no-show-service
python train_model.py --model rf
uvicorn app.main:app --reload --port 8001

# Terminal 3: Backend
cd server
npm run dev

# Terminal 4: Frontend
cd client
npm run dev
```

Open http://localhost:5173 and log in as:
- **Admin:** `admin@mediqueue.com` / `Demo@1234`
- **Doctor:** `dr.arjun@mediqueue.com` / `Demo@1234`
- **Patient:** `rajesh.krishnan@gmail.com` / `Demo@1234`

---

## 🚨 EmergencyFlow AI — Flagship Feature

**EmergencyFlow AI** is a proactive emergency command system that transforms reactive hospital management into predictive, coordinated disaster response across a multi-hospital network.

### Core Capabilities

- **🌱 Weather Risk Monitor** — Live Open-Meteo integration calculates disaster risk scores (0-100) and auto-creates weather-linked incidents when score ≥ 50
- **🩺 Ventilator Intelligence** — Real-time tracking, forecasted availability (30/60 min), and shortage probability with confidence intervals
- **📊 Multi-Hospital Allocation Engine** — Composite scoring using distance, care-bundle match, current load, and surge capacity
- **👥 Human-in-the-Loop** — All recommendations require human approval with mandatory override reasons (audit-logged)
- **⚡ Real-time Alerts** — Socket.IO broadcasts for incidents, resource changes, and shortage alerts
- **🧪 What-If Simulator** — Compare "Nearest Hospital" baseline vs EmergencyFlow AI under stress scenarios

### How to Demo EmergencyFlow AI

#### Step 1: Login as Admin
```
Email: admin@mediqueue.com
Password: Demo@1234
```

#### Step 2: Navigate to Emergency Command
Click **"Emergency Command"** in the sidebar (🚨 icon).

#### Step 3: Observe the Active Scenario
The Command Center displays:
- **Network Readiness Score** (circular gauge)
- **Active Incident Card** — "Highway Bus Crash — Multiple Casualties with Respiratory Distress"
- **Weather Risk Banner** — Shows current weather conditions and disaster risk
- **Critical Shortage Alert** — Ventilator utilization warning

#### Step 4: Explore Ventilator Dashboard
Click the **"Ventilator Dashboard"** button or navigate to `/emergency/ventilators`.

Observe:
- **City General Hospital** has 0 ventilators available (all occupied with staggered release times)
- Each hospital's risk gauge with shortage probability
- Recommended actions for high-risk hospitals

#### Step 5: Review the Pending Recommendation
Click the active incident card to open **Incident Detail**.

You'll see:
- Full incident details with confidence score (92%)
- Predicted arrivals (8 patients)
- **Hospital Ranking Table** — composite scores for all 5 hospitals
- **Pending Recommendation Card** for St. Jude's Trauma Center with:
  - AI confidence: 87%
  - Resource requests (3 ventilators, 3 ICU beds, 5 emergency beds, etc.)
  - Full explanation (10 detailed reasons)

#### Step 6: Human-in-the-Loop Approval
Click the green **"Approve"** button on the recommendation card.

**What happens:**
1. ✅ Recommendation status changes to "approved"
2. ✅ Resources are automatically reserved at St. Jude's
3. ✅ Sibling alternative recommendations are auto-rejected
4. ✅ Real-time socket broadcast updates all connected dashboards
5. ✅ Audit log records the approval action

#### Step 7: Try the Override Flow
1. Create a new incident (click "+ Create Incident")
2. Generate recommendations
3. Click **"Override"** on any recommendation
4. Enter a mandatory reason (min 5 characters)
5. Confirm — the override is permanently audit-logged

#### Step 8: Run the What-If Simulator
Navigate to `/emergency/simulator` (via Command Center quick actions).

Try these scenarios:
- **Scenario A:** Set casualties to 20, force all ventilators occupied
- **Scenario B:** Increase travel time multiplier to 2.5× (flood simulation)
- **Scenario C:** Close Santosh Medical Center

Click **"Run Simulation"** and compare:
- **Nearest Hospital** (baseline geographic routing)
- **EmergencyFlow AI** (composite scoring)

Observe how EmergencyFlow AI consistently outperforms on coverage score and shortage probability.

### Core Features

#### Queue Management
- Real-time token tracking
- Priority triage
- Doctor live queue controls

#### Appointment System
- Online booking with slot management
- Auto-status progression
- Email / SMS notifications

#### Bed Allocation
- Ward and bed type visualization
- Dynamic status management (vacant, occupied, cleaning, maintenance)
- Billing calculator

#### No-Show Prediction (ML)
- XGBoost classifier trained on historical attendance metrics
- Risk scoring (Low, Medium, High)
- Automated reminder triggers

---

## 👥 Demo Accounts

All demo accounts use password: `Demo@1234`

| Role | Email | Notes |
|------|-------|-------|
| **Admin** | `admin@mediqueue.com` | Full system access, EmergencyFlow AI Command Center |
| **Reception** | `reception@mediqueue.com` | Front desk queue & bed management |
| **Nurse** | `nurse1@mediqueue.com` | Queue monitor & bed management |
| **Doctor** | `dr.arjun@mediqueue.com` | Cardiology head |
| **Doctor** | `dr.vikram@mediqueue.com` | Emergency department head |
| **Patient** | `rajesh.krishnan@gmail.com` | Demo patient with appointments & history |