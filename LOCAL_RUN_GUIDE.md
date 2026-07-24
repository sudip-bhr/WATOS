# WATOS: Workload Analysis & Task Optimization System

Welcome to the official local setup guide for **WATOS**. This platform leverages Machine Learning to optimize task assignments, predict project delays, and balance team workloads in real-time.

---

## System Architecture

WATOS is built on a modern, distributed architecture:

```mermaid
graph TD
    subgraph Client
        A[React + Vite Frontend]
    end
    subgraph Server
        B[FastAPI Backend]
        G[Intelligence Engine / ML]
    end
    subgraph Storage
        C[(PostgreSQL - Primary DB)]
        D[Redis - Task Queue & Cache]
    end
    subgraph Workers
        E[Celery Worker - ML Inference]
        F[Celery Worker - Notifications]
    end

    A <--> B
    B <--> C
    B <--> D
    D <--> E
    D <--> F
    E <--> G
```

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Recommended Version | Purpose |
| :--- | :--- | :--- |
| **Python** | 3.9+ | Backend & ML Engine |
| **Node.js** | 18+ | Frontend Dashboard |
| **PostgreSQL** | 13+ | Persistent Storage |
| **Redis** | 6+ | Task Queuing & Pub/Sub |
| **Git** | Latest | Version Control |

---

## 🛠️ Step 1: Environment Configuration

WATOS requires specific environment variables to connect the frontend, backend, and database.

1. **Create the file**:
   ```bash
   touch .env
   ```
2. **Populate `.env`**: Copy and customize the following:

```env
# ── DATABASE ──────────────────────────────────────────────────
# Format: postgresql+asyncpg://user:password@host:port/dbname
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/watos

# ── REDIS & CELERY ───────────────────────────────────────────
# Used for background ML processing and real-time updates
REDIS_URL=redis://localhost:6379/0

# ── SECURITY ──────────────────────────────────────────────────
# Secret key for JWT token generation (keep this private!)
SECRET_KEY=y0ur_sup3r_s3cr3t_k3y_h3r3
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=8

# ── MLFLOW (Optional) ─────────────────────────────────────────
# For tracking ML experiments and model versions
MLFLOW_TRACKING_URI=mlruns
```

---

## 🐍 Step 2: Backend Setup (FastAPI)

The backend handles the API logic, authentication, and the Intelligence Engine.

1. **Initialize Virtual Environment**:
   ```bash
   cd watos-backend
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Database Migration**:
   ```bash
   # Ensure your PostgreSQL server is running and 'watos' DB is created
   alembic upgrade head
   ```

4. **Advanced Data Seeding**:
   Populate your local environment with professional CS data, multiple roles, and ML metrics.
   ```bash
   python seed.py --reset  # Cleans existing data and adds fresh test data
   ```

5. **Launch API Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

## ⚙️ Step 3: Background Intelligence (Celery)

The "Intelligence" part of WATOS (SLA monitoring, delay prediction) runs asynchronously.

In a **new terminal** (venv active):
```bash
cd watos-backend
source venv/bin/activate   # ← must activate venv first!
# Start the worker to process ML tasks
celery -A app.workers.tasks worker --loglevel=info
```

---

## 💻 Step 4: Frontend Setup (React)

The frontend is a high-performance React application using Vite and TailwindCSS.

1. **Install Packages**:
   ```bash
   cd ../watos-frontend
   npm install
   ```

2. **Launch Dev Server**:
   ```bash
   npm run dev
   ```
   Access the dashboard at: **`http://localhost:5173`**

---

## 🔑 Accessing the Platform

The `seed.py` script creates several accounts. Check the terminal output of the seed script for exact emails, or use these general patterns:

- **Admin Account**: `admin.arjun.sharma@watos.dev` (Password: `Test@1234`)
- **Operator Account**: `ops.priya.chen@watos.dev` (Password: `Test@1234`)
- **Member Account**: `dev.liam.kim@watos.dev` (Password: `Test@1234`)

### Features by Role:
- **Admin**: Organization-wide ML configuration, Audit Logs, and User management.
- **Operator**: Real-time workload heatmaps, AI-suggested task assignments, and project analytics.
- **Member**: Personal dashboard, task prioritization, and performance insights.

---

## 📂 Project Structure

```text
WATOS/
├── watos-backend/          # FastAPI, SQLAlchemy, & Celery
│   ├── app/
│   │   ├── api/            # Route handlers
│   │   ├── ml/             # Predictive models & logic
│   │   ├── models/         # DB Schemas
│   │   └── services/       # Business logic (SLA, Analytics)
│   └── tests/              # Pytest suite
├── watos-frontend/         # React + TypeScript
│   ├── src/
│   │   ├── components/     # UI Kit & Widgets
│   │   ├── pages/          # Views (Admin, Operator, etc.)
│   │   └── store/          # State Management (Zustand)
└── LOCAL_RUN_GUIDE.md      # You are here
```

---

## ❓ Troubleshooting

### 1. "Database 'watos' does not exist"
Log into your PostgreSQL and run:
```sql
CREATE DATABASE watos;
```

### 2. "Connection refused (Redis)"
Ensure Redis is active. If you have Docker, you can start it quickly:
```bash
docker run -d -p 6379:6379 redis
```

### 3. ML Models missing
Ensure the `.joblib` files are present in `watos-backend/app/ml/models/`. These are the pre-trained weights for the Intelligence Engine.

---
© 2026 WATOS Team. Built for the future of Engineering Management.
