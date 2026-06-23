"use client";

import React, { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { apiService } from "../../../services/api";
import {
  CheckCircle,
  Droplets,
  Thermometer,
  Flame,
  Star,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Trophy,
  Wind,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PageProps {
  searchParams: Promise<{
    record_id?: string;
    status?: string;
    session_title?: string;
    session_subject?: string;
    session_class?: string;
    submitted_at?: string;
  }>;
}

interface WeatherData {
  temperature: number;
  feels_like: number;
  description: string;
  weathercode: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HYDRATION_MESSAGES = [
  {
    emoji: "💧",
    title: "Stay Hydrated!",
    text: "Drinking water after class helps restore focus and keeps your brain sharp. Aim for a full glass right now!",
    color: "from-cyan-950/60 to-blue-950/60",
    accent: "text-cyan-400",
    border: "border-cyan-800/40",
  },
  {
    emoji: "☀️",
    title: "Beat the Heat",
    text: "Warm weather drains energy faster. Keep a water bottle nearby and sip every 20 minutes to stay at your best.",
    color: "from-amber-950/60 to-orange-950/60",
    accent: "text-amber-400",
    border: "border-amber-800/40",
  },
  {
    emoji: "🌡️",
    title: "Temperature Alert",
    text: "High temperatures increase sweat and dehydration. A cold glass of water now will help regulate your body temperature.",
    color: "from-red-950/60 to-rose-950/60",
    accent: "text-rose-400",
    border: "border-rose-800/40",
  },
  {
    emoji: "🫗",
    title: "Water Break Time",
    text: "You've worked hard today — reward yourself with a refreshing water break before your next task. Your body will thank you!",
    color: "from-teal-950/60 to-emerald-950/60",
    accent: "text-teal-400",
    border: "border-teal-800/40",
  },
  {
    emoji: "🧊",
    title: "Refresh Your Mind",
    text: "Cold water activates your nervous system and increases alertness by up to 14%. Go grab some — you've earned it!",
    color: "from-sky-950/60 to-indigo-950/60",
    accent: "text-sky-400",
    border: "border-sky-800/40",
  },
];

const MOTIVATION_MESSAGES = [
  "You're on a roll — keep the momentum going! 🚀",
  "Consistency is the foundation of excellence. Great work! 🌟",
  "Every class counts. You're building something great! 💪",
  "Present and accounted for — that's the spirit! ✨",
  "Showing up is half the battle. You're winning! 🏆",
];

// 5 illustration assets in /public/hydration/
const ILLUSTRATIONS = [
  "/hydration/drinking_water.png",
  "/hydration/summer_heat_reminder.png",
  "/hydration/stay_cool.png",
  "/hydration/water_bottle_animation.png",
  "/hydration/hydration_mascot.png",
];

const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky ☀️",
  1: "Mainly clear 🌤",
  2: "Partly cloudy ⛅",
  3: "Overcast ☁️",
  45: "Foggy 🌫️",
  48: "Rime fog 🌫️",
  51: "Light drizzle 🌦",
  53: "Moderate drizzle 🌦",
  55: "Dense drizzle 🌧",
  61: "Slight rain 🌧",
  63: "Moderate rain 🌧",
  65: "Heavy rain 🌧",
  71: "Light snow 🌨",
  73: "Moderate snow 🌨",
  75: "Heavy snow ❄️",
  80: "Slight showers 🌦",
  81: "Moderate showers 🌧",
  82: "Violent showers ⛈",
  95: "Thunderstorm ⛈",
  96: "Hailstorm ⛈",
  99: "Heavy hailstorm ⛈",
};

// ---------------------------------------------------------------------------
// Helpers — no-consecutive illustration picker
// ---------------------------------------------------------------------------
function pickIllustration(): number {
  if (typeof window === "undefined") return 0;
  const last = Number(localStorage.getItem("last_hydration_img") ?? "-1");
  let next: number;
  do {
    next = Math.floor(Math.random() * ILLUSTRATIONS.length);
  } while (next === last && ILLUSTRATIONS.length > 1);
  localStorage.setItem("last_hydration_img", String(next));
  return next;
}

// ---------------------------------------------------------------------------
// Weather fetch — Open-Meteo (no API key required)
// ---------------------------------------------------------------------------
async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
    });
    const { latitude, longitude } = position.coords;
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=apparent_temperature&forecast_days=1`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const wc: number = data.current_weather?.weathercode ?? 0;
    const hour = new Date().getHours();
    const apparentNow: number | null = data.hourly?.apparent_temperature?.[hour] ?? null;
    return {
      temperature: Math.round(data.current_weather?.temperature ?? 0),
      feels_like:
        apparentNow !== null
          ? Math.round(apparentNow)
          : Math.round(data.current_weather?.temperature ?? 0),
      description: WEATHER_DESCRIPTIONS[wc] ?? "Unknown ☁️",
      weathercode: wc,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    PRESENT: {
      color: "border-emerald-500/40 bg-emerald-600/15 text-emerald-400",
      label: "✓ Present",
    },
    FLAGGED: { color: "border-amber-500/40 bg-amber-600/15 text-amber-400", label: "⚑ Flagged" },
    REJECTED: { color: "border-rose-500/40 bg-rose-600/15 text-rose-400", label: "✗ Rejected" },
  };
  const cfg = map[status] ?? map.PRESENT;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Streak flame display
// ---------------------------------------------------------------------------
function StreakDisplay({ streak }: { streak: number | null }) {
  if (streak === null) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        <span className="text-xs text-slate-500">Loading streak…</span>
      </div>
    );
  }
  if (streak === 0) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Star className="h-4 w-4" />
        <span className="text-xs">Start your streak today!</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Flame className="h-5 w-5 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
      <span className="text-lg font-extrabold text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.4)]">
        {streak}
      </span>
      <span className="text-xs font-medium text-slate-400">
        {streak === 1 ? "day streak" : "day streak"} 🔥
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weather card
// ---------------------------------------------------------------------------
function WeatherCard({ weather, loading }: { weather: WeatherData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        <span className="text-xs text-slate-500">Fetching your local weather…</span>
      </div>
    );
  }
  if (!weather) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-500/60" />
        <span className="text-xs text-slate-600">
          Weather unavailable — allow location access for personalized tips
        </span>
      </div>
    );
  }

  const isHot = weather.temperature >= 30;
  const isCold = weather.temperature <= 10;
  const tempColor = isHot ? "text-rose-400" : isCold ? "text-sky-400" : "text-emerald-400";

  return (
    <div className="rounded-xl border border-slate-700/60 bg-gradient-to-r from-slate-900/80 to-slate-800/40 px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
            <Thermometer className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className={`text-xl font-extrabold ${tempColor}`}>{weather.temperature}°C</p>
            <p className="text-[10px] text-slate-500">{weather.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Wind className="h-3 w-3 text-slate-500" />
            <span className="text-[10px] text-slate-500">Feels like</span>
          </div>
          <p className="text-sm font-bold text-slate-300">{weather.feels_like}°C</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function AttendanceSuccessContent({ searchParams }: PageProps) {
  const resolved = use(searchParams);
  const router = useRouter();

  // Validate required params — if missing, something went wrong
  const recordId = resolved.record_id;
  const status = resolved.status ?? "PRESENT";
  const sessionTitle = resolved.session_title ?? "Attendance Session";
  const sessionSubject = resolved.session_subject ?? "—";
  const sessionClass = resolved.session_class ?? "—";
  const submittedAt = resolved.submitted_at ?? new Date().toISOString();

  // State
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [streak, setStreak] = useState<number | null>(null);

  // Pick illustration & message once on mount (no consecutive repeats)
  const [illustrationIdx] = useState(() => pickIllustration());
  const [hydrationMsg] = useState(
    () => HYDRATION_MESSAGES[Math.floor(Math.random() * HYDRATION_MESSAGES.length)],
  );
  const [motivationMsg] = useState(
    () => MOTIVATION_MESSAGES[Math.floor(Math.random() * MOTIVATION_MESSAGES.length)],
  );

  // ---------------------------------------------------------------------------
  // Fire analytics + load data
  // ---------------------------------------------------------------------------
  const logEvent = useCallback(
    async (actionType: string, description: string, meta?: Record<string, unknown>) => {
      try {
        await apiService.logAnalyticsEvent(actionType, description, meta);
      } catch {
        // Analytics failures are silent — never block UI
      }
    },
    [],
  );

  useEffect(() => {
    // Log: Success Screen Viewed
    logEvent("Success Screen Viewed", "Student viewed the post-attendance success screen", {
      record_id: recordId,
      status,
      session: sessionTitle,
    });

    // Log: Hydration Reminder Displayed
    logEvent("Hydration Reminder Displayed", `Hydration tip shown: "${hydrationMsg.title}"`, {
      message: hydrationMsg.title,
    });

    // Log: GIF Displayed
    logEvent("GIF Displayed", `Hydration illustration shown: ${ILLUSTRATIONS[illustrationIdx]}`, {
      illustration: ILLUSTRATIONS[illustrationIdx],
      index: illustrationIdx,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch streak
  useEffect(() => {
    apiService
      .getStreak()
      .then((res) => setStreak(res.streak))
      .catch(() => setStreak(0));
  }, []);

  // Fetch weather
  useEffect(() => {
    setWeatherLoading(true);
    fetchWeather().then((w) => {
      setWeather(w);
      setWeatherLoading(false);
      if (w) {
        logEvent(
          "Weather Loaded",
          `Weather loaded for success screen: ${w.temperature}°C, ${w.description}`,
          {
            temperature: w.temperature,
            feels_like: w.feels_like,
            description: w.description,
          },
        );
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!recordId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-300">
        <div className="space-y-4 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
          <p className="text-sm">Missing attendance data. Please try again.</p>
          <Link href="/attendance" className="text-xs text-indigo-400 hover:underline">
            ← Return to Attendance
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Background glow blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full bg-emerald-600/5 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-teal-600/5 blur-[100px]" />
      <div className="bg-cyan-600/3 pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]" />

      <div className="relative flex flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-lg space-y-5">
          {/* ── Hero banner ── */}
          <div className="flex flex-col items-center gap-5 pt-2 text-center">
            {/* Animated checkmark ring */}
            <div className="relative">
              <div
                className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-600/20 to-teal-600/10 shadow-2xl shadow-emerald-500/10"
                style={{ animation: "pulse-ring 2s ease-in-out infinite" }}
              >
                <CheckCircle className="h-14 w-14 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]" />
              </div>
              {/* Badge */}
              <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-base font-bold shadow-lg shadow-emerald-500/40">
                ✓
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Attendance Marked!
              </h1>
              <p className="mt-1 text-sm text-slate-400">{motivationMsg}</p>
            </div>
          </div>

          {/* ── Streak card ── */}
          <div className="rounded-2xl border border-orange-800/30 bg-gradient-to-r from-orange-950/40 to-amber-950/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-orange-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                Daily Streak
              </span>
            </div>
            <StreakDisplay streak={streak} />
          </div>

          {/* ── Attendance summary ── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Submission Details
              </span>
              <StatusBadge status={status} />
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Session", value: sessionTitle },
                { label: "Subject", value: sessionSubject },
                { label: "Class", value: sessionClass },
                { label: "Submitted At", value: new Date(submittedAt).toLocaleString() },
                { label: "Record ID", value: `#${recordId}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-200">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Weather card ── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Current Weather
              </span>
            </div>
            <WeatherCard weather={weather} loading={weatherLoading} />
          </div>

          {/* ── Hydration card with illustration ── */}
          <div
            className={`rounded-2xl border bg-gradient-to-br p-5 backdrop-blur-sm ${hydrationMsg.color} ${hydrationMsg.border}`}
          >
            <div className="mb-3 flex items-center gap-2">
              <Droplets className={`h-4 w-4 ${hydrationMsg.accent}`} />
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${hydrationMsg.accent}`}
              >
                Hydration Reminder
              </span>
            </div>

            <div className="flex items-start gap-4">
              {/* Illustration */}
              <div className="shrink-0">
                <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/5 bg-white/5">
                  <Image
                    src={ILLUSTRATIONS[illustrationIdx]}
                    alt="Hydration illustration"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>

              {/* Message */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">{hydrationMsg.emoji}</span>
                  <h2 className={`text-sm font-bold ${hydrationMsg.accent}`}>
                    {hydrationMsg.title}
                  </h2>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">{hydrationMsg.text}</p>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-1">
            <Link
              id="view-history-btn"
              href="/student/attendance"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 py-3.5 text-xs font-bold text-slate-300 transition-all duration-200 hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            >
              <Star className="h-4 w-4 text-slate-400" />
              My History
            </Link>
            <Link
              id="done-btn"
              href="/attendance"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:bg-emerald-500 hover:shadow-emerald-500/30"
            >
              Done
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="text-center text-[10px] text-slate-700">
            Record #{recordId} • Session: {sessionTitle}
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-ring {
          0%,
          100% {
            box-shadow:
              0 0 0 0 rgba(52, 211, 153, 0.15),
              0 0 30px rgba(52, 211, 153, 0.05);
          }
          50% {
            box-shadow:
              0 0 0 16px rgba(52, 211, 153, 0),
              0 0 50px rgba(52, 211, 153, 0.1);
          }
        }
      `}</style>
    </div>
  );
}

export default function AttendanceSuccessPage({ searchParams }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={["Student"]}>
      <AttendanceSuccessContent searchParams={searchParams} />
    </ProtectedRoute>
  );
}
