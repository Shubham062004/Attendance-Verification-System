"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ProtectedRoute } from "../../../../components/ProtectedRoute";
import {
  apiService,
  RiskAssessmentWithFlags,
  AttendanceRecordResponse,
  LocationValidationResponse,
  VerificationSessionResponse,
  AttendanceEvidenceResponse,
} from "../../../../services/api";
import {
  ArrowLeft,
  ShieldAlert,
  MapPin,
  Camera,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  MessageSquare,
  Lock,
  ExternalLink,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function AdminRiskDetailContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const attendanceId = parseInt(resolvedParams.id, 10);

  const [assessment, setAssessment] = useState<RiskAssessmentWithFlags | null>(null);
  const [record, setRecord] = useState<AttendanceRecordResponse | null>(null);
  const [locationVal, setLocationVal] = useState<LocationValidationResponse | null>(null);
  const [verificationSession, setVerificationSession] = useState<VerificationSessionResponse | null>(null);
  const [evidence, setEvidence] = useState<AttendanceEvidenceResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review states
  const [notes, setNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchAllDetails = async () => {
    try {
      setLoading(true);
      // Fetch assessment and record
      const ass = await apiService.getRiskByAttendanceId(attendanceId);
      setAssessment(ass);

      const rec = await apiService.getAttendanceRecord(attendanceId);
      setRecord(rec);

      // Fetch location validations, verification sessions, and evidence details if present
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Helper helper calls using native fetch or client methods
      if (rec.location_validation_id) {
        const res = await fetch(`http://localhost:8000/location/validation/${rec.location_validation_id}`, { headers });
        if (res.ok) setLocationVal(await res.json());
      }
      if (rec.verification_session_id) {
        const res = await fetch(`http://localhost:8000/verification/session/${rec.verification_session_id}`, { headers });
        if (res.ok) setVerificationSession(await res.json());
      }
      if (rec.evidence_id) {
        const res = await fetch(`http://localhost:8000/evidence/${rec.evidence_id}`, { headers });
        if (res.ok) setEvidence(await res.json());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDetails();
  }, [attendanceId]);

  const handleReview = async (choice: "PRESENT" | "REJECTED") => {
    if (!assessment) return;
    try {
      setSubmittingReview(true);
      await apiService.reviewRiskAssessment(assessment.id, choice, notes);
      await fetchAllDetails();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Review submission failed");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
      </div>
    );
  }

  if (error || !assessment || !record) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
        <ShieldAlert className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-slate-400">{error || "Record detail not found"}</p>
        <Link href="/admin/risk" className="text-xs text-rose-400 hover:underline">
          ← Back to Risk Overview
        </Link>
      </div>
    );
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "SAFE":
        return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-400">SAFE</span>;
      case "REVIEW":
        return <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-400">NEEDS REVIEW</span>;
      case "HIGH_RISK":
        return <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-0.5 text-xs font-bold text-rose-400 animate-pulse">HIGH RISK</span>;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-rose-600/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-1/4 bottom-0 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <Link
          href="/admin/risk"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Risk Overview
        </Link>

        {/* Title banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-rose-500/20 bg-rose-600/10 p-2.5">
              <ShieldAlert className="h-6 w-6 text-rose-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Review Record #{attendanceId}</h1>
              <p className="text-xs text-slate-500">Student: {assessment.student_name || "Unknown"} ({assessment.student_reg_number})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getRiskBadge(assessment.risk_level)}
            <span className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-1 text-sm font-extrabold text-white">
              Score: {assessment.risk_score}
            </span>
          </div>
        </div>

        {/* Alert flags section if any exist */}
        {assessment.flags && assessment.flags.length > 0 && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Generated Risk Flags ({assessment.flags.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assessment.flags.map((flag) => (
                <div key={flag.id} className="glass-panel p-3.5 rounded-xl border border-slate-800 bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">{flag.flag_type}</span>
                    <span className={`text-[9px] font-bold rounded px-1.5 py-0.2 ${flag.severity === "HIGH" ? "bg-rose-500/10 text-rose-400" : flag.severity === "MEDIUM" ? "bg-amber-500/10 text-amber-400" : "bg-slate-900 text-slate-500"}`}>
                      {flag.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{flag.flag_reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: Verification detail columns */}
          <div className="md:col-span-2 space-y-6">
            {/* Core Verification parameters */}
            <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-3">Biometrics & Coordinates</h3>
              
              {/* Location details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-indigo-400" />
                  Geographical Verification
                </h4>
                {locationVal ? (
                  <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-900 bg-slate-900/10 p-4 text-xs">
                    <div>
                      <p className="text-slate-500">Coordinates</p>
                      <p className="font-semibold text-slate-200">{locationVal.latitude?.toFixed(5)}, {locationVal.longitude?.toFixed(5)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Allowed Radius</p>
                      <p className="font-semibold text-slate-200">{locationVal.is_within_radius ? "Within boundary" : "Outside boundary"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Distance from classroom center</p>
                      <p className="font-semibold text-slate-200">{locationVal.distance_from_center ? `${locationVal.distance_from_center.toFixed(1)} meters` : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">GPS Accuracy</p>
                      <p className="font-semibold text-slate-200">{locationVal.accuracy ? `${locationVal.accuracy.toFixed(1)}m` : "Unknown"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-rose-400 border border-rose-500/10 bg-rose-500/5 p-3 rounded-xl">Location verification metadata is missing.</p>
                )}
              </div>

              {/* Liveness details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-indigo-400" />
                  Biometric Liveness Verification
                </h4>
                {verificationSession ? (
                  <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-900 bg-slate-900/10 p-4 text-xs">
                    <div>
                      <p className="text-slate-500">Camera Permissions</p>
                      <p className={`font-semibold ${verificationSession.camera_granted ? "text-emerald-400" : "text-rose-400"}`}>
                        {verificationSession.camera_granted ? "Granted" : "Denied"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Face Detected</p>
                      <p className={`font-semibold ${verificationSession.face_detected ? "text-emerald-400" : "text-rose-400"}`}>
                        {verificationSession.face_detected ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Blink Confirmed</p>
                      <p className={`font-semibold ${verificationSession.blink_verified ? "text-emerald-400" : "text-rose-400"}`}>
                        {verificationSession.blink_verified ? "Verified" : "Bypassed / Not Checked"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Smile Confirmed</p>
                      <p className={`font-semibold ${verificationSession.smile_verified ? "text-emerald-400" : "text-rose-400"}`}>
                        {verificationSession.smile_verified ? "Verified" : "Bypassed / Not Checked"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Attempts</p>
                      <p className="font-semibold text-slate-200">{verificationSession.attempt_count} attempts</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Biometric Status</p>
                      <p className={`font-semibold uppercase ${verificationSession.liveness_passed ? "text-emerald-400" : "text-rose-400"}`}>
                        {verificationSession.status}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-rose-400 border border-rose-500/10 bg-rose-500/5 p-3 rounded-xl">Liveness verification metadata is missing.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Selfie Image & Attendance Status */}
          <div className="space-y-6">
            {/* Selfie Photo */}
            <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Selfie Evidence Upload</h3>
              {evidence ? (
                <div className="relative group overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                  <img
                    src={evidence.image_url}
                    alt="Selfie Biometric Evidence"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <a
                    href={evidence.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-slate-950/80 px-2 py-1 text-[10px] font-bold text-white hover:bg-slate-950 border border-slate-800"
                  >
                    <span>Full URL</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center border border-slate-800 aspect-[4/3] rounded-xl text-center p-4">
                  <Camera className="h-8 w-8 text-slate-700" />
                  <p className="text-xs text-slate-500 mt-2">Selfie was not uploaded</p>
                </div>
              )}
            </div>

            {/* Attendance Status */}
            <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Record Status</h3>
              <div className="flex items-center gap-2">
                {record.status === "PRESENT" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                ) : record.status === "REJECTED" ? (
                  <XCircle className="h-5 w-5 text-rose-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                )}
                <span className="text-sm font-bold text-white uppercase">{record.status}</span>
              </div>
              <p className="text-[10px] text-slate-500">Submitted at: {new Date(record.submitted_at).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Audit / Review Workflow */}
        <section className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-slate-900 pb-3">
            <Layers className="h-4 w-4 text-indigo-400" />
            Admin Review Panel
          </h3>

          {assessment.reviewed ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  Assessment Reviewed & Closed
                </span>
                <span>{assessment.reviewed_at ? new Date(assessment.reviewed_at).toLocaleString() : ""}</span>
              </div>
              <p className="text-slate-300 font-medium">Notes added during review:</p>
              <div className="rounded border border-slate-900 bg-slate-950 p-3 text-slate-400 font-mono text-[11px] leading-relaxed">
                {assessment.notes || "No notes were provided."}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Review Notes (Required)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter detailed reason or notes regarding this decision..."
                  className="w-full min-h-[90px] p-3 text-xs rounded-xl border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => handleReview("REJECTED")}
                  disabled={submittingReview || !notes.trim()}
                  className="px-4 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reject Attendance
                </button>
                <button
                  onClick={() => handleReview("PRESENT")}
                  disabled={submittingReview || !notes.trim()}
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Approve Attendance
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminRiskDetailPage({ params }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <AdminRiskDetailContent params={params} />
    </ProtectedRoute>
  );
}
