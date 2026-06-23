"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { apiService, AuditLog } from "../../../services/api";
import {
  Shield,
  LogOut,
  LayoutDashboard,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  Eye,
  FileSpreadsheet,
  FileText,
  FileCode,
  Activity,
  User as UserIcon,
  Server,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

function AuditDashboardContent() {
  const { logout } = useAuth();

  // Audit Logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Page Size
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // KPI Statistics
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    admin: 0,
    system: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Export State
  const [exportState, setExportState] = useState<{
    format: "csv" | "excel" | "pdf" | null;
    status: "idle" | "preparing" | "downloading" | "done" | "error";
    progress: number;
    errorMsg?: string;
  }>({ format: null, status: "idle", progress: 0 });

  // Fetch KPI statistics
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const todayStr = new Date().toISOString().split("T")[0];

      const [totalRes, todayRes, adminRes, devRes] = await Promise.all([
        apiService.getAuditLogs({ page: 1, size: 1 }),
        apiService.getAuditLogs({ page: 1, size: 1, start_date: todayStr, end_date: todayStr }),
        apiService.getAuditLogs({ page: 1, size: 1, actor_role: "Admin" }),
        apiService.getAuditLogs({ page: 1, size: 1, actor_role: "Developer" }),
      ]);

      setStats({
        total: totalRes.total,
        today: todayRes.total,
        admin: adminRes.total,
        system: totalRes.total - adminRes.total - devRes.total, // system actions without admin/dev login roles
      });
    } catch (err) {
      console.error("Failed to load audit metrics:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch paginated & filtered audit logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getAuditLogs({
        page,
        size,
        search: searchTerm || undefined,
        action_type: filterAction || undefined,
        actor_role: filterRole || undefined,
        entity_type: filterEntity || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setLogs(res.items);
      setTotalLogs(res.total);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, size, searchTerm, filterAction, filterRole, filterEntity, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle Export CSV/Excel/PDF
  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      setExportState({ format, status: "preparing", progress: 10 });
      
      const interval = setInterval(() => {
        setExportState((prev) => {
          if (prev.progress >= 90) {
            clearInterval(interval);
            return prev;
          }
          return { ...prev, progress: prev.progress + 20 };
        });
      }, 150);

      const blob = await apiService.downloadAuditReport(format, {
        search: searchTerm || undefined,
        action_type: filterAction || undefined,
        actor_role: filterRole || undefined,
        entity_type: filterEntity || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      
      clearInterval(interval);
      setExportState({ format, status: "downloading", progress: 100 });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const fileExtensions = { csv: "csv", excel: "xlsx", pdf: "pdf" };
      const currentLabel = new Date().toISOString().split("T")[0];
      a.download = `Audit_Log_${currentLabel}.${fileExtensions[format]}`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setExportState({ format, status: "done", progress: 100 });
      setTimeout(() => {
        setExportState({ format: null, status: "idle", progress: 0 });
      }, 2000);
    } catch (err: any) {
      setExportState({
        format,
        status: "error",
        progress: 0,
        errorMsg: err.message || "Failed to download audit logs report.",
      });
    }
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 border border-slate-800">
          <Server className="h-2.5 w-2.5" />
          SYSTEM
        </span>
      );
    }

    switch (role.toUpperCase()) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400 border border-indigo-500/20">
            <Shield className="h-2.5 w-2.5" />
            ADMIN
          </span>
        );
      case "DEVELOPER":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/20">
            <Activity className="h-2.5 w-2.5" />
            DEV
          </span>
        );
      case "STUDENT":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
            <UserIcon className="h-2.5 w-2.5" />
            STUDENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-500/10 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 border border-slate-500/20">
            {role.toUpperCase()}
          </span>
        );
    }
  };

  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("LOGIN") || act.includes("LOGOUT")) return "text-indigo-400 bg-indigo-950/20 border-indigo-800/30";
    if (act.includes("CREATED") || act.includes("SUBMITTED")) return "text-emerald-400 bg-emerald-950/20 border-emerald-800/30";
    if (act.includes("DELETED") || act.includes("REJECTED")) return "text-rose-400 bg-rose-950/20 border-rose-800/30";
    if (act.includes("OVERRIDDEN") || act.includes("UPDATED")) return "text-amber-400 bg-amber-950/20 border-amber-800/30";
    return "text-slate-300 bg-slate-900 border-slate-800";
  };

  const totalPages = Math.ceil(totalLogs / size) || 1;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Glows */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-1/4 bottom-0 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="glow-primary rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-2.5">
              <Shield className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">System Audit Trail</h1>
              <p className="text-xs text-slate-400">Track and monitor platform operations, security events, and database activity</p>
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
          {/* Navigation Sidebar */}
          <div className="space-y-6">
            <div className="glass-panel space-y-1 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <Link href="/admin" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard Overview</span>
              </Link>
              <Link href="/admin/attendance" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200">
                <Users className="h-4 w-4" />
                <span>Manage Attendance</span>
              </Link>
              <Link href="/admin/history" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200">
                <Calendar className="h-4 w-4" />
                <span>Student History</span>
              </Link>
              <Link href="/admin/reports" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200">
                <Users className="h-4 w-4" />
                <span>Reports & Exports</span>
              </Link>
              <Link href="/admin/audit" className="flex w-full items-center gap-3 rounded-lg bg-indigo-600/10 px-3 py-2.5 text-xs font-bold text-indigo-400 transition">
                <Shield className="h-4 w-4" />
                <span>Audit Logs</span>
              </Link>
            </div>
          </div>

          {/* Main Content Panel */}
          <div className="space-y-6 md:col-span-3">
            {/* KPI Cards */}
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {loadingStats ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5 h-24 animate-pulse" />
                ))
              ) : (
                <>
                  <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Logs</span>
                    <h3 className="mt-2 text-2xl font-bold text-white">{stats.total}</h3>
                    <p className="mt-0.5 text-[8px] text-slate-500">All-time tracked records</p>
                  </div>
                  <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Today's Activity</span>
                    <h3 className="mt-2 text-2xl font-bold text-indigo-400">{stats.today}</h3>
                    <p className="mt-0.5 text-[8px] text-slate-500">Actions in last 24h</p>
                  </div>
                  <div className="glass-panel rounded-2xl border border-indigo-900/40 bg-slate-950/40 p-5 border-l-2 border-l-indigo-500">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Admin Actions</span>
                    <h3 className="mt-2 text-2xl font-bold text-white">{stats.admin}</h3>
                    <p className="mt-0.5 text-[8px] text-slate-500">Privileged modifications</p>
                  </div>
                  <div className="glass-panel rounded-2xl border border-emerald-900/40 bg-slate-950/40 p-5 border-l-2 border-l-emerald-500">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">System Events</span>
                    <h3 className="mt-2 text-2xl font-bold text-white">{stats.system}</h3>
                    <p className="mt-0.5 text-[8px] text-slate-500">Automated audit tasks</p>
                  </div>
                </>
              )}
            </section>

            {/* Export Center panel */}
            <section className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Export Filtered Audit Trail</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Generate and download report files matching current filters</p>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleExport("csv")}
                  disabled={exportState.status !== "idle" && exportState.status !== "done"}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-900 hover:border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <FileCode className="h-4 w-4 text-indigo-400" />
                  <span>Download CSV</span>
                </button>

                <button
                  onClick={() => handleExport("excel")}
                  disabled={exportState.status !== "idle" && exportState.status !== "done"}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-900 hover:border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  <span>Download Excel</span>
                </button>

                <button
                  onClick={() => handleExport("pdf")}
                  disabled={exportState.status !== "idle" && exportState.status !== "done"}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-900 hover:border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <FileText className="h-4 w-4 text-rose-400" />
                  <span>Download PDF</span>
                </button>
              </div>

              {/* Export Progress Bar */}
              {exportState.status !== "idle" && (
                <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-3 text-xs">
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span className="text-slate-300">
                      {exportState.status === "preparing" && "Compiling audit database..."}
                      {exportState.status === "downloading" && "Downloading document..."}
                      {exportState.status === "done" && "Download complete!"}
                      {exportState.status === "error" && "Export failed"}
                    </span>
                    <span className="text-slate-400">{exportState.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        exportState.status === "error" ? "bg-rose-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${exportState.progress}%` }}
                    />
                  </div>
                  {exportState.status === "error" && (
                    <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{exportState.errorMsg}</span>
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Filter Section */}
            <section className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Search & Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-500" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search Actor or Description..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Start Date */}
                <div className="relative flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none"
                  />
                </div>

                {/* End Date */}
                <div className="relative flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* Action Type Filter */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                  </span>
                  <select
                    value={filterAction}
                    onChange={(e) => {
                      setFilterAction(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none"
                  >
                    <option value="">All Action Types</option>
                    <option value="Login">Login</option>
                    <option value="Logout">Logout</option>
                    <option value="Developer Login">Developer Login</option>
                    <option value="Developer Logout">Developer Logout</option>
                    <option value="Attendance Submitted">Attendance Submitted</option>
                    <option value="Attendance Overridden">Attendance Overridden</option>
                    <option value="Attendance Deleted">Attendance Deleted</option>
                    <option value="Session Created">Session Created</option>
                    <option value="Session Started">Session Started</option>
                    <option value="Session Ended">Session Ended</option>
                    <option value="Session Reopened">Session Reopened</option>
                    <option value="Risk Generated">Risk Generated</option>
                    <option value="Risk Approved">Risk Approved</option>
                    <option value="Risk Rejected">Risk Rejected</option>
                    <option value="Risk Overridden">Risk Overridden</option>
                    <option value="CSV Export">CSV Export</option>
                    <option value="Excel Export">Excel Export</option>
                    <option value="PDF Export">PDF Export</option>
                    <option value="Registration Completed">Registration Completed</option>
                    <option value="Profile Updated">Profile Updated</option>
                  </select>
                </div>

                {/* Actor Role Filter */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                  </span>
                  <select
                    value={filterRole}
                    onChange={(e) => {
                      setFilterRole(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none"
                  >
                    <option value="">All Actor Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="Developer">Developer</option>
                    <option value="Student">Student</option>
                    <option value="System">System / Anonymous</option>
                  </select>
                </div>

                {/* Entity Type Filter */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                  </span>
                  <select
                    value={filterEntity}
                    onChange={(e) => {
                      setFilterEntity(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none"
                  >
                    <option value="">All Entity Types</option>
                    <option value="User">User</option>
                    <option value="AttendanceRecord">AttendanceRecord</option>
                    <option value="AttendanceSession">AttendanceSession</option>
                    <option value="RiskAssessment">RiskAssessment</option>
                    <option value="Report">Report</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Audit Log Table */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                  <p className="text-xs text-slate-500">Querying database logs...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center text-slate-100">
                  <AlertCircle className="h-10 w-10 text-rose-400 animate-bounce" />
                  <p className="text-sm font-bold">Query Execution Failed</p>
                  <p className="text-xs text-slate-500 max-w-sm">{error}</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-center text-slate-500">
                  <Shield className="h-10 w-10 text-slate-800" />
                  <p className="text-sm font-bold text-slate-400">Audit Trail is Empty</p>
                  <p className="text-xs text-slate-600 max-w-sm">No activity records match your current filtering parameters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-900/30 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="px-5 py-3.5">Timestamp (Local)</th>
                        <th className="px-5 py-3.5">Actor</th>
                        <th className="px-5 py-3.5">Role</th>
                        <th className="px-5 py-3.5">Action</th>
                        <th className="px-5 py-3.5">Entity</th>
                        <th className="px-5 py-3.5">Description</th>
                        <th className="px-5 py-3.5 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 text-slate-300">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/30 transition">
                          <td className="px-5 py-4 whitespace-nowrap font-mono text-slate-450 text-[10px]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                            {log.actor_name || "System / Cron"}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">{getRoleBadge(log.actor_role)}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${getActionColor(log.action_type)}`}>
                              {log.action_type}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-slate-400">
                            {log.entity_type ? (
                              <span className="font-mono bg-slate-900 px-1 py-0.5 rounded text-[10px]">
                                {log.entity_type} {log.entity_id !== null ? `#${log.entity_id}` : ""}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-400 max-w-xs truncate" title={log.description}>
                            {log.description}
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <Link
                              href={`/admin/audit/${log.id}`}
                              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold cursor-pointer inline-flex items-center gap-1 text-[10px]"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Inspect</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Pagination controls */}
            {totalPages > 1 && !loading && (
              <div className="flex items-center justify-between border-t border-slate-900 pt-4">
                <div className="text-[10px] text-slate-500">
                  Showing logs {(page - 1) * size + 1} to {Math.min(page * size, totalLogs)} of {totalLogs}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-slate-300 font-bold px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuditDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <AuditDashboardContent />
    </ProtectedRoute>
  );
}
