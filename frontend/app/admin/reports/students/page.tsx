"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../../context/AuthContext";
import { ProtectedRoute } from "../../../../components/ProtectedRoute";
import { apiService, StudentHistoryResponse } from "../../../../services/api";
import {
  Shield,
  LogOut,
  Users,
  AlertCircle,
  Loader2,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  GraduationCap,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";

function StudentReportsContent() {
  const { logout } = useAuth();
  const [students, setStudents] = useState<StudentHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [minAttendance, setMinAttendance] = useState("0");
  const [maxAttendance, setMaxAttendance] = useState("100");

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getStudentsHistory();
      setStudents(data);
    } catch (err: any) {
      setError(err.message || "Failed to load students list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filtered students
  const filteredStudents = students.filter((s: StudentHistoryResponse) => {
    const matchesSearch =
      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.registration_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());

    const rate = Math.round(s.attendance_percentage);
    const matchesMin = rate >= parseInt(minAttendance || "0", 10);
    const matchesMax = rate <= parseInt(maxAttendance || "100", 10);

    return matchesSearch && matchesMin && matchesMax;
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Glows */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-1/4 bottom-0 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/reports"
              className="flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Student-wise Reports</h1>
              <p className="text-xs text-slate-400">
                Track and analyze individual student metrics and overall participation
              </p>
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
          {/* Filters Sidebar */}
          <div className="glass-panel space-y-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3 text-slate-300">
              <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Report Filters</h3>
            </div>

            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Search Student
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Name, registration #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Min Attendance Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Min Attendance</span>
                <span className="text-indigo-400">{minAttendance}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={minAttendance}
                onChange={(e) => setMinAttendance(e.target.value)}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-indigo-500"
              />
            </div>

            {/* Max Attendance Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Max Attendance</span>
                <span className="text-indigo-400">{maxAttendance}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={maxAttendance}
                onChange={(e) => setMaxAttendance(e.target.value)}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-indigo-500"
              />
            </div>
          </div>

          {/* Main Table Content */}
          <div className="space-y-6 md:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-900 py-12 text-slate-400">
                <AlertCircle className="h-10 w-10 text-rose-500" />
                <p className="text-sm">{error}</p>
                <button
                  onClick={fetchStudents}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
                >
                  Retry
                </button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-900 py-24 text-slate-500">
                <AlertCircle className="text-slate-650 h-8 w-8" />
                <p className="text-xs">No students match the criteria.</p>
              </div>
            ) : (
              <div className="glass-panel overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-950/60 font-semibold text-slate-400">
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Registration Number</th>
                        <th className="p-3 text-center">Present Count</th>
                        <th className="p-3 text-center">Absent Count</th>
                        <th className="p-3 text-center font-bold">Attendance %</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="transition hover:bg-slate-900/40">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-[10px] font-bold uppercase text-white">
                                {student.name ? student.name[0] : "S"}
                              </div>
                              <div>
                                <p className="font-semibold text-white">
                                  {student.name || "Unknown Student"}
                                </p>
                                <p className="text-[9px] text-slate-500">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-slate-450 p-3">
                            {student.registration_number || "N/A"}
                          </td>
                          <td className="p-3 text-center font-semibold text-emerald-400">
                            {student.present_count}
                          </td>
                          <td className="p-3 text-center font-semibold text-rose-400">
                            {student.absent_count}
                          </td>
                          <td className="p-3 text-center font-extrabold text-indigo-400">
                            {Math.round(student.attendance_percentage)}%
                          </td>
                          <td className="p-3 text-center">
                            <Link
                              href={`/admin/students/${student.id}`}
                              className="inline-block rounded border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            >
                              Profile Detail
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentReports() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <StudentReportsContent />
    </ProtectedRoute>
  );
}
