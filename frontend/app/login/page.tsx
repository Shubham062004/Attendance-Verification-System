"use client";

import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Shield, Loader2, Chrome, Key, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { loginWithGoogle, loginAsDeveloper, loading } = useAuth();
  const [testEmail, setTestEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleGoogleLoginMock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSuccess(false);

    // Default mock email if empty
    const emailToUse = testEmail.trim() || "student@example.com";

    if (!emailToUse.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      // Create a mock google id token based on the name and email
      const name = emailToUse.split("@")[0];
      const mockToken = `mock_google_${name}_${emailToUse}`;
      await loginWithGoogle(mockToken);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please try again.");
    }
  };

  const handleDeveloperBypass = async () => {
    setError(null);
    setIsSuccess(false);
    try {
      await loginAsDeveloper();
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to log in as Developer.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-1/4 -right-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="glass-panel relative w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-8 backdrop-blur-md">
        {/* Header */}
        <div className="text-center">
          <div className="glow-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-600/10">
            <Shield className="h-6 w-6 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Sign In to Dashboard</h2>
          <p className="mt-2 text-sm text-slate-400">Smart Attendance Verification System</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="animate-fadeIn flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-600/10 p-4 text-xs text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {isSuccess && (
          <div className="animate-fadeIn flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-600/10 p-4 text-xs text-emerald-400">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <span>Login successful! Redirecting...</span>
          </div>
        )}

        {/* Testing Google OAuth Simulator */}
        <form onSubmit={handleGoogleLoginMock} className="mt-8 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email-address"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Sign In with Google (Simulation)
            </label>
            <div className="relative">
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. admin@example.com, student@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                disabled={loading || isSuccess}
              />
            </div>
            <p className="text-[10px] text-slate-500">
              * Enter <code className="text-blue-400">admin@example.com</code> to log in as Admin.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || isSuccess}
            className="group relative flex w-full cursor-pointer justify-center rounded-lg border border-blue-600 bg-blue-600 py-3 text-sm font-semibold text-white transition duration-150 ease-in-out hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            <span>Sign In with Google</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="border-slate-850 w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-950 px-2 font-semibold tracking-wider text-slate-500">
              Temporary Testing
            </span>
          </div>
        </div>

        {/* Developer Bypass */}
        <div className="space-y-4">
          <div className="border-slate-850 rounded-lg border bg-slate-900/30 p-4">
            <div className="flex gap-3">
              <Key className="h-5 w-5 shrink-0 text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Temporary Developer Bypass</h4>
                <p className="mt-1 text-[11px] text-slate-400">
                  Issues a Developer access session which expires in exactly 30 seconds for timeout
                  testing.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDeveloperBypass}
            disabled={loading || isSuccess}
            className="hover:bg-slate-850 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-slate-700 disabled:opacity-50"
          >
            <span>Run Developer Session (30s Expiry)</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
