"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import {
  apiService,
  ClassroomLocationResponse,
  LocationValidationResponse,
} from "../../../services/api";
import MapPreview from "../../../components/MapPreview";
import {
  Loader2,
  MapPin,
  Compass,
  AlertTriangle,
  CheckCircle,
  Navigation,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

function StudentLocationContent({ searchParams }: PageProps) {
  const resolvedSearchParams = use(searchParams);
  const sessionIdStr = resolvedSearchParams.session_id;
  const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
  const router = useRouter();

  const [classroomLoc, setClassroomLoc] = useState<ClassroomLocationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GPS Capture & Verification state
  const [capturing, setCapturing] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<LocationValidationResponse | null>(null);

  // Student mock coordinates overrides (for dev/sandbox testing)
  const [useMock, setUseMock] = useState(false);
  const [mockLat, setMockLat] = useState(31.2536);
  const [mockLng, setMockLng] = useState(75.7033);
  const [mockAcc, setMockAcc] = useState(15);

  const fetchClassroomLoc = async () => {
    if (!sessionId) {
      setError("No session ID specified. Please scan QR code again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const loc = await apiService.getClassroomLocation(sessionId);
      setClassroomLoc(loc);
    } catch (err: any) {
      setError(
        err.message ||
          "Classroom location parameters not configured. Please contact your instructor.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroomLoc();
  }, [sessionId]);

  const triggerGpsCapture = () => {
    if (useMock) {
      submitLocation(mockLat, mockLng, mockAcc);
      return;
    }

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    setCapturing(true);
    setGpsError(null);
    setValidationResult(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        submitLocation(lat, lng, accuracy);
      },
      (err) => {
        setCapturing(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError(
              "Permission denied. Please allow location access in your browser settings to verify your attendance.",
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsError(
              "GPS coordinates unavailable. Ensure your device's location services are turned on.",
            );
            break;
          case err.TIMEOUT:
            setGpsError(
              "Location request timed out. Please try again in an area with better coverage.",
            );
            break;
          default:
            setGpsError("An unknown GPS error occurred.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const submitLocation = async (
    lat: number | null,
    lng: number | null,
    accuracy: number | null,
  ) => {
    if (!sessionId) return;
    setCapturing(true);
    try {
      const res = await apiService.validateLocation({
        session_id: sessionId,
        latitude: lat,
        longitude: lng,
        accuracy: accuracy,
      });
      setValidationResult(res);
    } catch (err: any) {
      setGpsError(err.message || "Failed to submit coordinates.");
    } finally {
      setCapturing(false);
    }
  };

  const handleSkipOrContinue = () => {
    // Navigate to next verification step (e.g. Camera/Face scan, simulated as success screen for now)
    alert("Location verified! Directing to biometric facial check (future branch).");
    router.push("/attendance");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="mt-4 text-xs text-slate-500">Querying classroom locations...</p>
      </div>
    );
  }

  if (error || !sessionId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100">
        <ShieldAlert className="h-12 w-12 text-rose-500" />
        <h3 className="text-md mt-4 font-bold">Location Setup Incomplete</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          {error || "Invalid session payload."}
        </p>
        <Link
          href="/attendance"
          className="mt-6 text-xs font-semibold text-indigo-400 hover:underline"
        >
          Return to Attendance Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <header className="mb-2 flex flex-col items-center justify-center space-y-3 text-center">
          <div className="glow-primary flex items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-600/10 p-3">
            <Compass className="h-8 w-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Classroom Geofence Check
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Verify your physical location matches the scheduled classroom coordinates
            </p>
          </div>
        </header>

        {/* Card */}
        <div className="glass-panel space-y-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 md:p-8">
          {/* Main Error Banner */}
          {gpsError && (
            <div className="animate-fadeIn flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-600/10 p-4 text-xs text-rose-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Validation Result Banners */}
          {validationResult && (
            <div className="space-y-4">
              {validationResult.is_within_radius ? (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-600/10 p-4 text-xs text-emerald-400">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-bold">✓ Location Verified</div>
                    <div className="mt-0.5 text-[10px] text-emerald-500/85">
                      You are within the classroom boundaries.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-600/10 p-4 text-xs text-amber-400">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-bold">⚠ Outside Classroom Radius</div>
                    <div className="mt-0.5 text-[10px] text-amber-500/85">
                      Location mismatch. Distance:{" "}
                      {validationResult.distance_from_center?.toFixed(1)}m. Radius:{" "}
                      {classroomLoc?.allowed_radius}m.
                    </div>
                  </div>
                </div>
              )}

              {validationResult.accuracy && validationResult.accuracy > 50 && (
                <div className="flex items-center gap-3 rounded-lg border border-orange-500/20 bg-orange-600/10 p-4 text-xs text-orange-400">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-bold">⚠ Low GPS Accuracy</div>
                    <div className="mt-0.5 text-[10px] text-orange-500/85">
                      GPS accuracy is poor ({validationResult.accuracy.toFixed(1)}m). Try stepping
                      closer to windows.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Map Preview */}
          {classroomLoc && (
            <MapPreview
              classroomLat={classroomLoc.latitude}
              classroomLng={classroomLoc.longitude}
              radius={classroomLoc.allowed_radius}
              studentLat={validationResult?.latitude}
              studentLng={validationResult?.longitude}
            />
          )}

          {/* Geolocation Details Table */}
          {validationResult && (
            <div className="text-slate-350 space-y-2 rounded-lg border border-slate-900 bg-slate-950/80 p-4 font-mono text-[11px]">
              <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                <span>Classroom Center</span>
                <span className="text-white">
                  {classroomLoc?.latitude.toFixed(5)}, {classroomLoc?.longitude.toFixed(5)}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                <span>Your Coordinates</span>
                <span className="text-white">
                  {validationResult.latitude?.toFixed(5) || "N/A"},{" "}
                  {validationResult.longitude?.toFixed(5) || "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                <span>Distance from Room</span>
                <span className="text-white">
                  {validationResult.distance_from_center != null
                    ? `${validationResult.distance_from_center.toFixed(1)} meters`
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                <span>GPS Accuracy</span>
                <span
                  className={
                    validationResult.accuracy && validationResult.accuracy > 50
                      ? "font-bold text-amber-400"
                      : "text-emerald-400"
                  }
                >
                  {validationResult.accuracy != null
                    ? `±${validationResult.accuracy.toFixed(1)} meters`
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Risk Assessment Score</span>
                <span
                  className={
                    validationResult.risk_score > 0
                      ? "font-bold text-rose-500"
                      : "font-bold text-emerald-400"
                  }
                >
                  {validationResult.risk_score} / 100
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={triggerGpsCapture}
              disabled={capturing}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {capturing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              <span>{validationResult ? "Recapture & Verify Location" : "Verify My Location"}</span>
            </button>

            {validationResult && (
              <button
                onClick={handleSkipOrContinue}
                className="hover:bg-slate-850 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 py-3 text-xs font-bold text-white transition"
              >
                <span>Continue Attendance Verification</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sandbox Mock Coordinates Toggle */}
          <div className="space-y-3 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Developer Sandbox Override
              </label>
              <button
                type="button"
                onClick={() => setUseMock(!useMock)}
                className={`rounded px-2.5 py-1 text-[9px] font-bold transition ${
                  useMock ? "bg-amber-600 text-white" : "bg-slate-900 text-slate-400"
                }`}
              >
                {useMock ? "Mocking Active" : "Mocking Inactive"}
              </button>
            </div>

            {useMock && (
              <div className="animate-fadeIn grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-500">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-white focus:outline-none"
                    value={mockLat}
                    onChange={(e) => setMockLat(parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-500">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-white focus:outline-none"
                    value={mockLng}
                    onChange={(e) => setMockLng(parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-500">
                    Accuracy (m)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-white focus:outline-none"
                    value={mockAcc}
                    onChange={(e) => setMockAcc(parseInt(e.target.value, 10))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentLocationPage({ searchParams }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={["Student"]}>
      <StudentLocationContent searchParams={searchParams} />
    </ProtectedRoute>
  );
}
