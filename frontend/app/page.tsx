"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiService, HealthResponse } from "../services/api";
import { useAuth } from "../context/AuthContext";
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
  ArrowRight,
  Fingerprint,
  QrCode,
  MapPin,
  Lock,
} from "lucide-react";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

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
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Navigation */}
      <header className="mb-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="glow-primary rounded-xl border border-blue-500/20 bg-blue-600/10 p-2.5">
            <Shield className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Smart Attendance</h1>
            <p className="text-[10px] text-slate-400">Secure Verification System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={
              user
                ? user.role === "Admin"
                  ? "/admin"
                  : user.role === "Developer"
                    ? "/developer"
                    : "/student/profile"
                : "/login"
            }
            className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-600/10 px-4 py-2 text-xs font-semibold text-blue-400 transition hover:bg-blue-600/20"
          >
            <span>{user ? "Dashboard" : "Sign In"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="space-y-16">
        {/* Hero Section */}
        <section className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-600/10 px-3 py-1 text-xs font-medium text-blue-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
              Production Ready Auth Stack
            </span>
            <h2 className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent text-white sm:text-5xl lg:text-6xl">
              Anti-Proxy Attendance. Verified.
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-slate-400">
              Eliminate attendance fraud with cryptographically signed, location-locked verification
              sessions using modern authentication.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/login"
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <span>Launch App Console</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right column - Connection Monitor */}
          <div className="glass-panel glow-primary relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-md flex items-center gap-2 font-bold text-white">
                  <Activity className="h-4 w-4 animate-pulse text-blue-400" />
                  API Gateway & Database Monitor
                </h3>
                <button
                  onClick={fetchHealth}
                  disabled={loading}
                  className="cursor-pointer text-xs font-semibold text-blue-400 transition hover:text-blue-300 disabled:text-slate-600"
                >
                  Refresh
                </button>
              </div>

              <div className="border-slate-850 mb-6 flex flex-col items-center justify-center rounded-xl border bg-slate-950/80 p-4 py-6">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    <span className="text-xs text-slate-400">Querying backend...</span>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <XCircle className="h-8 w-8 text-rose-500" />
                    <span className="text-xs font-semibold text-rose-400">Connection Failed</span>
                    <span className="max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-slate-500">
                      {error}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-400">
                      Connected & Syncing
                    </span>
                    <span className="text-[10px] text-slate-500">{health?.service}</span>
                  </div>
                )}
              </div>

              {health && !loading && (
                <div className="space-y-2 border-t border-slate-900/60 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Database Connection</span>
                    <span className="font-mono font-medium text-emerald-400">
                      {health.database || "Connected"}
                    </span>
                  </div>
                  {health.timestamp && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Active Timestamp</span>
                      <span className="font-mono text-slate-400">
                        {new Date(health.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Benefits/Product Explanation Section */}
        <section className="space-y-8 border-t border-slate-900 pt-16">
          <div className="mx-auto max-w-xl space-y-3 text-center">
            <h3 className="text-2xl font-bold tracking-tight text-white">Security Features</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Designed from the ground up to prevent spoofing, bypass, and proxies.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-600/10">
                <QrCode className="h-5 w-5 text-blue-400" />
              </div>
              <h4 className="text-sm font-bold text-white">Dynamic Cryptographic QR</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                QR codes refresh rapidly with embedded timestamps to block simple photo sharing.
              </p>
            </div>

            <div className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-600/10">
                <Fingerprint className="h-5 w-5 text-indigo-400" />
              </div>
              <h4 className="text-sm font-bold text-white">Facial Matching Integration</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Biometric face check ensures the device owner is the student claiming credit.
              </p>
            </div>

            <div className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-600/10">
                <MapPin className="h-5 w-5 text-purple-400" />
              </div>
              <h4 className="text-sm font-bold text-white">Geofenced Authorization</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Location boundary validation checks if the request is placed within the physical
                classroom.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-slate-900 pt-8 text-[11px] text-slate-500 sm:flex-row">
        <p>© 2026 Smart Attendance Verification System. All rights reserved.</p>
        <div className="flex gap-4">
          <span className="cursor-pointer transition hover:text-slate-300">Repository</span>
          <span>•</span>
          <span className="cursor-pointer transition hover:text-slate-300">Security Protocol</span>
        </div>
      </footer>
    </main>
  );
}
