"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { apiService, AttendanceSession, SessionStats } from "../../../services/api";
import {
  Shield,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Play,
  Square,
  FileSpreadsheet,
  XCircle,
} from "lucide-react";

function AdminSessionsDashboardContent() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchStats = async () => {
    try {
      const s = await apiService.getSessionStats();
      setStats(s);
    } catch (err) {
      console.error("Failed to load session stats", err);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.listSessions({
        q: search.trim() || undefined,
        status: statusFilter || undefined,
        page: page,
        size: pageSize,
      });
      setSessions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [search, statusFilter, page]);

  const handleStart = async (id: number) => {
    try {
      await apiService.startSession(id);
      fetchSessions();
      fetchStats();
      router.push(`/admin/sessions/active`);
    } catch (err: any) {
      alert(err.message || "Failed to start session");
    }
  };

  const handleEnd = async (id: number) => {
    try {
      await apiService.endSession(id);
      fetchSessions();
      fetchStats();
    } catch (err: any) {
      alert(err.message || "Failed to end session");
    }
  };

  const getStatusBadge = (status: AttendanceSession["status"]) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-600/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Active
          </span>
        );
      case "REOPENED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-600/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
            Reopened
          </span>
        );
      case "ENDED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
            Ended
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-600/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />

      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-slate-900 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="glow-primary rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-2.5">
              <Shield className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Attendance Sessions</h1>
              <p className="text-xs text-slate-400">
                Create, monitor, and run class attendance sessions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/sessions/active"
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>Live Console</span>
            </Link>
            <Link
              href="/admin/sessions/create"
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              <span>Create Session</span>
            </Link>
          </div>
        </header>

        {/* Stats Dashboard */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Sessions</span>
              <FileSpreadsheet className="h-4 w-4 text-slate-400" />
            </div>
            <h3 className="mt-3 text-2xl font-bold text-white">{stats ? stats.total : "--"}</h3>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
              <Play className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="mt-3 text-2xl font-bold text-emerald-400">
              {stats ? stats.active : "--"}
            </h3>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Ended</span>
              <CheckCircle2 className="h-4 w-4 text-slate-400" />
            </div>
            <h3 className="mt-3 text-2xl font-bold text-white">{stats ? stats.ended : "--"}</h3>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Drafts</span>
              <Layers className="h-4 w-4 text-blue-400" />
            </div>
            <h3 className="mt-3 text-2xl font-bold text-blue-400">{stats ? stats.draft : "--"}</h3>
          </div>
        </section>

        {/* Filter Controls */}
        <section className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-900 bg-slate-950/20 p-4 md:flex-row">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search title, subject, or class..."
              className="border-slate-850 w-full rounded-lg border bg-slate-900/40 py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex w-full items-center gap-3 md:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Filter className="h-4 w-4" />
              <span>Filter:</span>
            </div>
            <select
              className="border-slate-850 rounded-lg border bg-slate-900/60 px-3 py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ENDED">Ended</option>
              <option value="REOPENED">Reopened</option>
            </select>
          </div>
        </section>

        {/* Sessions Table / Grid */}
        <section className="glass-panel border-slate-850 overflow-hidden rounded-2xl border bg-slate-950/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="mt-4 text-xs text-slate-500">Fetching session records...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <XCircle className="h-10 w-10 text-rose-500" />
              <h3 className="mt-4 text-sm font-bold text-white">Failed to load sessions</h3>
              <p className="mt-1 text-xs text-slate-500">{error}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <Calendar className="text-slate-650 h-12 w-12" />
              <h3 className="mt-4 text-sm font-bold text-white">No Sessions Configured</h3>
              <p className="mt-1 max-w-xs text-xs text-slate-500">
                Launch your first attendance tracking session by clicking the "Create Session"
                button.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-900/20 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Title & Subject</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Timestamps</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-xs text-slate-300">
                  {sessions.map((session) => (
                    <tr key={session.id} className="transition-colors hover:bg-slate-900/20">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-white">{session.title}</div>
                        <div className="mt-0.5 text-[10px] text-slate-500">{session.subject}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold">{session.class_name}</td>
                      <td className="px-6 py-4 font-mono font-bold text-blue-400">
                        {session.session_code || "--"}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(session.status)}</td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] text-slate-400">
                          Start:{" "}
                          {session.start_time
                            ? new Date(session.start_time).toLocaleString()
                            : "Not started"}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          End:{" "}
                          {session.end_time
                            ? new Date(session.end_time).toLocaleString()
                            : "Not ended"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/sessions/${session.id}`}
                            className="text-xs font-bold text-blue-400 transition hover:text-blue-300"
                          >
                            Details
                          </Link>
                          {session.status === "DRAFT" && (
                            <button
                              onClick={() => handleStart(session.id)}
                              className="flex cursor-pointer items-center gap-1 rounded border border-emerald-500/20 bg-emerald-600/10 px-2 py-1 text-[11px] font-bold text-emerald-400 transition hover:bg-emerald-600/20"
                            >
                              <Play className="h-3 w-3" />
                              Start
                            </button>
                          )}
                          {(session.status === "ACTIVE" || session.status === "REOPENED") && (
                            <button
                              onClick={() => handleEnd(session.id)}
                              className="flex cursor-pointer items-center gap-1 rounded border border-rose-500/20 bg-rose-600/10 px-2 py-1 text-[11px] font-bold text-rose-400 transition hover:bg-rose-600/20"
                            >
                              <Square className="h-3 w-3" />
                              End
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && sessions.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-900 bg-slate-900/10 px-6 py-4">
              <span className="text-[10px] font-semibold text-slate-500">
                Page {page} of {sessions.length < pageSize ? page : "many"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-slate-400 transition hover:text-white disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={sessions.length < pageSize}
                  className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-slate-400 transition hover:text-white disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminSessionsDashboard() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <AdminSessionsDashboardContent />
    </ProtectedRoute>
  );
}
