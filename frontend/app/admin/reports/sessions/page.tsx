"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../../context/AuthContext";
import { ProtectedRoute } from "../../../../components/ProtectedRoute";
import { apiService, AttendanceSession, SessionReportResponse } from "../../../../services/api";
import {
  Shield,
  LogOut,
  LayoutDashboard,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  TrendingUp,
  SlidersHorizontal,
  ChevronLeft,
} from "lucide-react";

function SessionReportsContent() {
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [sessionReports, setSessionReports] = useState<Record<number, SessionReportResponse>>({});
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ENDED"); // Default to ended sessions as they are completed

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.listSessions({
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setSessions(data);

      // Initialize reports loading state
      const initialLoading: Record<number, boolean> = {};
      data.forEach((s: AttendanceSession) => {
        initialLoading[s.id] = true;
      });
      setLoadingReports(initialLoading);
    } catch (err: any) {
      setError(err.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [statusFilter]);

  // Load individual session reports dynamically
  useEffect(() => {
    const fetchReportsForSessions = async () => {
      for (const s of sessions) {
        if (sessionReports[s.id]) continue; // Skip if already loaded
        try {
          const report = await apiService.getSessionReport(s.id);
          setSessionReports((prev) => ({ ...prev, [s.id]: report }));
        } catch (err) {
          console.error(`Failed to fetch report for session ${s.id}:`, err);
        } finally {
          setLoadingReports((prev) => ({ ...prev, [s.id]: false }));
        }
      }
    };

    if (sessions.length > 0) {
      fetchReportsForSessions();
    }
  }, [sessions]);

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.class_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Glows */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-1/4 bottom-0 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/reports"
              className="flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Session-wise Reports</h1>
              <p className="text-xs text-slate-400">
                Deep-dive breakdown of student attendance by time slots
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Filters Sidebar */}
          <div className="glass-panel space-y-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3 text-slate-300">
              <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Report Filters</h3>
            </div>

            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Search Session
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Title, subject, or class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Status Select */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Session Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="ENDED">Ended (Archived)</option>
                <option value="ACTIVE">Active (In-Progress)</option>
                <option value="DRAFT">Drafts (Unstarted)</option>
                <option value="ALL">All Sessions</option>
              </select>
            </div>
          </div>

          {/* Main Sessions Grid */}
          <div className="space-y-6 md:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-900 py-12 text-slate-400">
                <AlertCircle className="h-10 w-10 text-rose-500" />
                <p className="text-sm">{error}</p>
                <button
                  onClick={fetchSessions}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
                >
                  Retry
                </button>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-900 py-24 text-slate-500">
                <AlertCircle className="text-slate-650 h-8 w-8" />
                <p className="text-xs">No matching sessions found matching these filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredSessions.map((session) => {
                  const report = sessionReports[session.id];
                  const reportLoading = loadingReports[session.id];

                  return (
                    <div
                      key={session.id}
                      className="glass-panel flex flex-col justify-between space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 transition hover:border-slate-700"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {session.subject} · {session.class_name}
                          </span>
                          <span
                            className={`py-0.2 rounded-full px-2 text-[9px] font-bold ${
                              session.status === "ACTIVE"
                                ? "border border-emerald-800/40 bg-emerald-950/30 text-emerald-400"
                                : "border border-slate-800 bg-slate-900 text-slate-500"
                            }`}
                          >
                            {session.status}
                          </span>
                        </div>
                        <h4 className="mt-1 text-sm font-bold text-white">{session.title}</h4>
                        {session.start_time && (
                          <p className="mt-1 text-[10px] text-slate-500">
                            Slot:{" "}
                            {new Date(session.start_time).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>

                      {/* Session statistics */}
                      {reportLoading ? (
                        <div className="flex items-center justify-center rounded-xl border border-slate-900 bg-slate-900/40 py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                        </div>
                      ) : report ? (
                        <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-900/65 bg-slate-900/40 py-2.5 text-center text-[11px]">
                          <div>
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Present
                            </span>
                            <span className="font-bold text-emerald-400">
                              {report.present_count}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Absent
                            </span>
                            <span className="font-bold text-rose-400">{report.absent_count}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Rate
                            </span>
                            <span className="font-extrabold text-indigo-400">
                              {Math.round(report.attendance_percentage)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-550 rounded-lg border border-slate-900 bg-slate-900/30 py-2 text-center text-[10px]">
                          Failed to compute stats
                        </p>
                      )}

                      <Link
                        href={`/admin/sessions/${session.id}`}
                        className="hover:bg-slate-850 border-slate-850 block w-full rounded-lg border bg-slate-900 py-2 text-center text-xs font-semibold text-slate-300"
                      >
                        View Verification Details
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SessionReports() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <SessionReportsContent />
    </ProtectedRoute>
  );
}
