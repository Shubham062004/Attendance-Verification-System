# REST API Endpoint Documentation

All backend endpoints are prefixed with `/api` unless specified otherwise. In production, OpenAPI docs are disabled, so this document serves as the official API contract.

---

## 1. Authentication Endpoints

### Google Login / User Registration
* **Endpoint**: `POST /auth/google`
* **Description**: Verifies Google ID tokens and logs in/registers users.
* **Request Body**:
  ```json
  {
    "id_token": "string"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "access_token": "string",
    "token_type": "bearer",
    "role": "STUDENT / ADMIN"
  }
  ```

---

## 2. Daily Session Endpoints

### Create Session (Admin Only)
* **Endpoint**: `POST /sessions`
* **Request Body**:
  ```json
  {
    "class_name": "string",
    "room_name": "string",
    "latitude": 0.0,
    "longitude": 0.0,
    "radius_meters": 100.0
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "id": 1,
    "class_name": "string",
    "room_name": "string",
    "latitude": 0.0,
    "longitude": 0.0,
    "radius_meters": 100.0,
    "status": "ACTIVE",
    "created_at": "2026-06-23T10:00:00Z"
  }
  ```

### List Sessions (Admin Only)
* **Endpoint**: `GET /sessions`
* **Response (200 OK)**: A JSON array of active and archived daily sessions.

---

## 3. QR Generation Endpoints

### Get Active QR Code (Admin Only)
* **Endpoint**: `GET /qr/session/{session_id}`
* **Response (200 OK)**:
  ```json
  {
    "qr_hash": "a4fbc87e...",
    "expires_at": "2026-06-23T10:05:00Z"
  }
  ```

---

## 4. Verification & Submission Endpoints

### Verify Geofencing Location
* **Endpoint**: `POST /verification/location`
* **Request Body**:
  ```json
  {
    "session_id": 1,
    "latitude": 0.0,
    "longitude": 0.0
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "in_range": true,
    "distance_meters": 12.5
  }
  ```

### Submit Selfie Evidence
* **Endpoint**: `POST /evidence/upload`
* **Request Body**: Multi-part form data containing the `file` (image).
* **Response (200 OK)**:
  ```json
  {
    "selfie_url": "https://res.cloudinary.com/..."
  }
  ```

### Submit Attendance Verification
* **Endpoint**: `POST /attendance/submit`
* **Request Body**:
  ```json
  {
    "session_id": 1,
    "latitude": 0.0,
    "longitude": 0.0,
    "blink_detected": true,
    "smile_detected": true,
    "selfie_url": "https://res.cloudinary.com/...",
    "qr_hash": "a4fbc87e..."
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Attendance marked successfully.",
    "risk_score": 0.05,
    "risk_level": "LOW"
  }
  ```

---

## 5. Reporting & History Endpoints

### Export Attendance Report (Admin Only)
* **Endpoint**: `GET /reports/export`
* **Query Params**: `format` (excel/pdf), `session_id` (optional).
* **Response**: Binary stream of the Excel (.xlsx) or PDF (.pdf) file.

### Get Audit Logs (Admin Only)
* **Endpoint**: `GET /audit/logs`
* **Response (200 OK)**: List of activity logs recorded across the platform.

---

## 6. Weather & Hydration Endpoint

### Get Location Weather & Hydration Advice
* **Endpoint**: `GET /weather/advice`
* **Query Params**: `lat` (float), `lon` (float).
* **Response (200 OK)**:
  ```json
  {
    "temperature_c": 32.5,
    "condition": "Sunny",
    "hydration_reminder": "Drink at least 500ml of water right now. High temperature detected.",
    "motivational_message": "Stay sharp, stay hydrated, keep up your streak!",
    "gif_url": "/assets/drinking_water.gif"
  }
  ```
