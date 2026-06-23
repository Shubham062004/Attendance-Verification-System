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
        dataList = hr.filter((a) => a.reviewed);
      } else if (filterStatus === "ALL") {
        const pending = await apiService.getPendingReviews();
        const hr = await apiService.getHighRiskAssessments();
        // Merge without duplicates
        const map = new Map<number, RiskAssessmentWithFlags>();
        pending.forEach((item) => map.set(item.id, item));
        hr.forEach((item) => map.set(item.id, item));
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
      (item.student_name &&
        item.student_name.toLowerCase().includes(searchStudent.toLowerCase())) ||
      (item.student_reg_number &&
        item.student_reg_number.toLowerCase().includes(searchStudent.toLowerCase()));

    const matchesLevel = filterLevel === "ALL" || item.risk_level === filterLevel;
    const matchesSession =
      filterSession === "ALL" || (item.session_title && item.session_title.includes(filterSession));

    return matchesStudent && matchesLevel && matchesSession;
  });

  // Extract unique sessions for filter dropdown
  const sessionsList = Array.from(
    new Set(assessments.map((a) => a.session_title).filter(Boolean)),
  ) as string[];

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "SAFE":
        return (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            SAFE
          </span>
        );
      case "REVIEW":
        return (
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
            REVIEW
          </span>
        );
      case "HIGH_RISK":
        return (
          <span className="animate-pulse rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
            HIGH RISK
          </span>
        );
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
        <header className="flex flex-col gap-4 border-b border-slate-900 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="glow-rose rounded-xl border border-rose-500/20 bg-rose-600/10 p-2.5">
              <ShieldAlert className="h-7 w-7 text-rose-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Risk Detection Control
              </h1>
              <p className="text-xs text-slate-400">
                Evaluate, audit, and review flagged student attendance
              </p>
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
        <section className="glass-panel space-y-4 rounded-2xl border border-dashed border-rose-500/30 bg-rose-950/5 p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Developer Simulation Panel
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Click a preset below to instantly simulate and evaluate different risk scenarios. This
            will automatically populate mock student and session entries in the system.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                id: "generic_review",
                name: "Mock Review Attendance",
                desc: "Late submission + poor GPS (+35)",
              },
              {
                id: "gps_failure",
                name: "Mock GPS Failure",
                desc: "Outside radius + high accuracy (+70)",
              },
              {
                id: "missing_verification",
                name: "Mock Missing Verification",
                desc: "Bypassed verification steps (+100)",
              },
              {
                id: "high_risk",
                name: "Mock High Risk Attendance",
                desc: "Outside radius + no blink/smile (+150)",
              },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleMockScenario(preset.id)}
                disabled={mockingScenario !== null}
                className="group flex cursor-pointer flex-col items-start rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 text-left transition hover:border-rose-500/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-bold text-white transition group-hover:text-rose-400">
                    {preset.name}
                  </span>
                  {mockingScenario === preset.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
                  ) : (
                    <Play className="h-3 w-3 text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-rose-400" />
                  )}
                </div>
                <span className="mt-1 text-[10px] text-slate-500">{preset.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Stats Grid */}
        {stats && (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: "Total Safe",
                value: stats.total_safe,
                icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
                border: "border-slate-800",
                bg: "bg-slate-900/30",
              },
              {
                label: "Needs Review",
                value: stats.total_review,
                icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
                border: "border-amber-500/20",
                bg: "bg-amber-950/20",
              },
              {
                label: "High Risk",
                value: stats.total_high_risk,
                icon: <AlertCircle className="h-4 w-4 text-rose-400" />,
                border: "border-rose-500/20",
                bg: "bg-rose-950/20 animate-pulse",
              },
              {
                label: "Pending Review",
                value: stats.pending_reviews,
                icon: <Clock className="h-4 w-4 text-indigo-400" />,
                border: "border-indigo-500/20",
                bg: "bg-indigo-950/20",
              },
            ].map((stat, idx) => (
              <div key={idx} className={`rounded-2xl border p-5 ${stat.border} ${stat.bg}`}>
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {stat.label}
                  </span>
                  {stat.icon}
                </div>
                <h3 className="mt-4 text-3xl font-extrabold text-white">{stat.value}</h3>
              </div>
            ))}
          </section>
        )}

        {/* Filters and Search */}
        <section className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Search Student..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-4 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Risk Level */}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Filter className="h-4 w-4 text-slate-500" />
              </span>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-4 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="SAFE">Safe</option>
                <option value="REVIEW">Needs Review</option>
                <option value="HIGH_RISK">High Risk</option>
              </select>
            </div>

            {/* Review Status */}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <UserCheck className="h-4 w-4 text-slate-500" />
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-4 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="PENDING">Pending Review</option>
                <option value="REVIEWED">Reviewed / Resolved</option>
                <option value="ALL">All Records</option>
              </select>
            </div>

            {/* Session */}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Clock className="h-4 w-4 text-slate-500" />
              </span>
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-4 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
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
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-sm font-bold text-white">Evaluated Attendance Submissions</h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-xs text-slate-500">Loading risk assessments...</p>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <CheckCircle className="h-10 w-10 text-slate-700" />
              <p className="text-sm font-bold text-slate-400">All clear!</p>
              <p className="max-w-sm text-xs text-slate-600">
                No attendance records match the selected filters or require review.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-900/30 font-semibold uppercase tracking-wider text-slate-400">
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
                    <tr key={item.id} className="transition hover:bg-slate-900/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-white">
                            {item.student_name || "Unknown Student"}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {item.student_reg_number || `ID: ${item.reviewed_by || "Unknown"}`}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-200">
                            {item.session_title || "Mock Session"}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            ID #{item.attendance_record_id}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-sm font-extrabold ${getScoreColor(item.risk_score)}`}
                        >
                          {item.risk_score}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getRiskBadge(item.risk_level)}</td>
                      <td className="max-w-xs px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {item.flags && item.flags.length > 0 ? (
                            item.flags.map((f, idx) => (
                              <span
                                key={idx}
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                  f.severity === "HIGH"
                                    ? "border border-rose-800/40 bg-rose-900/40 text-rose-400"
                                    : f.severity === "MEDIUM"
                                      ? "border border-amber-800/40 bg-amber-900/40 text-amber-400"
                                      : "bg-slate-900 text-slate-400"
                                }`}
                                title={f.flag_reason}
                              >
                                {f.flag_type}
                              </span>
                            ))
                          ) : (
                            <span className="font-semibold text-slate-600">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="space-x-1.5 whitespace-nowrap px-6 py-4 text-right">
                        {!item.reviewed && (
                          <>
                            <button
                              onClick={() => handleQuickApprove(item.id)}
                              className="cursor-pointer rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-bold text-emerald-400 hover:bg-emerald-500/20"
                              title="Approve Attendance"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleQuickReject(item.id)}
                              className="cursor-pointer rounded border border-rose-500/20 bg-rose-500/10 px-2 py-1 font-bold text-rose-400 hover:bg-rose-500/20"
                              title="Reject Attendance"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <Link
                          href={`/admin/risk/${item.attendance_record_id}`}
                          className="inline-flex items-center gap-0.5 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 font-semibold text-slate-300 hover:bg-slate-800"
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
