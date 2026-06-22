"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "../../../../components/ProtectedRoute";
import { apiService, AttendanceSession } from "../../../../services/api";
import {
  Shield,
  Loader2,
  Clock,
  Square,
  Hash,
  BookOpen,
  Users,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

function ActiveSessionContent() {
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");

  const fetchActive = async () => {
    try {
      const data = await apiService.getActiveSession();
      setSession(data);
    } catch (err) {
      console.error("Failed to load active session", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActive();
  }, []);

  // Timer effect
  useEffect(() => {
    if (!session || !session.start_time) {
      setElapsedTime("");
      return;
    }

    const startTime = new Date(session.start_time).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const difference = now - startTime;

      if (difference < 0) {
        setElapsedTime("00:00:00");
        return;
      }

      const totalSec = Math.floor(difference / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const format = (num: number) => String(num).padStart(2, "0");
      setElapsedTime(`${format(hours)}:${format(minutes)}:${format(seconds)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleEnd = async () => {
    if (!session) return;
    setIsEnding(true);
    try {
      await apiService.endSession(session.id);
      setSession(null);
    } catch (err: any) {
      alert(err.message || "Failed to end session");
    } finally {
      setIsEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="mt-4 text-xs text-slate-500">Querying active sessions...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />

      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="glow-primary rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-2.5">
              <Shield className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Live Session Console</h1>
              <p className="text-xs text-slate-400">Monitor live student attendance verification</p>
            </div>
          </div>
          <Link
            href="/admin/sessions"
            className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:text-slate-200"
          >
            Dashboard View
          </Link>
        </header>

        {/* Live Panel Grid */}
        {!session ? (
          <div className="glass-panel border-slate-850 mx-auto max-w-md space-y-6 rounded-2xl border bg-slate-950/40 p-12 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-800 bg-slate-900/60">
              <Clock className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-md font-bold text-white">No Active Session Running</h3>
              <p className="mt-1 text-xs text-slate-500">
                There are no live attendance collection sessions right now. Let's create or launch
                one!
              </p>
            </div>
            <Link
              href="/admin/sessions"
              className="inline-block cursor-pointer rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500"
            >
              Configure Sessions
            </Link>
          </div>
        ) : (
          <main className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Live Timer Counter Box */}
            <div className="glass-panel relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-8">
              <div className="absolute right-0 top-0 h-40 w-40 animate-pulse rounded-full bg-emerald-500/5 blur-3xl" />
              <div>
                <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Live duration</span>
                  <span className="flex h-2 w-2 animate-ping rounded-full bg-emerald-500" />
                </div>
                <div className="font-mono text-4xl font-extrabold tracking-tight text-emerald-400">
                  {elapsedTime || "00:00:00"}
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  Session started at{" "}
                  {session.start_time ? new Date(session.start_time).toLocaleTimeString() : "--"}
                </p>
              </div>

              <button
                onClick={handleEnd}
                disabled={isEnding}
                className="mt-8 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 py-3 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
              >
                {isEnding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>End Active Session</span>
              </button>
            </div>

            {/* Metadata & Stats Details */}
            <div className="space-y-6 md:col-span-2">
              {/* Session Info */}
              <div className="glass-panel space-y-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                <h3 className="flex items-center gap-2 border-b border-slate-900 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                  Active Course Details
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h5 className="text-[10px] font-bold uppercase text-slate-500">Topic Title</h5>
                    <p className="mt-0.5 text-sm font-semibold text-white">{session.title}</p>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-bold uppercase text-slate-500">
                      Subject & Section
                    </h5>
                    <p className="mt-0.5 text-sm font-semibold text-white">
                      {session.subject}{" "}
                      <span className="font-normal text-slate-400">({session.class_name})</span>
                    </p>
                  </div>
                </div>

                <div className="border-slate-850 flex items-center gap-4 rounded-xl border bg-slate-900/40 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-600/10 font-bold text-blue-400">
                    <Hash className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-bold uppercase text-slate-500">
                      Verification Code
                    </h5>
                    <p className="text-md mt-0.5 font-mono font-bold text-blue-400">
                      {session.session_code || "--"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendance metrics placeholders */}
              <div className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                <h3 className="flex items-center gap-2 border-b border-slate-900 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Users className="h-4 w-4 text-blue-400" />
                  Real-time Verification Status
                </h3>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="border-slate-850 rounded-xl border bg-slate-900/20 p-4">
                    <h5 className="text-[9px] font-bold uppercase text-slate-500">Present</h5>
                    <h4 className="mt-1 text-xl font-bold text-white">--</h4>
                    <p className="mt-0.5 text-[9px] text-slate-500">Scanned QR</p>
                  </div>
                  <div className="border-slate-850 rounded-xl border bg-slate-900/20 p-4">
                    <h5 className="text-[9px] font-bold uppercase text-slate-500">Absent</h5>
                    <h4 className="mt-1 text-xl font-bold text-slate-400">--</h4>
                    <p className="mt-0.5 text-[9px] text-slate-500">Pending</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-lg border border-indigo-500/10 bg-indigo-600/5 p-4 text-[11px] text-indigo-400">
                  <AlertCircle className="h-5 w-5 shrink-0 text-indigo-400" />
                  <span>
                    QR scan capture, Facial recognition checks, and location coordinates geofence
                    validation modules will be active once QR generation code is deployed in the
                    next branch.
                  </span>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

export default function ActiveSessionPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <ActiveSessionContent />
    </ProtectedRoute>
  );
}
