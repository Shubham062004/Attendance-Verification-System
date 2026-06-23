"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ProtectedRoute } from "../../../../../components/ProtectedRoute";
import {
  apiService,
  AttendanceRecordResponse,
  SessionAttendanceSummary,
} from "../../../../../services/api";
import {
  ArrowLeft,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  Camera,
  ShieldCheck,
  MapPin,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function AdminAttendanceContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);

  const [summary, setSummary] = useState<SessionAttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiService.getSessionAttendance(sessionId);
        setSummary(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-slate-400">{error || "No data found"}</p>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="text-xs text-indigo-400 hover:underline"
        >
          ← Back to Session
        </Link>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case "FLAGGED":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-rose-400" />;
      default:
        return null;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "border-emerald-800/40 bg-emerald-950/30 text-emerald-400";
      case "FLAGGED":
        return "border-amber-800/40 bg-amber-950/30 text-amber-400";
      case "REJECTED":
        return "border-rose-800/40 bg-rose-950/30 text-rose-400";
      default:
        return "border-slate-800 bg-slate-900 text-slate-400";
    }
  };

  const attendancePct = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Breadcrumb */}
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Session #{sessionId}
        </Link>

        {/* Header */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-2.5">
              <Users className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Attendance Records</h1>
              <p className="text-xs text-slate-500">Session #{sessionId}</p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Total",
              value: summary.total,
              color: "text-white",
              bg: "bg-slate-900 border-slate-800",
            },
            {
              label: "Present",
              value: summary.present,
              color: "text-emerald-400",
              bg: "bg-emerald-950/30 border-emerald-800/40",
            },
            {
              label: "Flagged",
              value: summary.flagged,
              color: "text-amber-400",
              bg: "bg-amber-950/30 border-amber-800/40",
            },
            {
              label: "Rejected",
              value: summary.rejected,
              color: "text-rose-400",
              bg: "bg-rose-950/30 border-rose-800/40",
            },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border p-4 text-center ${bg}`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Attendance rate bar */}
        {summary.total > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <BarChart3 className="h-4 w-4" />
                Attendance Rate
              </div>
              <span className="text-sm font-bold text-white">{attendancePct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${attendancePct}%` }}
              />
            </div>
          </div>
        )}

        {/* Records table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-sm font-bold text-white">Student Records</h2>
          </div>

          {summary.records.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Users className="h-10 w-10 text-slate-700" />
              <p className="text-sm text-slate-500">No attendance records yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-900/60">
              {summary.records.map((record: AttendanceRecordResponse) => (
                <div
                  key={record.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    {statusIcon(record.status)}
                    <div>
                      <p className="text-[11px] font-bold text-white">
                        Student #{record.student_id}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(record.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Prereq icons */}
                    <span
                      title="Location"
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${record.location_validation_id ? "bg-emerald-900/40 text-emerald-400" : "bg-slate-900 text-slate-600"}`}
                    >
                      <MapPin className="mr-0.5 inline h-2.5 w-2.5" />
                      Loc
                    </span>
                    <span
                      title="Liveness"
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${record.verification_session_id ? "bg-emerald-900/40 text-emerald-400" : "bg-slate-900 text-slate-600"}`}
                    >
                      <ShieldCheck className="mr-0.5 inline h-2.5 w-2.5" />
                      Live
                    </span>
                    <span
                      title="Selfie"
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${record.evidence_id ? "bg-emerald-900/40 text-emerald-400" : "bg-slate-900 text-slate-600"}`}
                    >
                      <Camera className="mr-0.5 inline h-2.5 w-2.5" />
                      Selfie
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColor(record.status)}`}
                    >
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAttendancePage({ params }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <AdminAttendanceContent params={params} />
    </ProtectedRoute>
  );
}
