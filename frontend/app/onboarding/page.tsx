"use client";

import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { Shield, Loader2, Sparkles, AlertCircle, CheckCircle } from "lucide-react";

function OnboardingContent() {
  const { user, onboardStudent, logout, loading } = useAuth();
  const [regNumber, setRegNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSuccess(false);

    const formattedReg = regNumber.trim();
    if (!formattedReg) {
      setError("Registration number is required.");
      return;
    }

    // Basic alphanumeric regex validation
    if (!/^[a-zA-Z0-9-/]+$/.test(formattedReg)) {
      setError("Registration number can only contain letters, numbers, hyphens, and slashes.");
      return;
    }

    try {
      await onboardStudent(formattedReg);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to save registration number. It may be duplicate.");
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
            <Sparkles className="h-6 w-6 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Student Onboarding</h2>
          <p className="mt-2 text-sm text-slate-400">
            Welcome,{" "}
            <span className="font-semibold text-blue-400">{user?.name || user?.email}</span>. Please
            complete your profile to continue.
          </p>
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
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span>Profile successfully completed! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="reg-number"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Registration Number
            </label>
            <input
              id="reg-number"
              type="text"
              required
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. 2026/CSE/1024"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              disabled={loading || isSuccess}
            />
            <p className="text-[11px] text-slate-500">
              Enter your official university registration identifier. This cannot be changed later.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading || isSuccess}
              className="flex w-full cursor-pointer justify-center rounded-lg border border-blue-600 bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              <span>Save & Complete Profile</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="cursor-pointer py-2 text-center text-xs font-semibold text-slate-400 transition hover:text-slate-200"
            >
              Sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute allowedRoles={["Student"]}>
      <OnboardingContent />
    </ProtectedRoute>
  );
}
