"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { apiService, EODReportResponse, AttendanceSummaryResponse, EODReportStudentItem } from "../../../services/api";
import {
  Shield,
  LogOut,
  LayoutDashboard,
  Users,
  Calendar,
  AlertCircle,
  FileDown,
  Loader2,
  FileSpreadsheet,
  FileText,
  FileCode,
  TrendingUp,
  TrendingDown,
  Percent,
  CheckCircle,
  XCircle,
  BarChart3,
} from "lucide-react";

function ReportsDashboardContent() {
  const { user, logout } = useAuth();
  
  // Date selector (default to today's date formatted as YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [eodData, setEodData] = useState<EODReportResponse | null>(null);
  const [summaryData, setSummaryData] = useState<AttendanceSummaryResponse | null>(null);
  const [loadingEod, setLoadingEod] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [exportState, setExportState] = useState<{
    format: "csv" | "excel" | "pdf" | null;
    status: "idle" | "preparing" | "downloading" | "done" | "error";
    progress: number;
    errorMsg?: string;
  }>({ format: null, status: "idle", progress: 0 });

  // Fetch EOD data
  const fetchEodReport = async (dateStr: string) => {
    try {
      setLoadingEod(true);
      const data = await apiService.getEodReport(dateStr);
      setEodData(data);
    } catch (err: any) {
      console.error("Error fetching EOD report:", err);
    } finally {
      setLoadingEod(false);
    }
  };

  // Fetch general summary metrics
  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const data = await apiService.getSummaryMetrics();
      setSummaryData(data);
    } catch (err: any) {
      console.error("Error fetching summary metrics:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchEodReport(selectedDate);
    }
  }, [selectedDate]);

  // Export handle
  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      setExportState({ format, status: "preparing", progress: 10 });
      
      // Simulate progress for visual excellence
      const interval = setInterval(() => {
        setExportState((prev) => {
          if (prev.progress >= 90) {
            clearInterval(interval);
            return prev;
          }
          return { ...prev, progress: prev.progress + 25 };
        });
      }, 150);

      const blob = await apiService.downloadReport(format, selectedDate);
      clearInterval(interval);
      
      setExportState({ format, status: "downloading", progress: 100 });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const fileExtensions = { csv: "csv", excel: "xlsx", pdf: "pdf" };
      a.download = `Attendance_Report_${selectedDate}.${fileExtensions[format]}`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setExportState({ format, status: "done", progress: 100 });
      setTimeout(() => {
        setExportState({ format: null, status: "idle", progress: 0 });
      }, 2000);
    } catch (err: any) {
      setExportState({
        format,
        status: "error",
        progress: 0,
        errorMsg: err.message || "Failed to download file.",
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Glow Effects */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-1/4 bottom-0 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="glow-primary rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-2.5">
              <Shield className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Attendance Export Center</h1>
              <p className="text-xs text-slate-400">Generate, view, and export dynamic attendance sheets</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Navigation Sidebar */}
          <div className="space-y-6">
            <div className="glass-panel space-y-1 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <Link href="/admin" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard Overview</span>
              </Link>
              <Link href="/admin/attendance" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200">
                <Users className="h-4 w-4" />
                <span>Manage Attendance</span>
              </Link>
              <Link href="/admin/history" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200">
                <Calendar className="h-4 w-4" />
                <span>Student History</span>
              </Link>
              <Link href="/admin/reports" className="flex w-full items-center gap-3 rounded-lg bg-indigo-600/10 px-3 py-2.5 text-xs font-bold text-indigo-400 transition">
                <BarChart3 className="h-4 w-4" />
                <span>Reports & Exports</span>
              </Link>
              <Link href="/admin/audit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-200">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span>Audit Logs</span>
              </Link>
            </div>

            {/* Quick Summary Cards (Sidebar Links) */}
            <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Report Types</h4>
              <div className="space-y-2">
                <Link
                  href="/admin/reports/sessions"
                  className="block rounded-lg border border-slate-900 bg-slate-950/60 p-2.5 text-xs text-slate-300 hover:border-slate-800 hover:text-white transition"
                >
                  <p className="font-bold">Session Reports</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Stats of individual slots</p>
                </Link>
                <Link
                  href="/admin/reports/students"
                  className="block rounded-lg border border-slate-900 bg-slate-950/60 p-2.5 text-xs text-slate-300 hover:border-slate-800 hover:text-white transition"
                >
                  <p className="font-bold">Student Reports</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Average metrics per student</p>
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-6 md:col-span-3">
            {/* Global Summary Stats */}
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {loadingSummary ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-4 animate-pulse h-20" />
                ))
              ) : summaryData ? (
                <>
                  <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[9px] font-bold uppercase tracking-wider">Highest Att%</span>
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </div>
                    <h3 className="mt-2 text-base font-extrabold text-white">
                      {Math.round(summaryData.highest_attendance_pct)}%
                    </h3>
                    <p className="text-[8px] text-slate-400 truncate mt-0.5">
                      {summaryData.highest_attendance_student || "None"}
                    </p>
                  </div>

                  <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[9px] font-bold uppercase tracking-wider">Lowest Att%</span>
                      <TrendingDown className="h-4 w-4 text-rose-400" />
                    </div>
                    <h3 className="mt-2 text-base font-extrabold text-white">
                      {Math.round(summaryData.lowest_attendance_pct)}%
                    </h3>
                    <p className="text-[8px] text-slate-400 truncate mt-0.5">
                      {summaryData.lowest_attendance_student || "None"}
                    </p>
                  </div>

                  <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[9px] font-bold uppercase tracking-wider">Average Att%</span>
                      <Percent className="h-4 w-4 text-indigo-400" />
                    </div>
                    <h3 className="mt-2 text-base font-extrabold text-white">
                      {Math.round(summaryData.average_attendance_pct)}%
                    </h3>
                    <p className="text-[8px] text-slate-500 mt-0.5">All-time average</p>
                  </div>

                  <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[9px] font-bold uppercase tracking-wider">Total Present</span>
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    </div>
                    <h3 className="mt-2 text-base font-extrabold text-white">
                      {summaryData.total_present}
                    </h3>
                    <p className="text-[8px] text-slate-500 mt-0.5">Records marked present</p>
                  </div>

                  <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[9px] font-bold uppercase tracking-wider">Total Absent</span>
                      <XCircle className="h-4 w-4 text-rose-400" />
                    </div>
                    <h3 className="mt-2 text-base font-extrabold text-white">
                      {summaryData.total_absent}
                    </h3>
                    <p className="text-[8px] text-slate-500 mt-0.5">Records marked absent</p>
                  </div>
                </>
              ) : null}
            </section>

            {/* Date Picker & Export Center panel */}
            <section className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daily EOD Report Export</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select a date to preview attendance and generate downloads</p>
                </div>
                
                {/* Custom Styled Date Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold">Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Download Buttons Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => handleExport("csv")}
                  disabled={exportState.status !== "idle" && exportState.status !== "done"}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs font-bold text-slate-200 transition hover:bg-slate-900 hover:border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <FileCode className="h-5 w-5 text-indigo-400" />
                  <div className="text-left">
                    <p className="font-semibold text-white">Export CSV</p>
                    <p className="text-[9px] text-slate-500 font-normal">Excel-compatible plain text</p>
                  </div>
                </button>

                <button
                  onClick={() => handleExport("excel")}
                  disabled={exportState.status !== "idle" && exportState.status !== "done"}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs font-bold text-slate-200 transition hover:bg-slate-900 hover:border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                  <div className="text-left">
                    <p className="font-semibold text-white">Export Excel</p>
                    <p className="text-[9px] text-slate-500 font-normal">Styled workbook with widths</p>
                  </div>
                </button>

                <button
                  onClick={() => handleExport("pdf")}
                  disabled={exportState.status !== "idle" && exportState.status !== "done"}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs font-bold text-slate-200 transition hover:bg-slate-900 hover:border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <FileText className="h-5 w-5 text-rose-400" />
                  <div className="text-left">
                    <p className="font-semibold text-white">Export PDF</p>
                    <p className="text-[9px] text-slate-500 font-normal">Professional printable layout</p>
                  </div>
                </button>
              </div>

              {/* Export Status / Progress Bar */}
              {exportState.status !== "idle" && (
                <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-300">
                      {exportState.status === "preparing" && "Assembling data..."}
                      {exportState.status === "downloading" && "Downloading file..."}
                      {exportState.status === "done" && "Export complete!"}
                      {exportState.status === "error" && "Export failed"}
                    </span>
                    <span className="text-slate-400">{exportState.progress}%</span>
                  </div>
                  
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        exportState.status === "error" ? "bg-rose-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${exportState.progress}%` }}
                    />
                  </div>

                  {exportState.status === "error" && (
                    <p className="text-[10px] text-rose-400 mt-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{exportState.errorMsg}</span>
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Preview Sheet before export */}
            <section className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Report Preview Sheet</h3>
              
              {loadingEod ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                </div>
              ) : eodData && eodData.records.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-900">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-950/60 font-semibold text-slate-400">
                        <th className="p-3 text-center w-12">S.No</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Reg No</th>
                        <th className="p-3 text-center">10-11</th>
                        <th className="p-3 text-center">11-12</th>
                        <th className="p-3 text-center">12-13</th>
                        <th className="p-3 text-center">14-15</th>
                        <th className="p-3 text-center">15-16</th>
                        <th className="p-3 text-center font-bold">Att %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      {eodData.records.map((row: EODReportStudentItem) => (
                        <tr key={row.s_no} className="hover:bg-slate-900/40 transition">
                          <td className="p-3 text-center text-slate-500">{row.s_no}</td>
                          <td className="p-3 font-semibold text-white">{row.student_name}</td>
                          <td className="p-3 text-slate-400">{row.registration_number}</td>
                          
                          {/* Slot Columns */}
                          {[row.slot_10_11, row.slot_11_12, row.slot_12_13, row.slot_14_15, row.slot_15_16].map((slotVal, sIdx) => (
                            <td key={sIdx} className="p-3 text-center">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  slotVal === "Present"
                                    ? "bg-emerald-950/30 text-emerald-400 border border-emerald-800/20"
                                    : slotVal === "Absent"
                                    ? "bg-rose-950/30 text-rose-400 border border-rose-800/20"
                                    : "bg-slate-900/40 text-slate-500"
                                }`}
                              >
                                {slotVal}
                              </span>
                            </td>
                          ))}

                          <td className="p-3 text-center font-extrabold text-indigo-400">{row.attendance_percentage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2 border border-dashed border-slate-900 rounded-xl">
                  <AlertCircle className="h-8 w-8 text-slate-600" />
                  <p className="text-xs">No attendance session data exists for the selected date.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsDashboard() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <ReportsDashboardContent />
    </ProtectedRoute>
  );
}
