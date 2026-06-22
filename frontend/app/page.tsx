"use client";

import { useEffect, useState } from "react";
import { apiService, HealthResponse } from "../services/api";
import {
  Shield,
  Activity,
  Database,
  Layout,
  Settings,
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
} from "lucide-react";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || "Failed to connect to API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="glow-primary rounded-xl border border-blue-500/20 bg-blue-600/10 p-2.5">
            <Shield className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Smart Attendance</h1>
            <p className="text-xs text-slate-400">Project Setup & Architecture Branch</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-slate-300">v0.1.0-alpha</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="mb-auto grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column - Service status */}
        <div className="space-y-8 lg:col-span-2">
          <div className="glass-panel relative overflow-hidden rounded-2xl p-8">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />
            <h2 className="mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-extrabold text-transparent">
              Architecture & Foundation
            </h2>
            <p className="mb-8 max-w-xl text-slate-400">
              This environment represents the initial structure of the Smart Attendance Verification
              System, integrating Next.js 15, FastAPI, SQLAlchemy, and PostgreSQL.
            </p>

            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-200">
              Configured Project Components
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex gap-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                <Layout className="h-6 w-6 shrink-0 text-indigo-400" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Next.js 15 App Router</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    TypeScript, Tailwind CSS, shadcn skeleton directories initialized.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                <Server className="h-6 w-6 shrink-0 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-semibold text-white">FastAPI Application</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Structured modules, custom dependency injections, environments.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                <Database className="h-6 w-6 shrink-0 text-blue-400" />
                <div>
                  <h4 className="text-sm font-semibold text-white">PostgreSQL ORM</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    SQLAlchemy session management, models, migration baseline.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                <Settings className="h-6 w-6 shrink-0 text-purple-400" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Orchestration & Tooling</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Docker Compose, Linters (Ruff, ESLint, Prettier), GitHub templates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Connection monitor */}
        <div className="space-y-8">
          <div className="glass-panel glow-primary flex h-full min-h-[350px] flex-col justify-between rounded-2xl p-8">
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Activity className="h-5 w-5 text-blue-400" />
                  API Gateway Health
                </h3>
                <button
                  onClick={fetchHealth}
                  disabled={loading}
                  className="text-xs font-semibold text-blue-400 transition hover:text-blue-300 disabled:text-slate-600"
                >
                  Refresh
                </button>
              </div>

              <div className="mb-6 flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950/80 p-4 py-8">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="text-sm text-slate-400">Querying backend...</span>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <XCircle className="h-10 w-10 text-rose-500" />
                    <span className="text-sm font-semibold text-rose-400">Connection Failed</span>
                    <span className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-400">
                      {error}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-400">System Healthy</span>
                    <span className="text-xs text-slate-400">{health?.service}</span>
                  </div>
                )}
              </div>

              {health && !loading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Status</span>
                    <span className="font-mono font-medium uppercase text-emerald-400">
                      {health.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Database Connection</span>
                    <span className="font-mono font-medium text-emerald-400">
                      {health.database || "Connected"}
                    </span>
                  </div>
                  {health.timestamp && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Timestamp</span>
                      <span className="font-mono text-slate-300">
                        {new Date(health.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-800/80 pt-6">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>Docker-compose endpoint mapping ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 flex justify-between border-t border-slate-900 pt-8 text-xs text-slate-500">
        <p>© 2026 Smart Attendance Verification System. All rights reserved.</p>
        <div className="flex gap-4">
          <span className="cursor-pointer transition hover:text-slate-300">Repository</span>
          <span>•</span>
          <span className="cursor-pointer transition hover:text-slate-300">Architecture Spec</span>
        </div>
      </footer>
    </main>
  );
}
