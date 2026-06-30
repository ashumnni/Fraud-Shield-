# Fraud Shield 🛡️

**Fraud Shield** is a high-fidelity, AI-powered real-time fraud detection platform. It uses a state-of-the-art machine learning ensemble to ingest transaction streams, evaluate risk profiles, and provide instant explainability (XAI) using SHAP values on a sleek interactive dashboard.

---

## 🚀 Key Features

*   **Ensemble ML Model**: Combines supervised learning (**XGBoost**) and unsupervised anomaly detection (**Isolation Forest**) to capture both known fraud patterns and emerging zero-day anomalies.
*   **Explainable AI (SHAP)**: Explains the *why* behind every flag by showing the specific features driving the risk score up or down.
*   **Real-time Event Streaming**: Powered by **Server-Sent Events (SSE)**, transactions stream into the dashboard live with zero UI polling.
*   **High-Fidelity Dashboard**: Built with **Next.js**, **Zustand**, **Tailwind CSS**, **Recharts**, and **Framer Motion** for a smooth, premium monitoring experience.
*   **Transaction Simulator**: Features an auto-started background simulator that models realistic user behavioral patterns and high-risk transactions.

---

## 🛠️ Tech Stack

*   **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Recharts, Framer Motion, Zustand, Tailwind CSS.
*   **Backend**: FastAPI, SQLAlchemy, SQLite, Uvicorn.
*   **Machine Learning**: XGBoost, Scikit-learn, SHAP, Pandas, NumPy.

---

## 📦 Directory Structure

```
fraud-shield/
├── backend/
│   ├── app/
│   │   ├── db/          # Database connection, schemas
│   │   ├── models/      # ML engine, feature engineering, simulator
│   │   ├── routers/     # API routes (stream, transactions, analytics)
│   │   └── main.py      # Entry point
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/             # Next.js component tree and state hooks
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## ⚡ Setup & Local Run

### Method 1: Local Native Run (Recommended)

#### Prerequisites
*   Python 3.10+
*   Node.js 18+

#### 1. Start the FastAPI Backend
Navigate to the `backend` folder, install requirements, and run the server:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
The backend initializes the database, trains/loads the ML models on startup, and launches the live transaction simulator automatically.
*   **API Root**: `http://localhost:8000`
*   **Swagger Docs**: `http://localhost:8000/docs`

#### 2. Start the Next.js Frontend
Navigate to the `frontend` folder, install npm packages, and run the dev server:
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live dashboard.

---

### Method 2: Docker Compose

If you have Docker running on your system, you can spin up the entire stack with a single command:
```bash
docker-compose up -d --build
```
This runs the API on port `8000` and the dashboard on port `3000`.

---

## 🧠 Machine Learning Details

The pipeline evaluates transaction risk across $20+$ engineered features:
1.   **Spatial-Temporal**: Distance in km from last transaction, hour of day, night transaction flags.
2.   **User Velocities**: Velocity windows tracking transactions in the last 1 minute, 5 minutes, 1 hour, and 24 hours.
3.   **Device Profiles**: Rooted/jailbroken device flags, emulator detection, VPN/TOR network detection, and new device identifiers.
4.   **Heuristic Overrides**: Velocity anomalies, failed OTP attempts, and billing-shipping country mismatches.

Each incoming transaction yields a hybrid `risk_score` (0-100), visual flags, and a list of SHAP explanation metrics explaining the leading risk contributors.
