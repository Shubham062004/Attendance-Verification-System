"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiService, User } from "../services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  developerTimeRemaining: number | null; // For developer countdown
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginAsDeveloper: () => Promise<void>;
  logout: () => Promise<void>;
  onboardStudent: (regNo: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to decode JWT client-side
function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [developerTimeRemaining, setDeveloperTimeRemaining] = useState<number | null>(null);
  const router = useRouter();

  // Load token and user on initialization
  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem("auth_token");
      if (savedToken) {
        setToken(savedToken);
        try {
          const currentUser = await apiService.getMe();
          setUser(currentUser);
        } catch (error) {
          console.error("Failed to restore session", error);
          localStorage.removeItem("auth_token");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  // Developer Session Countdown logic
  useEffect(() => {
    if (!token || !user || user.role !== "Developer") {
      setDeveloperTimeRemaining(null);
      return;
    }

    const payload = parseJwt(token);
    if (!payload || !payload.exp) return;

    const expiryTime = payload.exp * 1000; // convert to ms

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((expiryTime - now) / 1000));
      setDeveloperTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // Automatically logout when expired
        logout();
      }
    };

    updateTimer(); // run once immediately
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [token, user]);

  const loginWithGoogle = async (idToken: string) => {
    setLoading(true);
    try {
      const response = await apiService.googleLogin(idToken);
      localStorage.setItem("auth_token", response.access_token);
      setToken(response.access_token);
      setUser(response.user);

      handleNavigation(response.user);
    } catch (error) {
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginAsDeveloper = async () => {
    setLoading(true);
    try {
      const response = await apiService.developerLogin();
      localStorage.setItem("auth_token", response.access_token);
      setToken(response.access_token);
      setUser(response.user);

      router.push("/developer");
    } catch (error) {
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (token) {
        await apiService.logout();
      }
    } catch (error) {
      console.error("Error during backend logout", error);
    } finally {
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
      setDeveloperTimeRemaining(null);
      setLoading(false);
      router.push("/login");
    }
  };

  const onboardStudent = async (regNo: string) => {
    setLoading(true);
    try {
      const updatedUser = await apiService.registerStudent(regNo);
      setUser(updatedUser);
      router.push("/student/profile");
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (currentUser: User) => {
    if (currentUser.role === "Admin") {
      router.push("/admin");
    } else if (currentUser.role === "Developer") {
      router.push("/developer");
    } else if (currentUser.role === "Student") {
      if (!currentUser.registration_number) {
        router.push("/onboarding");
      } else {
        router.push("/student/profile");
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        developerTimeRemaining,
        loginWithGoogle,
        loginAsDeveloper,
        logout,
        onboardStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
