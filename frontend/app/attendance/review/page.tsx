"use client";

import React, { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import {
  apiService,
  AttendanceEvidenceResponse,
  AttendanceRecordResponse,
  AttendanceSubmitResponse,
  LocationValidationResponse,
  VerificationSessionResponse,
} from "../../../services/api";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  MapPin,
  ShieldCheck,
  Camera,
  ClipboardCheck,
  Droplets,
  Thermometer,
  RefreshCw,
  Star,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

interface WeatherData {
  temperature: number;
  feels_like: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Weather fetch (Open-Meteo — no API key required)
// ---------------------------------------------------------------------------
async function fetchWeather(): Promise<WeatherData | null> {
  try {
    // Get user coordinates
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    const { latitude, longitude } = position.coords;
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=apparent_temperature&forecast_days=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const wc = data.current_weather?.weathercode ?? 0;
    const descriptions: Record<number, string> = {
      0: "Clear sky ☀️", 1: "Mainly clear 🌤", 2: "Partly cloudy ⛅", 3: "Overcast ☁️",
      45: "Foggy 🌫️", 48: "Depositing rime fog 🌫️",
      51: "Light drizzle 🌦", 53: "Moderate drizzle 🌦", 55: "Dense drizzle 🌧",
      61: "Slight rain 🌧", 63: "Moderate rain 🌧", 65: "Heavy rain 🌧",
      71: "Slight snow 🌨", 73: "Moderate snow 🌨", 75: "Heavy snow ❄️",
      80: "Slight showers 🌦", 81: "Moderate showers 🌧", 82: "Violent showers ⛈",
      95: "Thunderstorm ⛈", 96: "Thunderstorm with hail ⛈", 99: "Thunderstorm with heavy hail ⛈",
    };
    const apparentNow = data.hourly?.apparent_temperature?.[new Date().getHours()] ?? null;
    return {
      temperature: Math.round(data.current_weather?.temperature ?? 0),
      feels_like: apparentNow !== null ? Math.round(apparentNow) : Math.round(data.current_weather?.temperature ?? 0),
      description: descriptions[wc] ?? "Unknown ☁️",
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hydration messages
// ---------------------------------------------------------------------------
const HYDRATION_MSGS = [
  { emoji: "💧", text: "Drink water — staying hydrated boosts focus!" },
  { emoji: "☀️", text: "Stay hydrated in the heat today!" },
  { emoji: "🌡️", text: "High temperature alert — sip water regularly!" },
  { emoji: "🫗", text: "Take a water break before your next class!" },
  { emoji: "🧊", text: "Cold water refreshes the mind — go grab some!" },
];

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    PRESENT: { color: "border-emerald-500/30 bg-emerald-600/10 text-emerald-400", label: "✓ Present" },
    FLAGGED: { color: "border-amber-500/30 bg-amber-600/10 text-amber-400", label: "⚑ Flagged" },
    REJECTED: { color: "border-rose-500/30 bg-rose-600/10 text-rose-400", label: "✗ Rejected" },
  };
  const cfg = map[status] ?? map.PRESENT;
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Prerequisite check card
// ---------------------------------------------------------------------------
function PrereqCard({
  icon,
  label,
  status,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  status: "pass" | "fail" | "unknown";
  detail?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        status === "pass"
          ? "border-emerald-800/40 bg-emerald-950/30"
          : status === "fail"
          ? "border-rose-800/40 bg-rose-950/30"
          : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className={`shrink-0 ${status === "pass" ? "text-emerald-400" : status === "fail" ? "text-rose-400" : "text-slate-500"}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-300">{label}</p>
        {detail && <p className="mt-0.5 truncate text-[10px] text-slate-500">{detail}</p>}
      </div>
      <div className="shrink-0">
        {status === "pass" ? (
          <CheckCircle className="h-4 w-4 text-emerald-400" />
        ) : status === "fail" ? (
          <XCircle className="h-4 w-4 text-rose-400" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function AttendanceReviewContent({ searchParams }: PageProps) {
  const resolvedSearchParams = use(searchParams);
  const sessionIdStr = resolvedSearchParams.session_id;
  const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
  const router = useRouter();

  // Prerequisite state
  const [location, setLocation] = useState<LocationValidationResponse | null>(null);
  const [verification, setVerification] = useState<VerificationSessionResponse | null>(null);
  const [evidence, setEvidence] = useState<AttendanceEvidenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [prereqError, setPrereqError] = useState<string | null>(null);

  // Submission state
  type Phase = "review" | "submitting" | "success" | "duplicate" | "error";
  const [phase, setPhase] = useState<Phase>("review");
  const [submitResult, setSubmitResult] = useState<AttendanceSubmitResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Weather + hydration
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hydrationMsg] = useState(() => HYDRATION_MSGS[Math.floor(Math.random() * HYDRATION_MSGS.length)]);

  // ---------------------------------------------------------------------------
  // Load prerequisites
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    const loadPrereqs = async () => {
      try {
        // Fetch all prerequisites concurrently
        const [locArr, verArr, evArr] = await Promise.allSettled([
          apiService.getLocationValidationsBySession(sessionId),
          apiService.getVerificationsBySession(sessionId),
          apiService.getEvidenceBySession(sessionId),
        ]);
        const locData = locArr.status === "fulfilled" ? locArr.value : [];
        const verData = verArr.status === "fulfilled" ? verArr.value : [];
        const evData = evArr.status === "fulfilled" ? evArr.value : [];

        // Each is an array — pick the student's latest record
        // (student-scoped: backend already filters to my own session records for non-admin)
        setLocation(Array.isArray(locData) ? locData[0] ?? null : null);
        setVerification(Array.isArray(verData) ? verData[0] ?? null : null);
        setEvidence(Array.isArray(evData) ? evData[0] ?? null : null);
      } catch (err: unknown) {
        setPrereqError(err instanceof Error ? err.message : "Failed to load prerequisites");
      } finally {
        setLoading(false);
      }
    };
    loadPrereqs();
  }, [sessionId]);

  // ---------------------------------------------------------------------------
  // Submit attendance
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    if (!sessionId) return;
    setPhase("submitting");
    try {
      const res = await apiService.submitAttendance(sessionId);
      setSubmitResult(res);
      setPhase("success");
      // Fetch weather in background
      fetchWeather().then(setWeather);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit attendance";
      if (msg.includes("409") || msg.toLowerCase().includes("already marked") || msg.toLowerCase().includes("duplicate")) {
        setPhase("duplicate");
      } else {
        setSubmitError(msg);
        setPhase("error");
      }
    }
  }, [sessionId]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const locationOk = location !== null;
  const verificationOk = verification?.status === "PASSED";
  const evidenceOk = evidence !== null;
  const canSubmit = locationOk && verificationOk && evidenceOk;

  // ---------------------------------------------------------------------------
  // Render — loading
  // ---------------------------------------------------------------------------
  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
          <p className="mt-3 text-sm">No session ID provided.</p>
          <Link href="/attendance" className="mt-4 block text-xs text-indigo-400 hover:underline">
            ← Return to Attendance
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — success
  // ---------------------------------------------------------------------------
  if (phase === "success" && submitResult) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100">
        <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-emerald-600/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-1/4 right-0 h-96 w-96 rounded-full bg-teal-600/5 blur-3xl" />

        <div className="w-full max-w-lg space-y-6">
          {/* Success hero */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-600/10">
                <ClipboardCheck className="h-12 w-12 text-emerald-400" />
              </div>
              <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm shadow-lg shadow-emerald-500/30">
                ✓
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-emerald-400">Attendance Marked!</h1>
              <p className="mt-1 text-xs text-slate-500">
                Your attendance has been successfully recorded.
              </p>
            </div>
          </div>

          {/* Summary card */}
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</span>
              <StatusBadge status={submitResult.status} />
            </div>
            {[
              { label: "Session", value: submitResult.session_title },
              { label: "Subject", value: submitResult.session_subject },
              { label: "Class", value: submitResult.session_class },
              {
                label: "Submitted At",
                value: new Date(submitResult.submitted_at).toLocaleString(),
              },
              { label: "Record ID", value: `#${submitResult.record_id}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-[11px]">
                <span className="text-slate-500">{label}</span>
                <span className="font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>

          {/* Weather + Hydration */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-blue-950/40 to-cyan-950/40 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Droplets className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Hydration Reminder
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-3xl">{hydrationMsg.emoji}</span>
              <p className="text-sm font-medium text-slate-300">{hydrationMsg.text}</p>
            </div>
            {weather && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
                <Thermometer className="h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="text-[11px] font-bold text-white">
                    {weather.temperature}°C — {weather.description}
                  </p>
                  <p className="text-[10px] text-slate-500">Feels like {weather.feels_like}°C</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href="/student/attendance"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 py-3 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
            >
              <Star className="h-4 w-4 text-slate-400" />
              My History
            </Link>
            <Link
              href="/attendance"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-xs font-bold text-white transition hover:bg-emerald-500"
            >
              Done
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — duplicate
  // ---------------------------------------------------------------------------
  if (phase === "duplicate") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md space-y-5 text-center">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full border border-amber-500/30 bg-amber-600/10">
            <ClipboardCheck className="h-10 w-10 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-amber-400">Already Submitted</h1>
          <p className="text-xs text-slate-500">
            Your attendance for this session has already been recorded. Each student may only submit once per session.
          </p>
          <Link
            href="/student/attendance"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-xs font-bold text-white hover:bg-indigo-500"
          >
            View My Attendance History
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — review / submitting / error
  // ---------------------------------------------------------------------------
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100">
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-1/4 right-0 h-96 w-96 rounded-full bg-violet-600/5 blur-3xl" />

      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <header className="flex flex-col items-center space-y-3 text-center">
          <div className="flex items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-600/10 p-3">
            <ClipboardCheck className="h-8 w-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Mark Attendance</h1>
            <p className="mt-1 text-xs text-slate-500">
              Review your verification steps, then mark your attendance.
            </p>
          </div>
        </header>

        {/* Prerequisite checks */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Verification Checklist
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              <PrereqCard
                icon={<MapPin className="h-4 w-4" />}
                label="Location Verified"
                status={locationOk ? "pass" : "fail"}
                detail={
                  location
                    ? `${location.is_within_radius ? "Within radius" : "Outside radius"} · ${
                        location.distance_from_center != null
                          ? `${location.distance_from_center.toFixed(0)}m from classroom`
                          : ""
                      }`
                    : "No location record found"
                }
              />
              <PrereqCard
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Liveness Passed"
                status={verificationOk ? "pass" : "fail"}
                detail={
                  verification
                    ? `Status: ${verification.status} · Attempt #${verification.attempt_count}`
                    : "No liveness verification found"
                }
              />
              <PrereqCard
                icon={<Camera className="h-4 w-4" />}
                label="Selfie Uploaded"
                status={evidenceOk ? "pass" : "fail"}
                detail={
                  evidence
                    ? `${evidence.image_width ?? "?"}×${evidence.image_height ?? "?"}px · ${
                        evidence.image_size ? `${(evidence.image_size / 1024).toFixed(0)} KB` : "?"
                      }`
                    : "No selfie evidence found"
                }
              />
            </>
          )}

          {prereqError && (
            <div className="flex items-center gap-3 rounded-lg border border-rose-800/40 bg-rose-950/30 p-3 text-xs text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {prereqError}
            </div>
          )}
        </div>

        {/* Selfie thumbnail (if evidence loaded) */}
        {evidence && evidence.image_url && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Selfie Evidence
            </h2>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evidence.image_url}
                alt="Selfie evidence"
                className="h-20 w-20 rounded-lg border border-slate-700 object-cover"
              />
              <div className="space-y-1 text-[11px]">
                <p className="font-semibold text-white">Photo on file</p>
                <p className="text-slate-500">
                  {new Date(evidence.uploaded_at).toLocaleString()}
                </p>
                <p className="text-slate-500">
                  {evidence.image_size ? `${(evidence.image_size / 1024).toFixed(0)} KB` : ""}
                  {evidence.image_width ? ` · ${evidence.image_width}×${evidence.image_height}px` : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit error */}
        {phase === "error" && submitError && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-800/40 bg-rose-950/30 p-4 text-xs text-rose-400">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">Submission Failed</p>
              <p className="mt-0.5">{submitError}</p>
              <button
                onClick={() => setPhase("review")}
                className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-300 hover:text-white"
              >
                <RefreshCw className="h-3 w-3" /> Try Again
              </button>
            </div>
          </div>
        )}

        {/* Warning if prerequisites not met */}
        {!loading && !canSubmit && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-800/40 bg-amber-950/30 p-4 text-xs text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">Prerequisites Incomplete</p>
              <p className="mt-0.5">
                Complete all verification steps before submitting attendance.
              </p>
              <div className="mt-2 space-y-1">
                {!locationOk && (
                  <p>
                    ·{" "}
                    <Link href={`/attendance/location?session_id=${sessionId}`} className="underline">
                      Complete Location Verification
                    </Link>
                  </p>
                )}
                {!verificationOk && (
                  <p>
                    ·{" "}
                    <Link href={`/attendance/verification?session_id=${sessionId}`} className="underline">
                      Complete Liveness Verification
                    </Link>
                  </p>
                )}
                {!evidenceOk && (
                  <p>
                    ·{" "}
                    <Link href={`/attendance/selfie?session_id=${sessionId}`} className="underline">
                      Upload Selfie
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mark Attendance button */}
        <button
          id="mark-attendance-btn"
          onClick={handleSubmit}
          disabled={!canSubmit || phase === "submitting" || loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase === "submitting" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Marking Attendance…
            </>
          ) : (
            <>
              <ClipboardCheck className="h-5 w-5" />
              Mark Attendance
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-slate-600">
          This action creates an official attendance record. Each session allows one submission.
        </p>

        <div className="text-center">
          <Link href="/attendance" className="text-xs text-indigo-400 hover:underline">
            ← Return to Attendance Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AttendanceReviewPage({ searchParams }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={["Student"]}>
      <AttendanceReviewContent searchParams={searchParams} />
    </ProtectedRoute>
  );
}
