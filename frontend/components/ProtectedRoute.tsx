"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"Student" | "Admin" | "Developer">;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Not authenticated
    if (!token || !user) {
      if (pathname !== "/login" && pathname !== "/") {
        router.push("/login");
      }
      return;
    }

    // Checking student onboarding state
    if (user.role === "Student" && !user.registration_number && pathname !== "/onboarding") {
      router.push("/onboarding");
      return;
    }

    if (user.role === "Student" && user.registration_number && pathname === "/onboarding") {
      router.push("/student/profile");
      return;
    }

    // Role verification
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      if (user.role === "Admin") {
        router.push("/admin");
      } else if (user.role === "Developer") {
        router.push("/developer");
      } else if (user.role === "Student") {
        router.push(user.registration_number ? "/student/profile" : "/onboarding");
      }
    }
  }, [user, loading, token, pathname, router, allowedRoles]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="mt-4 text-sm font-medium text-slate-400">Verifying security credentials...</p>
      </div>
    );
  }

  // If not authenticated and on a route requiring protection, return empty/skeleton until redirect triggers
  if ((!token || !user) && pathname !== "/login" && pathname !== "/") {
    return null;
  }

  // If authenticated but role is unauthorized, display quick unauthorized overlay (fallback)
  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="glow-primary mb-6 rounded-full border border-rose-500/20 bg-rose-600/10 p-4">
          <ShieldAlert className="h-12 w-12 text-rose-500" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-white">Access Denied</h1>
        <p className="max-w-sm text-center text-sm text-slate-400">
          You do not have the required permissions to view this resource. Redirecting to your
          dashboard...
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
