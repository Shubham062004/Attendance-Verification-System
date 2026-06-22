"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "../../../../../components/ProtectedRoute";
import { apiService, AttendanceSession } from "../../../../../services/api";
import MapPreview from "../../../../../components/MapPreview";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Save,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function AdminLocationSettingsContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Classroom settings state
  const [latitude, setLatitude] = useState(31.2536);
  const [longitude, setLongitude] = useState(75.7033);
  const [radius, setRadius] = useState(100);

  const fetchSessionAndLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionData = await apiService.getSession(sessionId);
      setSession(sessionData);

      try {
        const locConfig = await apiService.getClassroomLocation(sessionId);
        setLatitude(locConfig.latitude);
        setLongitude(locConfig.longitude);
        setRadius(locConfig.allowed_radius);
      } catch (locErr) {
        // Location config not set yet, use defaults
        console.log("No existing location configuration, using default values.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load session details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndLocation();
  }, [sessionId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setError(null);

    try {
      await apiService.configureClassroomLocation(sessionId, {
        latitude,
        longitude,
        allowed_radius: radius,
      });
      setSuccessMsg("Classroom location configured successfully!");
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to configure classroom location.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="mt-4 text-xs text-slate-500">Querying location settings...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h3 className="text-md mt-4 font-bold">Failed to load settings</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">{error}</p>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="mt-6 text-xs font-semibold text-indigo-400 hover:underline"
        >
          Return to Session Console
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Breadcrumb */}
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Session details</span>
        </Link>

        {/* Card */}
        <div className="glass-panel relative rounded-2xl border border-slate-800 bg-slate-950/60 p-6 md:p-8">
          {/* Status Message Banners */}
          {successMsg && (
            <div className="animate-fadeIn mb-6 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-600/10 p-4 text-xs text-emerald-400">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {error && (
            <div className="animate-fadeIn text-rose-450 mb-6 flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-600/10 p-4 text-xs">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Heading */}
          <div className="mb-6 flex items-center gap-3 border-b border-slate-900 pb-5">
            <div className="glow-primary rounded-lg border border-indigo-500/20 bg-indigo-600/10 p-2">
              <MapPin className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-white">
                Classroom Location Boundaries
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Configure geographical requirements for {session?.title}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Input Form */}
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Allowed Radius (meters)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                  disabled={isSaving}
                />
              </div>

              <div className="text-slate-450 space-y-2 rounded-lg border border-slate-900 bg-slate-950/40 p-4 text-[11px]">
                <div className="text-slate-350 flex items-center gap-1.5 font-bold">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Radius Reference Guidelines</span>
                </div>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    Small classroom: <strong>20 - 30 meters</strong>
                  </li>
                  <li>
                    Lecture hall / building: <strong>50 - 100 meters</strong>
                  </li>
                  <li>
                    Campus range: <strong>200+ meters</strong>
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save Configuration</span>
              </button>
            </form>

            {/* Map Preview Panel */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Map Verification Boundary
                </h4>
                <MapPreview classroomLat={latitude} classroomLng={longitude} radius={radius} />
              </div>
              <div className="text-center text-[10px] leading-relaxed text-slate-500">
                Allowed area boundary circle is rendered in indigo. Any students outside this radius
                will be marked with a location risk flag.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLocationSettingsPage({ params }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <AdminLocationSettingsContent params={params} />
    </ProtectedRoute>
  );
}
