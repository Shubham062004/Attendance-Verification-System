"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { apiService, AttendanceSession } from "../../services/api";
import {
  Shield,
  Loader2,
  AlertCircle,
  Clock,
  BookOpen,
  QrCode,
  LogOut,
  User as UserIcon,
} from "lucide-react";

function StudentAttendanceContent() {
  const { user, logout } = useAuth();
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActive = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const session = await apiService.getActiveSession();
      setActiveSession(session);
    } catch (err) {
      console.error("Failed to load active session", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActive();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="mt-4 text-xs text-slate-500">Checking for active attendance sessions...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />

      <div className="mx-auto max-w-md space-y-6">
        {/* Navigation / Header */}
        <header className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="glow-primary rounded-xl border border-blue-500/20 bg-blue-600/10 p-2">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-md font-bold leading-tight text-white">Smart Attendance</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">Verification Portal</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-900 bg-slate-900/60 px-2.5 py-1 text-xs font-semibold text-slate-400 transition hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Out</span>
          </button>
        </header>

        {/* User Card */}
        <div className="glass-panel flex items-center gap-3 rounded-xl border border-slate-900 bg-slate-950/40 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-500/15 bg-blue-600/20 text-xs font-bold text-blue-400">
            {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{user?.name || "Student"}</p>
            <p className="truncate text-[10px] text-slate-500">{user?.email}</p>
          </div>
          <div className="text-right">
            <span className="text-slate-450 block font-mono text-[10px] font-bold uppercase tracking-wider">
              Reg No
            </span>
            <span className="font-mono text-xs font-bold text-blue-400">
              {user?.registration_number}
            </span>
          </div>
        </div>

        {/* Content Box */}
        {activeSession ? (
          <div className="glass-panel relative space-y-6 overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-8 text-center backdrop-blur-md">
            <div className="absolute right-0 top-0 h-40 w-40 animate-pulse rounded-full bg-emerald-500/5 blur-3xl" />

            {/* Live Indicator */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-600/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
              Attendance Session Available
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold tracking-tight text-white">{activeSession.title}</h3>
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                <span>{activeSession.subject}</span>
                <span className="text-slate-650">•</span>
                <span>Class: {activeSession.class_name}</span>
              </p>
            </div>

            <div className="border-t border-slate-900 pt-6">
              <button
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-blue-500/20 bg-blue-600/10 px-4 py-3.5 text-xs font-bold text-blue-400 opacity-60"
              >
                <QrCode className="h-4 w-4 text-blue-400" />
                <span>Scan QR To Continue</span>
              </button>
              <p className="mx-auto mt-2 max-w-xs text-[10px] leading-relaxed text-slate-500">
                Scan button will be enabled when QR generation and camera validation is added in the
                next branch.
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-panel relative space-y-6 overflow-hidden rounded-2xl border border-slate-900 bg-slate-950/60 p-8 py-12 text-center backdrop-blur-md">
            <div className="border-slate-850 mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-slate-900/60">
              <Clock className="h-5 w-5 text-slate-500" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No Active Attendance Session</h3>
              <p className="mx-auto max-w-xs text-xs text-slate-500">
                Please wait for the teacher to launch an attendance session for your class.
              </p>
            </div>

            <button
              onClick={() => fetchActive(true)}
              disabled={refreshing}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-blue-400 transition hover:text-blue-300"
            >
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span>Check / Refresh</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentAttendancePage() {
  return (
    <ProtectedRoute allowedRoles={["Student"]}>
      <StudentAttendanceContent />
    </ProtectedRoute>
  );
}
