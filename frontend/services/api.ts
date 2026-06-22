export interface HealthResponse {
  status: string;
  service: string;
  database?: string;
  timestamp?: string;
}

export interface User {
  id: number;
  google_id: string | null;
  email: string;
  name: string | null;
  registration_number: string | null;
  role: "Student" | "Admin" | "Developer";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  // Try to get token from localStorage on the client side
  let authHeaders: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      authHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = `API request failed: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson?.detail) {
        errorMsg =
          typeof errorJson.detail === "string"
            ? errorJson.detail
            : JSON.stringify(errorJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const apiService = {
  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  async googleLogin(idToken: string): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });
  },

  async developerLogin(): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/developer-login", {
      method: "POST",
    });
  },

  async logout(): Promise<{ status: string; message: string }> {
    return request<{ status: string; message: string }>("/auth/logout", {
      method: "POST",
    });
  },

  async getMe(): Promise<User> {
    return request<User>("/auth/me");
  },

  async registerStudent(registrationNumber: string): Promise<User> {
    return request<User>("/auth/register-student", {
      method: "POST",
      body: JSON.stringify({ registration_number: registrationNumber }),
    });
  },

  async getProfile(): Promise<User> {
    return request<User>("/users/profile");
  },

  async updateProfile(name: string): Promise<User> {
    return request<User>("/users/profile", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },

  // Attendance Session API calls
  async createSession(session: {
    title: string;
    subject: string;
    class_name: string;
    description?: string;
    start_time?: string;
    end_time?: string;
  }): Promise<AttendanceSession> {
    return request<AttendanceSession>("/sessions", {
      method: "POST",
      body: JSON.stringify(session),
    });
  },

  async listSessions(params?: {
    q?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<AttendanceSession[]> {
    const query = new URLSearchParams();
    if (params?.q) query.append("q", params.q);
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.size) query.append("size", params.size.toString());
    const queryString = query.toString();
    return request<AttendanceSession[]>(`/sessions${queryString ? "?" + queryString : ""}`);
  },

  async getActiveSession(): Promise<AttendanceSession | null> {
    return request<AttendanceSession | null>("/sessions/active");
  },

  async getSessionStats(): Promise<SessionStats> {
    return request<SessionStats>("/sessions/stats");
  },

  async getSession(id: number): Promise<AttendanceSession> {
    return request<AttendanceSession>(`/sessions/${id}`);
  },

  async updateSession(
    id: number,
    session: {
      title?: string;
      subject?: string;
      class_name?: string;
      description?: string;
      start_time?: string;
      end_time?: string;
    },
  ): Promise<AttendanceSession> {
    return request<AttendanceSession>(`/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(session),
    });
  },

  async deleteSession(id: number): Promise<{ status: string; message: string }> {
    return request<{ status: string; message: string }>(`/sessions/${id}`, {
      method: "DELETE",
    });
  },

  async startSession(id: number): Promise<AttendanceSession> {
    return request<AttendanceSession>(`/sessions/${id}/start`, {
      method: "POST",
    });
  },

  async endSession(id: number): Promise<AttendanceSession> {
    return request<AttendanceSession>(`/sessions/${id}/end`, {
      method: "POST",
    });
  },

  async reopenSession(id: number): Promise<AttendanceSession> {
    return request<AttendanceSession>(`/sessions/${id}/reopen`, {
      method: "POST",
    });
  },

  // QR Generation & Session Access APIs
  async generateQr(sessionId: number): Promise<QRTokenResponse> {
    return request<QRTokenResponse>(`/sessions/${sessionId}/generate-qr`, {
      method: "POST",
    });
  },

  async getCurrentQr(sessionId: number): Promise<QRTokenResponse> {
    return request<QRTokenResponse>(`/sessions/${sessionId}/current-qr`);
  },

  async getQrHistory(sessionId: number): Promise<QRTokenResponse[]> {
    return request<QRTokenResponse[]>(`/sessions/${sessionId}/qr-history`);
  },

  async expireQr(sessionId: number): Promise<{ status: string; message: string }> {
    return request<{ status: string; message: string }>(`/sessions/${sessionId}/expire-qr`, {
      method: "POST",
    });
  },

  async validateQr(token: string): Promise<QRValidateResponse> {
    return request<QRValidateResponse>("/qr/validate", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  async configureClassroomLocation(
    sessionId: number,
    payload: { latitude: number; longitude: number; allowed_radius: number },
  ): Promise<ClassroomLocationResponse> {
    return request<ClassroomLocationResponse>(`/sessions/${sessionId}/location`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getClassroomLocation(sessionId: number): Promise<ClassroomLocationResponse> {
    return request<ClassroomLocationResponse>(`/sessions/${sessionId}/location`);
  },

  async validateLocation(payload: {
    session_id: number;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
  }): Promise<LocationValidationResponse> {
    return request<LocationValidationResponse>("/location/validate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getLocationValidationsBySession(sessionId: number): Promise<LocationValidationResponse[]> {
    return request<LocationValidationResponse[]>(`/location/session/${sessionId}`);
  },

  async getLocationValidationsByStudent(studentId: number): Promise<LocationValidationResponse[]> {
    return request<LocationValidationResponse[]>(`/location/student/${studentId}`);
  },

  async getLocationValidationById(id: number): Promise<LocationValidationResponse> {
    return request<LocationValidationResponse>(`/location/validation/${id}`);
  },

  // Camera Verification APIs
  async startVerification(sessionId: number): Promise<VerificationSessionResponse> {
    return request<VerificationSessionResponse>("/verification/start", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  },

  async completeVerification(payload: {
    verification_id: number;
    camera_granted: boolean;
    face_detected: boolean;
    blink_verified: boolean;
    smile_verified: boolean;
    failure_reason?: string | null;
  }): Promise<VerificationSessionResponse> {
    return request<VerificationSessionResponse>("/verification/complete", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getVerification(id: number): Promise<VerificationSessionResponse> {
    return request<VerificationSessionResponse>(`/verification/${id}`);
  },

  async getVerificationsBySession(sessionId: number): Promise<VerificationSessionResponse[]> {
    return request<VerificationSessionResponse[]>(`/verification/session/${sessionId}`);
  },

  // Evidence / Selfie Storage APIs
  async getUploadSignature(sessionId: number): Promise<UploadSignatureResponse> {
    return request<UploadSignatureResponse>(`/evidence/upload-signature?session_id=${sessionId}`);
  },

  async storeEvidence(payload: {
    session_id: number;
    image_url: string;
    image_public_id: string;
    image_size?: number | null;
    image_width?: number | null;
    image_height?: number | null;
  }): Promise<AttendanceEvidenceResponse> {
    return request<AttendanceEvidenceResponse>("/evidence", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getEvidence(id: number): Promise<AttendanceEvidenceResponse> {
    return request<AttendanceEvidenceResponse>(`/evidence/${id}`);
  },

  async getEvidenceBySession(sessionId: number): Promise<AttendanceEvidenceResponse[]> {
    return request<AttendanceEvidenceResponse[]>(`/evidence/session/${sessionId}`);
  },

  async deleteEvidence(id: number): Promise<void> {
    await request<void>(`/evidence/${id}`, { method: "DELETE" });
  },
};

export interface AttendanceSession {
  id: number;
  title: string;
  subject: string;
  class_name: string;
  description: string | null;
  session_code: string | null;
  start_time: string | null;
  end_time: string | null;
  status: "DRAFT" | "ACTIVE" | "ENDED" | "REOPENED";
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface SessionStats {
  total: number;
  active: number;
  ended: number;
  draft: number;
}

export interface QRTokenResponse {
  token: string;
  expires_at: string;
  is_active: boolean;
}

export interface QRValidateResponse {
  valid: boolean;
  session_id: number | null;
  session_title: string | null;
  subject: string | null;
  class_name: string | null;
  teacher_name: string | null;
}

export interface ClassroomLocationResponse {
  latitude: number;
  longitude: number;
  allowed_radius: number;
  id: number;
  session_id: number;
  created_at: string;
}

export interface LocationValidationResponse {
  id: number;
  student_id: number;
  session_id: number;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  distance_from_center: number | null;
  is_within_radius: boolean;
  risk_score: number;
  created_at: string;
}

export interface VerificationSessionResponse {
  id: number;
  student_id: number;
  session_id: number;
  camera_granted: boolean;
  face_detected: boolean;
  blink_verified: boolean;
  smile_verified: boolean;
  liveness_passed: boolean;
  status: "PENDING" | "IN_PROGRESS" | "PASSED" | "FAILED" | "SKIPPED";
  failure_reason: string | null;
  attempt_count: number;
  started_at: string;
  completed_at: string | null;
}

export interface UploadSignatureResponse {
  signature: string;
  api_key: string;
  cloud_name: string;
  timestamp: number;
  folder: string;
  public_id: string;
  upload_url: string;
}

export interface AttendanceEvidenceResponse {
  id: number;
  student_id: number;
  session_id: number;
  image_url: string;
  image_public_id: string;
  image_size: number | null;
  image_width: number | null;
  image_height: number | null;
  uploaded_at: string;
}
