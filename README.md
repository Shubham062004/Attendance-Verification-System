# Smart Attendance Verification System

[![Production Release](https://img.shields.io/badge/release-v1.0.0-blue.svg)](https://github.com/Shubham062004/Attendance-Verification-System)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-green.svg)](https://fastapi.tiangolo.com)
[![Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015-black.svg)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-grade, secure, and robust web application for classroom attendance tracking. It uses multi-factor verification—including GPS geofencing location, camera liveness detection (blink/smile), dynamic rotating QR codes, and cloud-hosted evidence uploads—to prevent attendance spoofing and ensure audit-safe attendance reporting.

---

## 1. System Architecture

The application is structured as a decoupled monorepo composed of a Next.js frontend, a FastAPI backend API, and a PostgreSQL database.

```mermaid
graph TD
    User([Student / Admin]) -->|HTTPS| Frontend[Next.js Frontend]
    Frontend -->|REST API + JWT| Backend[FastAPI Backend]
    Backend -->|SQL| Database[(PostgreSQL Database)]
    Backend -->|Uploads / Fetch| Cloudinary[Cloudinary Storage]
    Backend -->|Validate API Token| GoogleOAuth[Google OAuth API]
```

Detailed architectural diagrams, database ERDs, and data flows are available in the [Architecture Documentation](docs/ARCHITECTURE.md).

---

## 2. Platform Core Features (Release v1.0)

1. **Secure Authentication**: SSO login via Google OAuth 2.0 with custom role-based mapping for admins and students.
2. **Daily Session Management**: Admins can schedule classroom sessions specifying course, room, and geo-location coordinates.
3. **Dynamic QR Code Generation**: Cryptographically signed QR codes that rotate dynamically to prevent proxy sharing.
4. **GPS Geofencing Verification**: Verifies the student's physical location against classroom coordinates before allowing submission.
5. **Camera Liveness Checks**: Integrates webcams to verify student presence using active blink and smile detection.
6. **Cloud-Hosted Selfie Storage**: Securely uploads verification selfies directly to Cloudinary.
7. **Attendance Submission Pipeline**: Consolidates location, liveness, and dynamic tokens into an atomic verification request.
8. **Automated Risk Engine**: Flags attendance records (Low/Medium/High Risk) based on distance anomalies and liveness detection flags.
9. **Admin Dashboard KPIs**: Real-time stats on attendance rates, geofencing deviation averages, and flagged logs.
10. **Historical Attendance Log**: Allows students and admins to query chronological records.
11. **Comprehensive Excel/PDF Reports**: Exports formatted, audit-ready data.
12. **System Audit Logs**: Records all administrative changes and system logins.
13. **Weather & Hydration Success Page**: Displays weather-aware motivation and hydration tips upon successfully marking attendance.

---

## 3. Tech Stack

| Component | Technology | Version |
| --- | --- | --- |
| **Frontend** | Next.js (App Router), React, Tailwind CSS, shadcn/ui | v15.x / v18.x |
| **Backend** | FastAPI, Python, Pydantic, SQLAlchemy | v0.110+ / v3.12+ |
| **Database** | PostgreSQL | v16 |
| **Storage** | Cloudinary | - |
| **Auth** | Google OAuth 2.0, PyJWT | - |

---

## 4. Environment Variables Reference

A full template is available in `backend/.env.example` and `frontend/.env.example`.

### Backend Environment Variables
| Variable | Description | Example / Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgrespassword@localhost:5432/attendance_db` |
| `ENVIRONMENT` | Deployment stage (`development` or `production`) | `production` |
| `SECRET_KEY` | Cryptographic secret for signing sessions | *Generate secure 32-byte hex* |
| `JWT_SECRET` | Secret key used to sign access tokens | *Generate secure 32-byte hex* |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of permitted web origins | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your-id.apps.googleusercontent.com` |
| `ADMIN_EMAIL` | Admin account bootstrap email | `admin@example.com` |

---

## 5. Local Setup & Running

For complete setup guides, database migration workflows, and production deployment parameters, please see the [Deployment Guide](docs/DEPLOYMENT.md).

### Quick Start with Docker (Production Ready)

To start the entire production container stack (which runs processes under secure non-root users):

1. **Configure Environment Variables**:
   ```bash
   cp .env.docker.example .env.docker
   # Edit .env.docker with actual secrets
   ```
2. **Build and Start**:
   ```bash
   docker compose up -d --build
   ```
3. **Verify Container Health**:
   - Frontend: `http://localhost:3000`
   - Backend Docs: `http://localhost:8000/docs` (Disabled when `ENVIRONMENT=production`)
   - Backend Health Check: `http://localhost:8000/health`

---

## 6. Verification and Testing

Detailed verification workflows, User Acceptance Testing (UAT) templates, and regression suites are documented in the [Testing Reference Guide](docs/TESTING.md).

Prior to committing code, run quality checks on your workstation:

```bash
# Backend Quality Checks
cd backend
.venv/Scripts/ruff.exe check app/
.venv/Scripts/mypy.exe app/ --explicit-package-bases

# Frontend Quality Checks
cd frontend
npx tsc --noEmit
npm run lint
```