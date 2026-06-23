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

  // Attendance Submission APIs
  async submitAttendance(sessionId: number): Promise<AttendanceSubmitResponse> {
    return request<AttendanceSubmitResponse>("/attendance/submit", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  },

  async getAttendanceRecord(id: number): Promise<AttendanceRecordResponse> {
    return request<AttendanceRecordResponse>(`/attendance/${id}`);
  },

  async getSessionAttendance(sessionId: number): Promise<SessionAttendanceSummary> {
    return request<SessionAttendanceSummary>(`/attendance/session/${sessionId}`);
  },

  async getStudentAttendance(studentId: number): Promise<AttendanceRecordResponse[]> {
    return request<AttendanceRecordResponse[]>(`/attendance/student/${studentId}`);
  },

  // Risk & Review APIs
  async evaluateRisk(attendanceRecordId: number): Promise<RiskAssessmentWithFlags> {
    return request<RiskAssessmentWithFlags>("/risk/evaluate", {
      method: "POST",
      body: JSON.stringify({ attendance_record_id: attendanceRecordId }),
    });
  },

  async getRiskOverview(): Promise<RiskOverviewStats> {
    return request<RiskOverviewStats>("/risk/overview");
  },

  async getAllFlags(): Promise<AttendanceFlag[]> {
    return request<AttendanceFlag[]>("/risk/flags");
  },

  async getHighRiskAssessments(): Promise<RiskAssessmentWithFlags[]> {
    return request<RiskAssessmentWithFlags[]>("/risk/high-risk");
  },

  async getPendingReviews(): Promise<RiskAssessmentWithFlags[]> {
    return request<RiskAssessmentWithFlags[]>("/risk/review");
  },

  async getRiskByAttendanceId(attendanceId: number): Promise<RiskAssessmentWithFlags> {
    return request<RiskAssessmentWithFlags>(`/risk/${attendanceId}`);
  },

  async reviewRiskAssessment(id: number, status: "PRESENT" | "REJECTED", notes?: string): Promise<RiskAssessmentWithFlags> {
    return request<RiskAssessmentWithFlags>(`/risk/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    });
  },

  // Admin APIs
  async getAdminStats(): Promise<DashboardStatsResponse> {
    return request<DashboardStatsResponse>("/admin/stats");
  },

  async getAllAttendanceRecords(): Promise<AdminAttendanceRecordListItem[]> {
    return request<AdminAttendanceRecordListItem[]>("/admin/attendance");
  },

  async getStudentsHistory(): Promise<StudentHistoryResponse[]> {
    return request<StudentHistoryResponse[]>("/admin/students");
  },

  async getStudentDetail(id: number): Promise<StudentDetailResponse> {
    return request<StudentDetailResponse>(`/admin/students/${id}`);
  },

  async addAttendanceManually(studentId: number, sessionId: number, status: string, notes?: string): Promise<any> {
    return request<any>("/admin/attendance/add", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId, session_id: sessionId, status, notes }),
    });
  },

  async overrideAttendanceRecord(id: number, status: string, notes?: string, isTechnicalIssue?: boolean): Promise<any> {
    return request<any>(`/admin/attendance/${id}/override`, {
      method: "POST",
      body: JSON.stringify({ status, notes, is_technical_issue: isTechnicalIssue }),
    });
  },

  async removeAttendanceRecord(id: number): Promise<any> {
    return request<any>(`/admin/attendance/${id}`, {
      method: "DELETE",
    });
  },

  // Reporting APIs
  async getEodReport(date?: string): Promise<EODReportResponse> {
    return request<EODReportResponse>(`/reports/eod${date ? `?date=${date}` : ""}`);
  },

  async getStudentReport(id: number): Promise<StudentReportResponse> {
    return request<StudentReportResponse>(`/reports/student/${id}`);
  },

  async getSessionReport(id: number): Promise<SessionReportResponse> {
    return request<SessionReportResponse>(`/reports/session/${id}`);
  },

  async getSummaryMetrics(): Promise<AttendanceSummaryResponse> {
    return request<AttendanceSummaryResponse>("/reports/summary");
  },

  async downloadReport(format: "csv" | "excel" | "pdf", date?: string): Promise<Blob> {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const url = `${API_BASE_URL}/reports/export/${format}${date ? `?date=${date}` : ""}`;
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to export ${format} report`);
    }
    return response.blob();
  },

  async getAuditLogs(params?: {
    action_type?: string;
    actor_role?: string;
    entity_type?: string;
    actor_id?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<AuditLogPaginatedResponse> {
    const query = new URLSearchParams();
    if (params?.action_type) query.append("action_type", params.action_type);
    if (params?.actor_role) query.append("actor_role", params.actor_role);
    if (params?.entity_type) query.append("entity_type", params.entity_type);
    if (params?.actor_id) query.append("actor_id", params.actor_id.toString());
    if (params?.start_date) query.append("start_date", params.start_date);
    if (params?.end_date) query.append("end_date", params.end_date);
    if (params?.search) query.append("search", params.search);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.size) query.append("size", params.size.toString());
    const queryString = query.toString();
    return request<AuditLogPaginatedResponse>(`/audit${queryString ? "?" + queryString : ""}`);
  },

  async getAuditLog(id: number): Promise<AuditLog> {
    return request<AuditLog>(`/audit/${id}`);
  },

  async getAuditLogsByUser(id: number): Promise<AuditLog[]> {
    return request<AuditLog[]>(`/audit/user/${id}`);
  },

  async getAuditLogsByEntity(entityId: number, entityType?: string): Promise<AuditLog[]> {
    return request<AuditLog[]>(`/audit/entity/${entityId}${entityType ? `?entity_type=${entityType}` : ""}`);
  },

  async downloadAuditReport(format: "csv" | "excel" | "pdf", params?: {
    action_type?: string;
    actor_role?: string;
    entity_type?: string;
    actor_id?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<Blob> {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const query = new URLSearchParams();
    query.append("format", format);
    if (params?.action_type) query.append("action_type", params.action_type);
    if (params?.actor_role) query.append("actor_role", params.actor_role);
    if (params?.entity_type) query.append("entity_type", params.entity_type);
    if (params?.actor_id) query.append("actor_id", params.actor_id.toString());
    if (params?.start_date) query.append("start_date", params.start_date);
    if (params?.end_date) query.append("end_date", params.end_date);
    if (params?.search) query.append("search", params.search);
    
    const url = `${API_BASE_URL}/audit/export?${query.toString()}`;
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to export audit logs in ${format} format`);
    }
    return response.blob();
  },
};

export interface AuditLog {
  id: number;
  actor_id: number | null;
  actor_name: string | null;
  actor_role: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: number | null;
  description: string;
  metadata_json: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogPaginatedResponse {
  items: AuditLog[];
  total: number;
  page: number;
  size: number;
}


export interface EODReportStudentItem {
  s_no: number;
  student_name: string;
  registration_number: string;
  slot_10_11: string;
  slot_11_12: string;
  slot_12_13: string;
  slot_14_15: string;
  slot_15_16: string;
  attendance_percentage: string;
}

export interface EODReportResponse {
  date: string;
  records: EODReportStudentItem[];
}

export interface SessionReportResponse {
  session_id: number;
  session_title: string;
  subject: string;
  class_name: string;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface StudentReportResponse {
  student_id: number;
  student_name: string;
  registration_number: string | null;
  email: string;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface AttendanceSummaryResponse {
  highest_attendance_pct: number;
  highest_attendance_student: string | null;
  lowest_attendance_pct: number;
  lowest_attendance_student: string | null;
  average_attendance_pct: number;
  total_present: number;
  total_absent: number;
}

export interface TodaySessionOverview {
  id: number;
  title: string;
  subject: string;
  class_name: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface AdminAttendanceRecordListItem {
  id: number;
  student_id: number;
  student_name: string | null;
  student_reg_number: string | null;
  session_id: number;
  session_title: string;
  status: "PRESENT" | "FLAGGED" | "REJECTED";
  submitted_at: string;
  risk_score: number | null;
  risk_level: "SAFE" | "REVIEW" | "HIGH_RISK" | null;
}

export interface DashboardStatsResponse {
  total_students: number;
  present_today: number;
  absent_today: number;
  attendance_percentage_today: number;
  active_session_status: string | null;
  pending_risk_reviews: number;
  total_attendance_records: number;
  today_sessions: TodaySessionOverview[];
}

export interface StudentHistoryResponse {
  id: number;
  name: string | null;
  email: string;
  registration_number: string | null;
  attendance_percentage: number;
  present_count: number;
  absent_count: number;
  last_attendance: string | null;
}

export interface StudentAttendanceHistoryItem {
  id: number | null;
  session_id: number;
  session_title: string;
  session_subject: string;
  submitted_at: string | null;
  status: "PRESENT" | "FLAGGED" | "REJECTED" | "ABSENT";
  risk_score: number | null;
  risk_level: string | null;
  notes: string | null;
}

export interface StudentDetailResponse {
  id: number;
  name: string | null;
  email: string;
  registration_number: string | null;
  attendance_percentage: number;
  present_sessions: number;
  absent_sessions: number;
  total_sessions: number;
  history: StudentAttendanceHistoryItem[];
}

export interface AttendanceFlag {
  id: number;
  attendance_record_id: number;
  flag_type: string;
  flag_reason: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  created_at: string;
}

export interface RiskAssessment {
  id: number;
  attendance_record_id: number;
  risk_score: number;
  risk_level: "SAFE" | "REVIEW" | "HIGH_RISK";
  reviewed: boolean;
  reviewed_by: number | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface RiskAssessmentWithFlags extends RiskAssessment {
  flags: AttendanceFlag[];
  student_name: string | null;
  student_reg_number: string | null;
  session_title: string | null;
}

export interface RiskOverviewStats {
  total_safe: number;
  total_review: number;
  total_high_risk: number;
  pending_reviews: number;
}

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

export interface AttendanceRecordResponse {
  id: number;
  student_id: number;
  session_id: number;
  location_validation_id: number | null;
  verification_session_id: number | null;
  evidence_id: number | null;
  status: "PRESENT" | "FLAGGED" | "REJECTED";
  submitted_at: string;
  created_at: string;
}

export interface AttendanceSubmitResponse {
  attendance_marked: boolean;
  status: "PRESENT" | "FLAGGED" | "REJECTED";
  record_id: number;
  session_id: number;
  session_title: string;
  session_subject: string;
  session_class: string;
  submitted_at: string;
}

export interface SessionAttendanceSummary {
  session_id: number;
  total: number;
  present: number;
  flagged: number;
  rejected: number;
  records: AttendanceRecordResponse[];
}
