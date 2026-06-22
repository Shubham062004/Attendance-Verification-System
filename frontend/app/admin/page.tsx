"use client";

import React from "react";
import { useAuth } from "../../context/AuthContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  Shield,
  LogOut,
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  BarChart3,
  AlertCircle,
} from "lucide-react";

function AdminDashboardContent() {
  const { user, logout } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="glow-primary rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-2.5">
              <Shield className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Admin Management Control
              </h1>
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
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Authorized Admin
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                  A
                </div>
                <div>
                  <h4 className="text-sm font-bold leading-tight text-white">
                    {user?.name || "Teacher Account"}
                  </h4>
                  <p className="mt-0.5 text-[10px] text-slate-500">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Side menu placeholders */}
            <div className="glass-panel space-y-1 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <button className="flex w-full items-center gap-3 rounded-lg bg-indigo-600/10 px-3 py-2.5 text-xs font-bold text-indigo-400 transition">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard Overview</span>
              </button>
              <button
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200"
                disabled
              >
                <Users className="h-4 w-4" />
                <span>Manage Students</span>
              </button>
              <button
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200"
                disabled
              >
                <Calendar className="h-4 w-4" />
                <span>Attendance Sessions</span>
              </button>
            </div>
          </div>

          {/* Main Panel Content */}
          <div className="space-y-6 md:col-span-3">
            {/* Status Warning / Info */}
            <div className="flex gap-4 rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-5 text-sm text-indigo-300">
              <AlertCircle className="h-6 w-6 shrink-0 text-indigo-400" />
              <div>
                <h4 className="font-bold text-white">Verification Engine Initialized</h4>
                <p className="mt-1 text-xs leading-relaxed text-indigo-300/80">
                  Your administrator token is active. The database and backend are fully
                  authenticated. Live attendance session tools and real-time tracking modules will
                  be implemented in the next feature branch (
                  <code className="text-white">feature/attendance-session</code>).
                </p>
              </div>
            </div>

            {/* Metric Placeholders */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="flex items-start justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Enrolled</span>
                  <Users className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-2xl font-bold text-white">--</h3>
                <p className="mt-1 text-[10px] text-slate-500">Pending sync with registry</p>
              </div>

              <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="flex items-start justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Active Sessions
                  </span>
                  <Clock className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-2xl font-bold text-white">0</h3>
                <p className="mt-1 text-[10px] text-slate-500">Ready to create session</p>
              </div>

              <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="flex items-start justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Average Attendance
                  </span>
                  <BarChart3 className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-2xl font-bold text-white">-- %</h3>
                <p className="mt-1 text-[10px] text-slate-500">No historical sessions</p>
              </div>
            </div>

            {/* Block Placeholder */}
            <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-8 py-12 text-center">
              <h3 className="mb-2 text-lg font-bold text-white">Live Session Dashboard</h3>
              <p className="mx-auto mb-6 max-w-md text-xs text-slate-500">
                When the attendance modules are enabled, you will be able to launch secure QR codes
                and biometric facial verifications directly from this console.
              </p>
              <button
                className="cursor-not-allowed rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white opacity-50 transition hover:bg-indigo-500"
                disabled
              >
                Create Attendance Session
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin"]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
