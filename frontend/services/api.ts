export interface HealthResponse {
  status: string;
  service: string;
  database?: string;
  timestamp?: string;
}

export interface User {
  id: number;
  google_id: string | null;
  email: string;
  name: string | null;
  registration_number: string | null;
  role: "Student" | "Admin" | "Developer";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  // Try to get token from localStorage on the client side
  let authHeaders: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      authHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = `API request failed: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson?.detail) {
        errorMsg =
          typeof errorJson.detail === "string"
            ? errorJson.detail
            : JSON.stringify(errorJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const apiService = {
  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  async googleLogin(idToken: string): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });
  },

  async developerLogin(): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/developer-login", {
      method: "POST",
    });
  },

  async logout(): Promise<{ status: string; message: string }> {
    return request<{ status: string; message: string }>("/auth/logout", {
      method: "POST",
    });
  },

  async getMe(): Promise<User> {
    return request<User>("/auth/me");
  },

  async registerStudent(registrationNumber: string): Promise<User> {
    return request<User>("/auth/register-student", {
      method: "POST",
      body: JSON.stringify({ registration_number: registrationNumber }),
    });
  },

  async getProfile(): Promise<User> {
    return request<User>("/users/profile");
  },

  async updateProfile(name: string): Promise<User> {
    return request<User>("/users/profile", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },
};
