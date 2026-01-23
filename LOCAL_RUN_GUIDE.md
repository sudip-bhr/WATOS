# WATOS Local Setup Guide

Follow these steps to run the WATOS AI Platform on your local machine.

## 1. Prerequisites
Ensure you have the following installed:
*   **Python 3.9+**
*   **Node.js 18+** (with npm or yarn)
*   **PostgreSQL** (running locally or via Docker)
*   **Redis** (required for Celery task queuing)

## 2. Environment Configuration
From the project root:
1.  Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
2.  Update the values in `.env` (especially `DATABASE_URL` and `REDIS_URL`).

## 3. Backend Setup (FastAPI)
1.  Navigate to the backend directory:
    ```bash
    cd watos-backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Mac/Linux
    # venv\Scripts\activate   # Windows
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run database migrations:
    ```bash
    alembic upgrade head
    ```
5.  Start the FastAPI server:
    ```bash
    uvicorn app.main:app --reload
    ```
    The backend will be available at `http://localhost:8000`.

## 4. Background Workers (Celery)
In a **new terminal tab** (with venv activated):
1.  Navigate to `watos-backend`.
2.  Start the Celery worker:
    ```bash
    celery -A app.workers.tasks worker --loglevel=info
    ```

## 5. Frontend Setup (React/Vite)
In a **new terminal tab**:
1.  Navigate to the frontend directory:
    ```bash
    cd watos-frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:5173`.

## 6. Accessing the Platform
1.  Open `http://localhost:5173` in your browser.
2.  **Initial User**: Since the database is empty, you need to create your first user. Use the registration page if implemented, or manually insert a user with the `admin` role into the `users` table to access Analytics and Admin features.

---
### 💡 Troubleshooting
*   **Redis Connection**: Ensure Redis is running (`redis-cli ping` should return `PONG`).
*   **CORS**: If the frontend can't connect, verify `ALLOWED_ORIGINS` in your `.env`.
*   **Database**: Ensure the PostgreSQL database specified in `DATABASE_URL` exists.
