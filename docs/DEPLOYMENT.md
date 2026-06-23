# Production Deployment Guide

This guide covers deployment setup using Docker Compose, environment configuration, database migrations, and verification procedures.

---

## 1. Prerequisites
- Docker & Docker Compose installed.
- Cloudinary Account (for selfie uploads).
- Google Cloud Console Project (with OAuth client credentials).

---

## 2. Docker Compose Production Deployment

The root directory contains a production-ready `docker-compose.yml` that pulls pre-packaged dependencies and runs under strict security policies (non-root container execution).

### Step-by-Step Setup

1. **Configure Environment Variables**:
   Copy `.env.docker.example` to `.env.docker` and update all values:
   ```bash
   cp .env.docker.example .env.docker
   ```

2. **Secure Secrets**:
   Generate cryptographically secure keys for `.env.docker`:
   ```bash
   # Generate SECRET_KEY
   openssl rand -hex 32
   # Generate JWT_SECRET
   openssl rand -hex 32
   ```

3. **Launch the Container Stack**:
   Start the services in detached mode:
   ```bash
   docker compose up -d --build
   ```

4. **Verify Container Health**:
   Check that all three containers (`attendance_db`, `attendance_backend`, `attendance_frontend`) are running and that the backend passes its health checks:
   ```bash
   docker compose ps
   ```

---

## 3. Database Migration Procedures

Database schemas are tracked using Alembic. Database migrations run automatically during startup if configured. To run migrations manually:

```bash
# Exec into backend container and run migrations
docker compose exec backend alembic upgrade head
```

---

## 4. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project and navigate to **APIs & Services > Credentials**.
3. Create an **OAuth 2.0 Client ID** (Web application).
4. Add Authorized Redirect URIs:
   - For Dev: `http://localhost:3000`
   - For Prod: `https://your-app.example.com`
5. Copy the Client ID and Secret and insert them into your `.env.docker` file.

---

## 5. Cloudinary Setup
1. Sign in to your [Cloudinary Dashboard](https://cloudinary.com/).
2. Copy the **Cloud Name**, **API Key**, and **API Secret** from the dashboard.
3. Configure these values under `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env.docker`.

---

## 6. Post-Deployment Verification
Perform the following checks to verify successful deployment:
- Access the frontend homepage at `http://localhost:3000` (or your domain).
- Verify the backend health endpoint at `http://localhost:8000/health`.
- Test logging in using a valid Google OAuth account.
