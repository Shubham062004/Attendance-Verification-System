# Smart Attendance Verification System

This repository contains the monorepo layout and foundational architecture for the **Smart Attendance Verification System**. The system consists of a Next.js 15 frontend application, a FastAPI backend service, and a PostgreSQL database.

---

## Project Structure

The project is structured as an isolated monorepo:

```text
Attendance-Verification-System/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # API router logic (health checks, controllers)
│   │   ├── core/             # Settings, logging, and 3rd party configurations
│   │   ├── db/               # SQLAlchemy engines, session creation, base classes
│   │   ├── models/           # DB schema representations (SQLAlchemy models)
│   │   ├── schemas/          # Pydantic models (data serialization / validation)
│   │   ├── services/         # Business logic layer
│   │   ├── utils/            # Helper functions
│   │   └── middleware/       # Custom API middlewares
│   ├── alembic/              # DB migration files and environments
│   ├── Dockerfile            # Container definition for Backend
│   ├── requirements.txt      # Python dependencies
│   └── pyproject.toml        # Ruff, Black, isort, mypy configuration
│
├── frontend/                 # Next.js 15 Client App
│   ├── app/                  # Next.js App Router (pages, layout, styles)
│   ├── components/           # UI Component skeleton (shadcn layout)
│   ├── hooks/                # React custom hooks
│   ├── services/             # API client services calling FastAPI
│   ├── lib/                  # Utilities (class names merging helper, etc.)
│   ├── types/                # Typescript typings
│   ├── constants/            # Client-side constants
│   ├── Dockerfile            # Multi-stage optimized production Docker build
│   └── package.json          # Node dependencies and scripts
│
├── docker-compose.yml        # Multi-container local orchestration
└── README.md                 # Project instructions and overview
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Design Baseline**: shadcn/ui

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.12+
- **ORM**: SQLAlchemy 2.0 (Declarative Base)
- **Migrations**: Alembic
- **Settings**: Pydantic Settings

### Database
- **PostgreSQL** (supports local postgres and Neon PostgreSQL serverless)

---

## Getting Started

### Prerequisites
- Node.js `v20.x` or `v22.x`
- Python `3.12` or `3.13`
- PostgreSQL instance running locally (or Neon DB connection string)

---

### Backend Setup

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```

3. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your local `.env` configuration:
   ```bash
   cp .env.example .env
   # Update DATABASE_URL with your PostgreSQL credentials
   ```

5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

   The server will run on `http://localhost:8000`. You can access documentation at `http://localhost:8000/docs`.

---

### Frontend Setup

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup local environment configurations:
   ```bash
   cp .env.example .env.local
   # Ensure NEXT_PUBLIC_API_URL points to the running backend
   ```

4. Start Next.js development server:
   ```bash
   npm run dev
   ```

   The client will run on `http://localhost:3000`.

---

## Docker Compose Support

To boot up the entire stack including a local PostgreSQL instance:

1. Ensure the Docker daemon is running.
2. Run the following command from the root project directory:
   ```bash
   docker compose up -d
   ```

This will run:
- **Database**: PostgreSQL on port `5432`
- **Backend API**: FastAPI on port `8000`
- **Frontend App**: Next.js on port `3000`

---

## Code Quality & Linting

We enforce strict formatting rules. Run these commands prior to committing:

### Backend Checks
Inside the `backend/` folder:
- **Format checking (Black)**: `black --check app`
- **Imports sorting check (isort)**: `isort --check-only app`
- **Linter (Ruff)**: `ruff check app`
- **Type safety check (mypy)**: `mypy app --explicit-package-bases`

To apply automatic fixes:
```bash
black app
isort app
ruff check app --fix
```

### Frontend Checks
Inside the `frontend/` folder:
- **Format checking (Prettier)**: `npm run format`
- **Linter & Type checks (ESLint & TSC)**: `npm run lint`