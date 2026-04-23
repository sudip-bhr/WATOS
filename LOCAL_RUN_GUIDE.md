# 🚀 WATOS Local Setup Guide

Welcome to the **WATOS (Workload Analysis & Task Optimization System)**. This guide will help you get the full stack running on your local machine for development and testing.

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[React Frontend] <--> B[FastAPI Backend]
    B <--> C[(PostgreSQL)]
    B <--> D[Redis]
    D <--> E[Celery Workers]
    E <--> F[ML Models / Inference]
```

---

## 1. Prerequisites

Ensure your system has the following installed:
- **Python 3.9+**
- **Node.js 18+** (with npm)
- **PostgreSQL 13+**
- **Redis** (required for background tasks and caching)

---

## 2. Environment Setup

From the root directory:

1. Create a `.env` file from the template:
   ```bash
   # We don't provide .env.example in the repo for security, 
   # but you can use the template below:
   touch .env
   ```
2. Add the following configuration to `.env`:
   ```env
   # Database
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/watos
   
   # Redis / Celery
   REDIS_URL=redis://localhost:6379/0
   
   # Security
   SECRET_KEY=generate-a-safe-random-string-here
   ALGORITHM=HS256
   
   # MLflow (Optional)
   MLFLOW_TRACKING_URI=mlruns
   ```

---

## 3. Backend Setup (FastAPI)

1. **Navigate and Virtual Env**:
   ```bash
   cd watos-backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Database Initialization**:
   ```bash
   # 1. Run migrations
   alembic upgrade head
   
   # 2. Seed initial data (Includes Admin, Operator, and Member users)
   python seed.py
   ```
   > [!TIP]
   > Use `python seed.py --reset` if you ever want to wipe and restart your test data.

4. **Start the API Server**:
   ```bash
   uvicorn app.main:app --reload
   ```
   Backend URL: `http://localhost:8000`  
   Interactive Docs: `http://localhost:8000/docs`

---

## 4. Background Services (Celery)

The platform uses Celery for ML inference, automated task assignment, and notifications.

In a **separate terminal** (with venv activated):
```bash
cd watos-backend
celery -A app.workers.tasks worker --loglevel=info
```

---

## 5. Frontend Setup (React/Vite)

1. **Navigate and Install**:
   ```bash
   cd ../watos-frontend
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Frontend URL: `http://localhost:5173`

---

## 6. Test Credentials

The seeder creates a professional environment with predefined roles. Use these to log in:

| Role | Email Prefix | Password | Features |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin.*` | `Test@1234` | Full access, Organization settings, ML Config |
| **🔧 Operator** | `ops.*` | `Test@1234` | Task assignment, Team Analytics, Workload Management |
| **💻 Member** | `dev.*` | `Test@1234` | Personal Tasks, Performance Tracking |

> [!NOTE]
> Check the terminal output after running `python seed.py` for the exact generated email addresses.

---

## 💡 Troubleshooting

- **Redis Error**: Ensure Redis is running (`redis-cli ping`).
- **Database Connection**: Verify your `DATABASE_URL` in `.env` and ensure the `watos` database exists in PostgreSQL.
- **ML Models**: The system expects models in `watos-backend/app/ml/models/`. These are included in the repo, but ensure they aren't corrupted.

---
© 2026 WATOS Team. Built with FastAPI, React, and Intelligence.
