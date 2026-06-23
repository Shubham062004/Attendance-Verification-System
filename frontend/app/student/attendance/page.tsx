"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { useAuth } from "../../../context/AuthContext";
import { apiService, AttendanceRecordResponse } from "../../../services/api";
import {
  ClipboardList,
  Loader2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    PRESENT: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      color: "border-emerald-800/40 bg-emerald-950/30 text-emerald-400",
      label: "Present",
    },
    FLAGGED: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      color: "border-amber-800/40 bg-amber-950/30 text-amber-400",
      label: "Flagged",
    },
    REJECTED: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      color: "border-rose-800/40 bg-rose-950/30 text-rose-400",
      label: "Rejected",
    },
  };
  const cfg = map[status] ?? map.PRESENT;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inner component (needs auth context)
// ---------------------------------------------------------------------------
function StudentAttendanceInner() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecordResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const fetchData = async () => {
      try {
        const data = await apiService.getStudentAttendance(user.id);
        setRecords(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load attendance history");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const totalPresent = records.filter((r) => r.status === "PRESENT").length;
  const totalFlagged = records.filter((r) => r.status === "FLAGGED").length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-violet-600/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-1/4 right-0 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <header className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-violet-500/20 bg-violet-600/10 p-2.5">
              <ClipboardList className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">My Attendance</h1>
              <p className="text-xs text-slate-500">Your attendance history across all sessions</p>
            </div>
          </div>
        </header>

        {/* Quick stats */}
        {records.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Attendance %",
                value: `${Math.round(
                  (records.filter((r) => r.status === "PRESENT" || r.status === "FLAGGED").length /
                    records.length) *
                    100,
                )}%`,
                color: "text-indigo-400",
                bg: "bg-indigo-950/20 border-indigo-900/40",
              },
              {
                label: "Present",
                value: records.filter((r) => r.status === "PRESENT" || r.status === "FLAGGED")
                  .length,
                color: "text-emerald-400",
                bg: "bg-emerald-950/30 border-emerald-800/40",
              },
              {
                label: "Absent / Rejected",
                value: records.filter((r) => r.status === "REJECTED").length,
                color: "text-rose-400",
                bg: "bg-rose-950/30 border-rose-800/40",
              },
              {
                label: "Total Sessions",
                value: records.length,
                color: "text-white",
                bg: "bg-slate-900 border-slate-800",
              },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl border p-4 text-center ${bg}`}>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-800/40 bg-rose-950/30 p-4 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Records list */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-sm font-bold text-white">Attendance Records</h2>
          </div>

          {records.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <ClipboardList className="h-12 w-12 text-slate-700" />
              <div>
                <p className="text-sm font-semibold text-slate-400">No attendance records yet</p>
                <p className="mt-1 text-xs text-slate-600">
                  Attend a session to see your history here.
                </p>
              </div>
              <Link
                href="/attendance"
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Go to Attendance
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-900/60">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-900/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900">
                      <Calendar className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white">
                        Session #{record.session_id}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {new Date(record.submitted_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={record.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <Link href="/attendance" className="text-xs text-indigo-400 hover:underline">
            ← Attendance Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StudentAttendancePage() {
  return (
    <ProtectedRoute allowedRoles={["Student"]}>
      <StudentAttendanceInner />
    </ProtectedRoute>
  );
}
