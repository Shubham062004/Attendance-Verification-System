"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { apiService, RiskAssessmentWithFlags, RiskOverviewStats } from "../../../services/api";
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  UserCheck,
} from "lucide-react";

function AdminRiskDashboardContent() {
  const [assessments, setAssessments] = useState<RiskAssessmentWithFlags[]>([]);
  const [stats, setStats] = useState<RiskOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchStudent, setSearchStudent] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [filterSession, setFilterSession] = useState<string>("ALL");

  // Developer panel loading states
  const [mockingScenario, setMockingScenario] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch stats
      const statsData = await apiService.getRiskOverview();
      setStats(statsData);

      // Fetch all assessments pending review or high risk
      // For a comprehensive overview, we fetch the pending reviews list
      const list = await apiService.getPendingReviews();
      
      // If user wants reviewed ones as well, we can dynamically load them
      // In this case, we load pending reviews by default, but if the status filter is set to "ALL" or "REVIEWED",
      // we'll fetch high-risk or just rely on what is pending/high-risk.
      // Let's create a robust query logic:
      let dataList: RiskAssessmentWithFlags[] = [];
      if (filterStatus === "REVIEWED") {
        // High risk might include some reviewed ones, or we can fetch high-risk
        const hr = await apiService.getHighRiskAssessments();
        dataList = hr.filter(a => a.reviewed);
      } else if (filterStatus === "ALL") {
        const pending = await apiService.getPendingReviews();
        const hr = await apiService.getHighRiskAssessments();
        // Merge without duplicates
        const map = new Map<number, RiskAssessmentWithFlags>();
        pending.forEach(item => map.set(item.id, item));
        hr.forEach(item => map.set(item.id, item));
        dataList = Array.from(map.values());
      } else {
        dataList = await apiService.getPendingReviews();
      }

      setAssessments(dataList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load risk dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const handleMockScenario = async (scenario: string) => {
    try {
      setMockingScenario(scenario);
      await apiService.evaluateRisk(1); // Ensure mock client has endpoint or call it
      // Let's call /risk/mock-scenario using fetch directly since it's a developer helper
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/risk/mock-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scenario_type: scenario }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate mock scenario");
      }

      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setMockingScenario(null);
    }
  };

  const handleQuickApprove = async (id: number) => {
    try {
      await apiService.reviewRiskAssessment(id, "PRESENT", "Quick Approved from Dashboard");
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const handleQuickReject = async (id: number) => {
    try {
      await apiService.reviewRiskAssessment(id, "REJECTED", "Quick Rejected from Dashboard");
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Reject failed");
    }
  };

  // Filtered list
  const filteredAssessments = assessments.filter((item) => {
    const matchesStudent =
      !searchStudent ||
      (item.student_name && item.student_name.toLowerCase().includes(searchStudent.toLowerCase())) ||
      (item.student_reg_number && item.student_reg_number.toLowerCase().includes(searchStudent.toLowerCase()));

    const matchesLevel = filterLevel === "ALL" || item.risk_level === filterLevel;
    const matchesSession =
      filterSession === "ALL" || (item.session_title && item.session_title.includes(filterSession));

    return matchesStudent && matchesLevel && matchesSession;
  });

  // Extract unique sessions for filter dropdown
  const sessionsList = Array.from(
    new Set(assessments.map((a) => a.session_title).filter(Boolean))
  ) as string[];

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "SAFE":
        return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">SAFE</span>;
      case "REVIEW":
        return <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">REVIEW</span>;
      case "HIGH_RISK":
        return <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 animate-pulse">HIGH RISK</span>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-rose-400";
    if (score >= 30) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className="relative min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-rose-600/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-1/4 bottom-0 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="glow-rose rounded-xl border border-rose-500/20 bg-rose-600/10 p-2.5">
              <ShieldAlert className="h-7 w-7 text-rose-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Risk Detection Control</h1>
              <p className="text-xs text-slate-400">Evaluate, audit, and review flagged student attendance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Console Home
            </Link>
            <button
              onClick={fetchData}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Developer Mocking Panel */}
        <section className="glass-panel rounded-2xl border border-dashed border-rose-500/30 bg-rose-950/5 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Developer Simulation Panel</h2>
          </div>
          <p className="text-xs text-slate-400">
            Click a preset below to instantly simulate and evaluate different risk scenarios. This will automatically populate mock student and session entries in the system.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: "generic_review", name: "Mock Review Attendance", desc: "Late submission + poor GPS (+35)" },
              { id: "gps_failure", name: "Mock GPS Failure", desc: "Outside radius + high accuracy (+70)" },
              { id: "missing_verification", name: "Mock Missing Verification", desc: "Bypassed verification steps (+100)" },
              { id: "high_risk", name: "Mock High Risk Attendance", desc: "Outside radius + no blink/smile (+150)" },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleMockScenario(preset.id)}
                disabled={mockingScenario !== null}
                className="flex flex-col items-start text-left p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 transition hover:border-rose-500/40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-white group-hover:text-rose-400 transition">{preset.name}</span>
                  {mockingScenario === preset.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
                  ) : (
                    <Play className="h-3 w-3 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1">{preset.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Stats Grid */}
        {stats && (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Safe", value: stats.total_safe, icon: <CheckCircle className="h-4 w-4 text-emerald-400" />, border: "border-slate-800", bg: "bg-slate-900/30" },
              { label: "Needs Review", value: stats.total_review, icon: <AlertTriangle className="h-4 w-4 text-amber-400" />, border: "border-amber-500/20", bg: "bg-amber-950/20" },
              { label: "High Risk", value: stats.total_high_risk, icon: <AlertCircle className="h-4 w-4 text-rose-400" />, border: "border-rose-500/20", bg: "bg-rose-950/20 animate-pulse" },
              { label: "Pending Review", value: stats.pending_reviews, icon: <Clock className="h-4 w-4 text-indigo-400" />, border: "border-indigo-500/20", bg: "bg-indigo-950/20" },
            ].map((stat, idx) => (
              <div key={idx} className={`rounded-2xl border p-5 ${stat.border} ${stat.bg}`}>
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
                  {stat.icon}
                </div>
                <h3 className="mt-4 text-3xl font-extrabold text-white">{stat.value}</h3>
              </div>
            ))}
          </section>
        )}

        {/* Filters and Search */}
        <section className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Search Student..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Risk Level */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-slate-500" />
              </span>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="SAFE">Safe</option>
                <option value="REVIEW">Needs Review</option>
                <option value="HIGH_RISK">High Risk</option>
              </select>
            </div>

            {/* Review Status */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserCheck className="h-4 w-4 text-slate-500" />
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="PENDING">Pending Review</option>
                <option value="REVIEWED">Reviewed / Resolved</option>
                <option value="ALL">All Records</option>
              </select>
            </div>

            {/* Session */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="h-4 w-4 text-slate-500" />
              </span>
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="ALL">All Sessions</option>
                {sessionsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Flagged Records Table */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-sm font-bold text-white">Evaluated Attendance Submissions</h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-xs text-slate-500">Loading risk assessments...</p>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <CheckCircle className="h-10 w-10 text-slate-700" />
              <p className="text-sm text-slate-400 font-bold">All clear!</p>
              <p className="text-xs text-slate-600 max-w-sm">No attendance records match the selected filters or require review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-900/30 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Session</th>
                    <th className="px-6 py-3.5 text-center">Score</th>
                    <th className="px-6 py-3.5">Risk Level</th>
                    <th className="px-6 py-3.5">Flags</th>
                    <th className="px-6 py-3.5">Created At</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {filteredAssessments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/30 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-white">{item.student_name || "Unknown Student"}</p>
                          <p className="text-[10px] text-slate-500">{item.student_reg_number || `ID: ${item.reviewed_by || "Unknown"}`}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-200">{item.session_title || "Mock Session"}</p>
                          <p className="text-[10px] text-slate-500">ID #{item.attendance_record_id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-extrabold ${getScoreColor(item.risk_score)}`}>
                          {item.risk_score}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getRiskBadge(item.risk_level)}</td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {item.flags && item.flags.length > 0 ? (
                            item.flags.map((f, idx) => (
                              <span
                                key={idx}
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                  f.severity === "HIGH"
                                    ? "bg-rose-900/40 text-rose-400 border border-rose-800/40"
                                    : f.severity === "MEDIUM"
                                    ? "bg-amber-900/40 text-amber-400 border border-amber-800/40"
                                    : "bg-slate-900 text-slate-400"
                                }`}
                                title={f.flag_reason}
                              >
                                {f.flag_type}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 font-semibold">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {!item.reviewed && (
                          <>
                            <button
                              onClick={() => handleQuickApprove(item.id)}
                              className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/20 cursor-pointer"
                              title="Approve Attendance"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleQuickReject(item.id)}
                              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold border border-rose-500/20 cursor-pointer"
                              title="Reject Attendance"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <Link
                          href={`/admin/risk/${item.attendance_record_id}`}
                          className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold"
                        >
                          <span>Review</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminRiskDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <AdminRiskDashboardContent />
    </ProtectedRoute>
  );
}
