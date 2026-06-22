"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { apiService, AttendanceSession } from "../../services/api";
import {
  ShieldAlert,
  LogOut,
  ShieldCheck,
  Terminal,
  Clock,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Plus,
  ArrowRight,
  Loader2,
} from "lucide-react";

function DeveloperDashboardContent() {
  const { user, logout, developerTimeRemaining } = useAuth();
  const [testSessions, setTestSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(false);

  const [validationToken, setValidationToken] = useState("");
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [qrOperationLoading, setQrOperationLoading] = useState<Record<number, boolean>>({});
  const [qrStatusText, setQrStatusText] = useState<Record<number, string>>({});

  const fetchTestSessions = async () => {
    try {
      const data = await apiService.listSessions({ size: 5 });
      setTestSessions(data);
    } catch (err) {
      console.error("Failed to list test sessions", err);
    }
  };

  useEffect(() => {
    fetchTestSessions();
  }, []);

  const handleCreateMock = async () => {
    setLoading(true);
    try {
      await apiService.createSession({
        title: "Mock Lecture Session",
        subject: "DEV-101 Sandbox",
        class_name: "L-301 Section B",
        description: "Auto-generated developer mock session for transition testing.",
      });
      fetchTestSessions();
    } catch (err) {
      console.error("Failed to create mock session", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id: number) => {
    try {
      await apiService.startSession(id);
      fetchTestSessions();
    } catch (err) {
      console.error("Failed to start session", err);
    }
  };

  const handleEnd = async (id: number) => {
    try {
      await apiService.endSession(id);
      fetchTestSessions();
    } catch (err) {
      console.error("Failed to end session", err);
    }
  };

  const handleReopen = async (id: number) => {
    try {
      await apiService.reopenSession(id);
      fetchTestSessions();
    } catch (err) {
      console.error("Failed to reopen session", err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiService.deleteSession(id);
      fetchTestSessions();
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleGenerateQr = async (id: number) => {
    setQrOperationLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await apiService.generateQr(id);
      setQrStatusText((prev) => ({ ...prev, [id]: `Token: ${res.token.substring(0, 10)}...` }));
      if (typeof window !== "undefined") {
        // Automatically pre-fill validation token input with newly generated QR token for testing convenience
        setValidationToken(res.token);
      }
      fetchTestSessions();
    } catch (err: any) {
      setQrStatusText((prev) => ({ ...prev, [id]: `Error: ${err.message}` }));
    } finally {
      setQrOperationLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleExpireQr = async (id: number) => {
    setQrOperationLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await apiService.expireQr(id);
      setQrStatusText((prev) => ({ ...prev, [id]: `Expired successfully!` }));
      fetchTestSessions();
    } catch (err: any) {
      setQrStatusText((prev) => ({ ...prev, [id]: `Error: ${err.message}` }));
    } finally {
      setQrOperationLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleValidateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationToken) return;
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await apiService.validateQr(validationToken);
      setValidationResult(res);
    } catch (err: any) {
      setValidationResult({ error: err.message });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-rose-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-1/4 -right-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="glow-primary rounded-xl border border-rose-500/20 bg-rose-600/10 p-2.5">
              <ShieldAlert className="h-7 w-7 text-rose-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Developer Testing Console
              </h1>
              <p className="text-xs text-slate-400">Temporary Access Control Bypass</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            <span>Terminate Session</span>
          </button>
        </header>

        {/* Main Console Box */}
        <main className="space-y-6">
          {/* Active Countdown */}
          <div className="glass-panel relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-rose-500/5 blur-2xl" />

            <div className="mx-auto mb-4 flex h-14 w-14 animate-pulse items-center justify-center rounded-full border border-rose-500/20 bg-rose-600/10">
              <Clock className="h-7 w-7 text-rose-400" />
            </div>

            <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">
              Developer Session Time Limit
            </h2>
            <div className="mt-2 font-mono text-5xl font-extrabold tracking-tight text-rose-500">
              {developerTimeRemaining !== null ? `${developerTimeRemaining}s` : "0s"}
            </div>
            <p className="mx-auto mt-3 max-w-sm text-xs text-slate-500">
              This developer token expires automatically after 30 seconds. You will be automatically
              signed out and redirected back to the login page.
            </p>
          </div>

          {/* Sandbox Transition Controllers */}
          <div className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Terminal className="h-4 w-4 text-indigo-400" />
                Session Transition Testing Sandbox
              </h3>
              <button
                onClick={handleCreateMock}
                disabled={loading}
                className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                <span>Create Mock Session</span>
              </button>
            </div>

            {testSessions.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">
                No test sessions generated yet.
              </p>
            ) : (
              <div className="space-y-3">
                {testSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-slate-900 bg-slate-950/60 p-3 transition hover:border-slate-800 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white">
                        {session.title}{" "}
                        <span className="text-[9px] font-normal text-slate-500">#{session.id}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Status:{" "}
                        <span className="font-semibold text-indigo-400">{session.status}</span>
                        {session.session_code && (
                          <>
                            {" "}
                            | Code:{" "}
                            <span className="font-mono font-bold text-blue-400">
                              {session.session_code}
                            </span>
                          </>
                        )}
                      </div>
                      {qrStatusText[session.id] && (
                        <div className="font-mono text-[9px] text-emerald-400">
                          {qrStatusText[session.id]}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                      {session.status === "DRAFT" && (
                        <button
                          onClick={() => handleStart(session.id)}
                          className="text-emerald-450 flex cursor-pointer items-center gap-0.5 text-[9px] font-bold hover:text-emerald-400"
                        >
                          <Play className="h-3 w-3" />
                          <span>Start</span>
                        </button>
                      )}
                      {(session.status === "ACTIVE" || session.status === "REOPENED") && (
                        <>
                          <button
                            onClick={() => handleGenerateQr(session.id)}
                            disabled={qrOperationLoading[session.id]}
                            className="flex cursor-pointer items-center gap-0.5 text-[9px] font-bold text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                          >
                            <Terminal className="h-3 w-3" />
                            <span>Gen QR</span>
                          </button>
                          <button
                            onClick={() => handleExpireQr(session.id)}
                            disabled={qrOperationLoading[session.id]}
                            className="flex cursor-pointer items-center gap-0.5 text-[9px] font-bold text-amber-500 hover:text-amber-400 disabled:opacity-50"
                          >
                            <Square className="h-3 w-3" />
                            <span>Force Expire</span>
                          </button>
                          <button
                            onClick={() => handleEnd(session.id)}
                            className="flex cursor-pointer items-center gap-0.5 text-[9px] font-bold text-rose-500 hover:text-rose-400"
                          >
                            <Square className="h-3 w-3" />
                            <span>End</span>
                          </button>
                        </>
                      )}
                      {session.status === "ENDED" && (
                        <button
                          onClick={() => handleReopen(session.id)}
                          className="flex cursor-pointer items-center gap-0.5 text-[9px] font-bold text-purple-400 hover:text-purple-300"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reopen</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="flex cursor-pointer items-center gap-0.5 text-[9px] font-bold text-slate-500 hover:text-slate-400"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end border-t border-slate-900/60 pt-2">
              <Link
                href="/admin/sessions"
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 transition hover:text-indigo-300"
              >
                <span>Open Main Sessions Console</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* QR Validation Simulator Form */}
          <div className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
            <h3 className="flex items-center gap-2 border-b border-slate-900 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              QR Token Validation Simulator
            </h3>

            <form onSubmit={handleValidateToken} className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  QR Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={validationToken}
                    onChange={(e) => setValidationToken(e.target.value)}
                    placeholder="Enter or paste generated QR token..."
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={validating || !validationToken}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {validating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>Validate</span>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {validationResult && (
              <div className="rounded-lg border border-slate-900 bg-slate-950/80 p-3 font-mono text-xs">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Validation Response
                </div>
                {validationResult.error ? (
                  <div className="text-rose-400">Error: {validationResult.error}</div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valid:</span>
                      <span
                        className={
                          validationResult.valid
                            ? "font-bold text-emerald-400"
                            : "font-bold text-rose-500"
                        }
                      >
                        {validationResult.valid ? "TRUE" : "FALSE"}
                      </span>
                    </div>
                    {validationResult.session_id && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Session ID:</span>
                          <span>{validationResult.session_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Title:</span>
                          <span>{validationResult.session_title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Subject:</span>
                          <span>{validationResult.subject}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Class Name:</span>
                          <span>{validationResult.class_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Teacher:</span>
                          <span>{validationResult.teacher_name}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Diagnostics Panel */}
          <div className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
            <h3 className="flex items-center gap-2 border-b border-slate-900 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Terminal className="h-4 w-4 text-indigo-400" />
              Diagnostics & Session Metadata
            </h3>

            <div className="space-y-3 font-mono text-xs text-slate-300">
              <div className="flex justify-between border-b border-slate-900/40 py-1">
                <span className="text-slate-500">Subject UID:</span>
                <span>{user?.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/40 py-1">
                <span className="text-slate-500">Security Scope:</span>
                <span className="font-semibold text-rose-400">{user?.role}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/40 py-1">
                <span className="text-slate-500">Client Environment:</span>
                <span>{typeof window !== "undefined" ? window.location.host : "Server"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Database Connection:</span>
                <span className="flex items-center gap-1 font-bold text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DeveloperPage() {
  return (
    <ProtectedRoute allowedRoles={["Developer"]}>
      <DeveloperDashboardContent />
    </ProtectedRoute>
  );
}
