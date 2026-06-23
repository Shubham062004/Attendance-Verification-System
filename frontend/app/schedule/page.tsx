"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import {
  Shield,
  Clock,
  QrCode,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
  LogOut,
  ChevronLeft,
  Wifi,
} from "lucide-react";

// ── Session definitions ─────────────────────────────────────────────────────
interface SessionSlot {
  id: string;
  label: string;
  timeRange: string;
  startMinutes: number; // minutes since midnight
  endMinutes: number;
}

const SESSION_SLOTS: SessionSlot[] = [
  { id: "s1", label: "Session 1", timeRange: "10:00 – 11:00", startMinutes: 600, endMinutes: 660 },
  { id: "s2", label: "Session 2", timeRange: "11:00 – 12:00", startMinutes: 660, endMinutes: 720 },
  { id: "s3", label: "Session 3", timeRange: "12:00 – 13:00", startMinutes: 720, endMinutes: 780 },
  { id: "s4", label: "Session 4", timeRange: "14:00 – 15:00", startMinutes: 840, endMinutes: 900 },
  { id: "s5", label: "Session 5", timeRange: "15:00 – 16:00", startMinutes: 900, endMinutes: 960 },
];

type SessionStatus = "live" | "completed" | "upcoming";

interface SessionWithStatus extends SessionSlot {
  status: SessionStatus;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function computeStatuses(nowMinutes: number): SessionWithStatus[] {
  return SESSION_SLOTS.map((slot) => {
    let status: SessionStatus;
    if (nowMinutes >= slot.startMinutes && nowMinutes < slot.endMinutes) {
      status = "live";
    } else if (nowMinutes >= slot.endMinutes) {
      status = "completed";
    } else {
      status = "upcoming";
    }
    return { ...slot, status };
  });
}

function formatCurrentTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── Main content ─────────────────────────────────────────────────────────────
function ScheduleContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [sessions, setSessions] = useState<SessionWithStatus[]>(() =>
    computeStatuses(getNowMinutes()),
  );
  const [currentTime, setCurrentTime] = useState(() => formatCurrentTime(new Date()));

  const refresh = useCallback(() => {
    const now = new Date();
    setSessions(computeStatuses(getNowMinutes()));
    setCurrentTime(formatCurrentTime(now));
  }, []);

  // Update every 30 seconds
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const liveSession = sessions.find((s) => s.status === "live");
  const nextSession = sessions.find((s) => s.status === "upcoming");

  const handleSessionClick = (slot: SessionWithStatus) => {
    if (slot.status !== "live") return;
    router.push(`/attendance/scan`);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="bg-blue-600/6 absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[100px]" />
      </div>

      {/* ── Top Nav ── */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-400 transition hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/15">
                <Shield className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none text-white">SmartAttend</p>
                <p className="text-[10px] text-slate-500">Today's Schedule</p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* ── Student info card ── */}
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-500/20 bg-blue-600/20 text-sm font-bold text-blue-400">
              {user?.name?.charAt(0)?.toUpperCase() ?? "S"}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{user?.name ?? "Student"}</p>
              <p className="text-xs text-slate-500">{user?.registration_number ?? user?.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Live Time
            </p>
            <p className="flex items-center gap-1 text-sm font-bold text-white">
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              {currentTime}
            </p>
          </div>
        </div>

        {/* ── Section header ── */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
            <CalendarDays className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Today's Attendance Schedule</h1>
            <p className="text-xs text-slate-500">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* ── No active session banner ── */}
        {!liveSession && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 px-5 py-4">
            <Clock className="h-5 w-5 shrink-0 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-300">No Active Session</p>
              {nextSession ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  Next Session:{" "}
                  <span className="font-semibold text-slate-300">{nextSession.timeRange}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-500">All sessions completed for today.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Session cards ── */}
        <div className="space-y-3">
          {sessions.map((slot) => {
            const isLive = slot.status === "live";
            const isCompleted = slot.status === "completed";

            return (
              <div
                key={slot.id}
                onClick={() => handleSessionClick(slot)}
                className={[
                  "group relative overflow-hidden rounded-2xl border transition-all duration-300",
                  isLive
                    ? "cursor-pointer border-blue-500/50 bg-slate-900 shadow-xl shadow-blue-500/15 ring-1 ring-blue-500/20 hover:border-blue-400/60 hover:shadow-blue-500/25"
                    : isCompleted
                      ? "cursor-default border-slate-800/50 bg-slate-900/30 opacity-60"
                      : "cursor-default border-slate-800 bg-slate-900/50",
                ].join(" ")}
              >
                {/* Live glow overlay */}
                {isLive && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-transparent" />
                )}

                <div className="relative flex items-center gap-4 p-5">
                  {/* Icon */}
                  <div
                    className={[
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border",
                      isLive
                        ? "border-blue-500/30 bg-blue-600/15 shadow-lg shadow-blue-500/20"
                        : isCompleted
                          ? "border-slate-700/60 bg-slate-800/50"
                          : "border-slate-700 bg-slate-800/50",
                    ].join(" ")}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <QrCode
                        className={`h-5 w-5 ${isLive ? "text-blue-400" : "text-slate-500"}`}
                      />
                    )}
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <p
                        className={`text-base font-bold ${isLive ? "text-white" : isCompleted ? "text-slate-400" : "text-slate-300"}`}
                      >
                        {slot.label}
                      </p>
                    </div>
                    <p className={`text-sm ${isLive ? "text-blue-300" : "text-slate-500"}`}>
                      {slot.timeRange}
                    </p>
                  </div>

                  {/* Badge + arrow */}
                  <div className="flex shrink-0 items-center gap-3">
                    {isLive && (
                      <div className="flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-400">
                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-400" />
                        LIVE NOW
                      </div>
                    )}
                    {isCompleted && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-500">
                        Completed
                      </span>
                    )}
                    {slot.status === "upcoming" && (
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-500">
                        Upcoming
                      </span>
                    )}
                    {isLive && (
                      <ArrowRight className="h-4 w-4 text-blue-400 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </div>
                </div>

                {/* Live CTA footer */}
                {isLive && (
                  <div className="relative border-t border-blue-500/20 bg-blue-600/5 px-5 py-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                      <QrCode className="h-3.5 w-3.5" />
                      Tap to open QR scanner and mark attendance
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer note ── */}
        <p className="mt-8 text-center text-xs text-slate-600">
          Session status updates automatically every 30 seconds based on your device clock.
        </p>
      </main>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <ProtectedRoute allowedRoles={["Student", "Developer"]}>
      <ScheduleContent />
    </ProtectedRoute>
  );
}
