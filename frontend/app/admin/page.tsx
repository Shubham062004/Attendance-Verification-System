"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { apiService, DashboardStatsResponse } from "../../services/api";
import {
  Shield,
  LogOut,
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  BarChart3,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAdminStats();
      setStats(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-slate-400">{error || "Failed to load dashboard metrics"}</p>
        <button
          onClick={fetchStats}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background gradients */}
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
              <h1 className="text-xl font-bold tracking-tight text-white">Admin Management Control</h1>
              <p className="text-xs text-slate-400">Smart Attendance Verification Console</p>
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

        {/* Dashboard Grid Layout */}
        <main className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Quick Info Sidebar */}
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Authorized Admin</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-white uppercase">
                  {user?.name ? user.name[0] : "A"}
                </div>
                <div>
                  <h4 className="text-sm font-bold leading-tight text-white">{user?.name || "Teacher Account"}</h4>
                  <p className="mt-0.5 text-[10px] text-slate-500">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Sidebar menu */}
            <div className="glass-panel space-y-1 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <Link href="/admin" className="flex w-full items-center gap-3 rounded-lg bg-indigo-600/10 px-3 py-2.5 text-xs font-bold text-indigo-400 transition">
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
              <Link href="/admin/risk" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <span>Risk Reviews</span>
              </Link>
              <Link href="/admin/audit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span>Audit Logs</span>
              </Link>
            </div>
          </div>

          {/* Main Panel Content */}
          <div className="space-y-6 md:col-span-3">
            {/* KPI Cards */}
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { label: "Total Students", value: stats.total_students, desc: "Enrolled in class", icon: <Users className="h-4 w-4 text-slate-500" /> },
                { label: "Present Today", value: stats.present_today, desc: "Successfully validated", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> },
                { label: "Absent Today", value: stats.absent_today, desc: "No validation recorded", icon: <XCircle className="h-4 w-4 text-rose-400" /> },
                { label: "Attendance Rate", value: `${Math.round(stats.attendance_percentage_today)}%`, desc: "Today's average", icon: <TrendingUp className="h-4 w-4 text-indigo-400" /> },
                { label: "Active Status", value: stats.active_session_status || "NONE", desc: "Current lecture status", icon: <Clock className="h-4 w-4 text-amber-400" /> },
                { label: "Pending Reviews", value: stats.pending_risk_reviews, desc: "Flagged risk assessments", icon: <AlertCircle className="h-4 w-4 text-rose-400" /> },
                { label: "Total Records", value: stats.total_attendance_records, desc: "Platform database size", icon: <BarChart3 className="h-4 w-4 text-slate-500" /> },
              ].map((card, idx) => (
                <div key={idx} className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                  <div className="flex items-start justify-between text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{card.label}</span>
                    {card.icon}
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-white">{card.value}</h3>
                  <p className="mt-1 text-[9px] text-slate-500">{card.desc}</p>
                </div>
              ))}
            </section>

            {/* Active Session Panel */}
            {stats.active_session_status !== "NONE" && (
              <section className="glass-panel rounded-2xl border border-amber-500/20 bg-amber-950/10 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    <h3 className="text-sm font-bold text-white">Active Session Monitoring</h3>
                  </div>
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    {stats.active_session_status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center rounded-xl bg-slate-950/40 p-4 border border-slate-900">
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Present Count</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">{stats.present_today}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Absent Count</p>
                    <p className="text-xl font-bold text-rose-400 mt-1">{stats.absent_today}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Progress Rate</p>
                    <p className="text-xl font-bold text-indigo-400 mt-1">{Math.round(stats.attendance_percentage_today)}%</p>
                  </div>
                </div>
              </section>
            )}

            {/* Today Session Overview */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Today's Lectures & Sessions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.today_sessions.map((session) => (
                  <div key={session.id} className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400">{session.subject} · {session.class_name}</span>
                        <span className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                          session.status === "ACTIVE" || session.status === "REOPENED"
                            ? "bg-emerald-950/30 text-emerald-400 border border-emerald-800/40"
                            : "bg-slate-900 text-slate-500 border border-slate-800"
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-white mt-1 text-sm">{session.title}</h4>
                      {session.start_time && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Scheduled: {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {session.end_time && ` - ${new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center py-2.5 rounded-lg bg-slate-900/40 text-[11px] border border-slate-900/60">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">Present</span>
                        <span className="text-emerald-400 font-bold">{session.present_count}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">Absent</span>
                        <span className="text-rose-400 font-bold">{session.absent_count}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">Rate</span>
                        <span className="text-indigo-400 font-extrabold">{Math.round(session.attendance_percentage)}%</span>
                      </div>
                    </div>
                    <Link
                      href={`/admin/sessions/${session.id}`}
                      className="w-full text-center py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 block"
                    >
                      View Session Detail
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
