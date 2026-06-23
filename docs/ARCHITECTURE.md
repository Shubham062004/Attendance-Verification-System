# System Architecture & Database Schema

This document details the system architecture, module relationships, and database schema for the **Smart Attendance Verification System**.

---

## 1. High-Level System Architecture

The application is structured as a decoupled SPA (Single Page Application) frontend communicating with a stateless RESTful FastAPI backend. PostgreSQL is used for data persistence, while Cloudinary stores student selfie verification images.

```mermaid
graph TD
    User([User: Student / Admin]) -->|HTTPS| Frontend[Next.js Frontend]
    Frontend -->|REST API + JWT| Backend[FastAPI Backend]
    Backend -->|SQL| Database[(PostgreSQL Database)]
    Backend -->|Uploads / Fetch| Cloudinary[Cloudinary Storage]
    Backend -->|Validate API Token| GoogleOAuth[Google OAuth API]
```

### Module Dependency Map
```mermaid
graph TD
    Main[app/main.py] --> Routers[app/api/*]
    Routers --> Services[app/services/*]
    Services --> DB[app/db/*]
    Services --> Models[app/models/*]
    Services --> Utils[app/utils/*]
```

---

## 2. Database Schema (Entity Relationship Diagram)

The database schema manages users, classes, daily sessions, active QR codes, geo-fencing location validation, camera verification metadata, and audit logging.

```mermaid
erDiagram
    USER {
        int id PK
        string email UK
        string name
        string role "STUDENT / ADMIN"
        datetime created_at
    }
    SESSION {
        int id PK
        int created_by FK "USER(id)"
        string class_name
        string room_name
        float latitude
        float longitude
        float radius_meters
        string status "ACTIVE / INACTIVE"
        datetime created_at
    }
    QR_CODE {
        int id PK
        int session_id FK "SESSION(id)"
        string qr_code_hash UK
        datetime expires_at
        datetime created_at
    }
    ATTENDANCE {
        int id PK
        int student_id FK "USER(id)"
        int session_id FK "SESSION(id)"
        datetime verified_at
        string status "VERIFIED / FLAG"
        float location_distance
        float risk_score
        string selfie_url
    }
    VERIFICATION_METADATA {
        int id PK
        int attendance_id FK "ATTENDANCE(id)"
        boolean blink_detected
        boolean smile_detected
        float face_match_confidence
        datetime captured_at
    }
    AUDIT_LOG {
        int id PK
        int user_id FK "USER(id)"
        string action
        string target_table
        string details
        string ip_address
        datetime created_at
    }

    USER ||--o{ SESSION : "creates"
    SESSION ||--|| QR_CODE : "has current"
    SESSION ||--o{ ATTENDANCE : "tracks"
    USER ||--o{ ATTENDANCE : "submits"
    ATTENDANCE ||--|| VERIFICATION_METADATA : "verifies with"
    USER ||--o{ AUDIT_LOG : "triggers"
```

---

## 3. Data Flow Descriptions

### A. Authentication Flow
1. User logs in via Google Single Sign-On on the Next.js Frontend.
2. Next.js receives a Google ID Token and sends it to `POST /auth/google`.
3. Backend validates the token against Google APIs and checks the domain.
4. User record is created (with Admin role if email matches `ADMIN_EMAIL`).
5. Backend issues a secure JSON Web Token (JWT) returnable to the frontend.

### B. Attendance Submission & Verification Flow
1. **QR Scanning**: Student scans the dynamic QR code containing a secure cryptographic hash.
2. **Location Check**: Frontend sends current GPS coordinates to `POST /verification/location` which checks if coordinates are within the session radius.
3. **Face Liveness / Camera Check**: Student captures a selfie. Frontend detects blink/smile features to verify liveness.
4. **Selfie Upload**: Image is uploaded securely to Cloudinary.
5. **Marking Attendance**: Frontend posts selfie metadata, session ID, and verification tokens to `POST /attendance/submit`.
6. **Risk Engine**: Backend assesses GPS distance, selfie metadata, and session status to assign a Risk Score (Low/Medium/High) and writes to audit logs.
