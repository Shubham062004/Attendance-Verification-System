"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  QrCode,
  MapPin,
  Eye,
  Camera,
  AlertTriangle,
  FileText,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  Fingerprint,
  BookOpen,
  LogIn,
  Star,
  Zap,
  Lock,
} from "lucide-react";

// ── Security feature cards ─────────────────────────────────────────────────
const SECURITY_FEATURES = [
  {
    icon: QrCode,
    title: "Dynamic QR Verification",
    description:
      "Cryptographically signed QR codes rotate every session — photo sharing and replay attacks are blocked by design.",
    color: "blue",
  },
  {
    icon: MapPin,
    title: "Location Verification",
    description:
      "GPS geofencing ensures the student is physically inside the classroom radius before attendance is accepted.",
    color: "emerald",
  },
  {
    icon: Eye,
    title: "Blink & Smile Detection",
    description:
      "Real-time liveness checks confirm an actual person is present — not a photo, video, or deepfake.",
    color: "purple",
  },
  {
    icon: Camera,
    title: "Attendance Evidence Storage",
    description:
      "Selfie evidence is securely uploaded to cloud storage and linked to every attendance record.",
    color: "indigo",
  },
  {
    icon: AlertTriangle,
    title: "Risk Detection Engine",
    description:
      "Automated scoring flags suspicious patterns: out-of-range GPS, missing liveness steps, multiple attempts.",
    color: "orange",
  },
  {
    icon: FileText,
    title: "Audit Logging",
    description:
      "Every action — login, session creation, submission — is recorded with timestamps and actor details.",
    color: "rose",
  },
];

// ── How it works steps ─────────────────────────────────────────────────────
const STEPS = [
  {
    step: "01",
    icon: LogIn,
    title: "Login With Google",
    desc: "Authenticate securely with your institutional Google account.",
  },
  {
    step: "02",
    icon: BookOpen,
    title: "Choose Session",
    desc: "Select the current class session from your daily schedule.",
  },
  {
    step: "03",
    icon: QrCode,
    title: "Scan QR Code",
    desc: "Point your back camera at the session QR on the projector.",
  },
  {
    step: "04",
    icon: MapPin,
    title: "Verify Location",
    desc: "Your GPS coordinates are checked against the classroom boundary.",
  },
  {
    step: "05",
    icon: Fingerprint,
    title: "Liveness Check",
    desc: "Blink and smile to confirm you are physically present.",
  },
  {
    step: "06",
    icon: CheckCircle2,
    title: "Attendance Marked",
    desc: "Your verified attendance record is securely stored.",
  },
];

// ── Stats ──────────────────────────────────────────────────────────────────
const STATS = [
  { value: "99.9%", label: "Attendance Accuracy", icon: Star },
  { value: "0%", label: "Proxy Risk", icon: Shield },
  { value: "5", label: "Sessions Per Day", icon: Clock },
  { value: "256-bit", label: "Encrypted Records", icon: Lock },
];

// ── Color map ──────────────────────────────────────────────────────────────
const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  blue: {
    bg: "bg-blue-600/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    glow: "shadow-blue-500/20",
  },
  emerald: {
    bg: "bg-emerald-600/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/20",
  },
  purple: {
    bg: "bg-purple-600/10",
    border: "border-purple-500/20",
    text: "text-purple-400",
    glow: "shadow-purple-500/20",
  },
  indigo: {
    bg: "bg-indigo-600/10",
    border: "border-indigo-500/20",
    text: "text-indigo-400",
    glow: "shadow-indigo-500/20",
  },
  orange: {
    bg: "bg-orange-600/10",
    border: "border-orange-500/20",
    text: "text-orange-400",
    glow: "shadow-orange-500/20",
  },
  rose: {
    bg: "bg-rose-600/10",
    border: "border-rose-500/20",
    text: "text-rose-400",
    glow: "shadow-rose-500/20",
  },
};

export default function HomePage() {
  const { user } = useAuth();
  const featuresRef = useRef<HTMLElement>(null);

  const dashboardHref =
    user?.role === "Admin"
      ? "/admin"
      : user?.role === "Developer"
        ? "/developer"
        : user
          ? "/schedule"
          : "/login";

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Background decorations ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="bg-blue-600/8 absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[120px]" />
        <div className="bg-indigo-600/6 absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full blur-[100px]" />
        <div className="bg-purple-600/6 absolute right-0 top-1/2 h-[300px] w-[300px] rounded-full blur-[100px]" />
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* NAVBAR                                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/15 shadow-lg shadow-blue-500/20">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">SmartAttend</p>
              <p className="text-[10px] text-slate-500">Secure Verification</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="hidden items-center gap-8 sm:flex">
            <button
              onClick={scrollToFeatures}
              className="cursor-pointer text-sm text-slate-400 transition hover:text-white"
            >
              Features
            </button>
            <button
              onClick={scrollToFeatures}
              className="cursor-pointer text-sm text-slate-400 transition hover:text-white"
            >
              How It Works
            </button>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href={dashboardHref}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-400 transition hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/schedule"
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500"
                >
                  Mark Attendance
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left — text */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-600/10 px-4 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              <span className="text-xs font-semibold text-blue-400">
                Now Available for Universities
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Smart{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Attendance
              </span>{" "}
              Verification System
            </h1>

            {/* Subheadline */}
            <p className="max-w-lg text-lg leading-relaxed text-slate-400">
              Secure attendance powered by QR verification, location validation, liveness detection,
              and attendance analytics.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={user ? dashboardHref : "/schedule"}
                className="group flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-500/30 transition hover:bg-blue-500 hover:shadow-blue-500/40"
              >
                <Zap className="h-4 w-4" />
                Mark Attendance
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                onClick={scrollToFeatures}
                className="flex items-center gap-2 rounded-xl border border-slate-700 px-7 py-3.5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
              >
                Learn More
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>No proxy attendance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Real-time verification</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Audit-ready reports</span>
              </div>
            </div>
          </div>

          {/* Right — mock schedule card */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-sm space-y-3">
              {/* Header */}
              <div className="mb-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Today's Schedule
                </p>
              </div>

              {/* Live session card preview */}
              <div className="relative overflow-hidden rounded-2xl border border-blue-500/40 bg-slate-900/80 p-5 shadow-2xl shadow-blue-500/15 ring-1 ring-blue-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-400" />
                      LIVE NOW
                    </div>
                    <h3 className="mt-2 text-base font-bold text-white">Session 1</h3>
                    <p className="text-sm text-slate-400">10:00 – 11:00</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-600/10">
                    <QrCode className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
                <div className="relative mt-4">
                  <div className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">
                    <Camera className="h-4 w-4" />
                    Mark My Attendance
                  </div>
                </div>
              </div>

              {/* Upcoming cards */}
              {["Session 2 · 11:00–12:00", "Session 3 · 12:00–13:00"].map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
                >
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    Upcoming
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STATS                                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-slate-800/60 bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <Icon className="h-5 w-5 text-blue-400" />
                <p className="text-3xl font-extrabold text-white">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECURITY FEATURES                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={featuresRef} className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-600/10 px-4 py-1.5">
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs font-semibold text-purple-400">Multi-Layer Security</span>
          </div>
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-white">
            Built to Prevent Fraud
          </h2>
          <p className="mx-auto max-w-xl text-base text-slate-400">
            Every verification layer works together. Bypass one — the others still protect the
            record.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY_FEATURES.map(({ icon: Icon, title, description, color }) => {
            const c = colorMap[color];
            return (
              <div
                key={title}
                className="group rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/70"
              >
                <div
                  className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${c.border} ${c.bg} shadow-lg ${c.glow}`}
                >
                  <Icon className={`h-5 w-5 ${c.text}`} />
                </div>
                <h3 className="mb-2 text-base font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-slate-800/60 bg-slate-900/20">
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-600/10 px-4 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Simple Process</span>
            </div>
            <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-white">How It Works</h2>
            <p className="text-base text-slate-400">Six steps. Under two minutes. Tamper-proof.</p>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[27px] top-0 h-full w-px bg-gradient-to-b from-blue-500/40 via-purple-500/40 to-transparent sm:left-[35px]" />

            <div className="space-y-8">
              {STEPS.map(({ step, icon: Icon, title, desc }, i) => (
                <div key={step} className="flex gap-6">
                  <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
                    <Icon className="h-5 w-5 text-blue-400" />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-blue-500/40 bg-blue-600 text-[9px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 pb-2 pt-3">
                    <h3 className="mb-1 text-base font-bold text-white">{title}</h3>
                    <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FINAL CTA BAND                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-slate-800/60">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-4xl font-extrabold text-white">
            Ready to mark your attendance?
          </h2>
          <p className="mb-8 text-base text-slate-400">
            View today's schedule and start the verified attendance process.
          </p>
          <Link
            href={user ? dashboardHref : "/schedule"}
            className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-500/30 transition hover:bg-blue-500"
          >
            <Zap className="h-5 w-5" />
            Mark Attendance Now
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-800/60 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-600/15">
                <Shield className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-sm font-bold text-white">
                Smart Attendance Verification System
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <span className="cursor-pointer transition hover:text-slate-300">About</span>
              <span className="cursor-pointer transition hover:text-slate-300">Privacy</span>
              <span className="cursor-pointer transition hover:text-slate-300">Contact</span>
              <span className="rounded-full border border-slate-700 px-2.5 py-0.5 font-mono text-[10px]">
                v1.0.0
              </span>
            </div>
          </div>
          <p className="mt-6 text-center text-[11px] text-slate-600">
            © 2026 Smart Attendance Verification System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
