"use client";

import React from "react";
import { useAuth } from "../../context/AuthContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { ShieldAlert, LogOut, ShieldCheck, Terminal, Clock } from "lucide-react";

function DeveloperDashboardContent() {
  const { user, logout, developerTimeRemaining } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
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
