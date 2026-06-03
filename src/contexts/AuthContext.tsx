import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "doctor" | "assistant" | "rd" | "patient" | "mlt_intern" | "support_intern" | "ops_manager" | "founder" | "tech_lead";

export interface AuthUser {
  id: number;
  phone: string;
  role: UserRole;
  name?: string;
  profileId?: number; // doctor_id, rd_id, assistant_id, or patient_id
  doctorId?: number; // For assistants - links to the doctor they work for
  isVerified?: boolean; // For doctors/dieticians - false until admin approves
  isNewPatient?: boolean; // Flag for new patients who need to complete welcome form
  requiresWelcomeForm?: boolean; // Requires welcome form to be filled
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string; pending?: boolean; admin_message?: string | null }>;
  loginWithData: (authUser: AuthUser) => void;
  signup: (phone: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (phone: string) => Promise<{ success: boolean; error?: string; expiresIn?: number }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string; data?: AuthUser }>;
  verifyOtpOnly: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  setPasswordAfterOtp: (phone: string, otp: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendSignupOtp: (phone: string, password: string, name?: string) => Promise<{ success: boolean; error?: string; expiresIn?: number }>;
  verifySignupOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const isUsableStoredUser = (value: unknown): value is AuthUser => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuthUser>;
  if (!candidate.id || !candidate.role) return false;
  if (candidate.role === "patient" && !candidate.profileId) return false;
  return true;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const saveSession = (authUser: AuthUser) => {
    if (!isUsableStoredUser(authUser)) {
      setUser(null);
      localStorage.removeItem("dietbyrd_user");
      localStorage.removeItem("dietbyrd_login_at");
      return;
    }

    setUser(authUser);
    localStorage.setItem("dietbyrd_user", JSON.stringify(authUser));
    localStorage.setItem("dietbyrd_login_at", String(Date.now()));
  };

  // Check for existing session on mount — expire after 30 days
  useEffect(() => {
    const stored = localStorage.getItem("dietbyrd_user");
    const loginAt = localStorage.getItem("dietbyrd_login_at");
    if (stored) {
      try {
        const age = loginAt ? Date.now() - parseInt(loginAt, 10) : SESSION_EXPIRY_MS + 1;
        if (age > SESSION_EXPIRY_MS) {
          localStorage.removeItem("dietbyrd_user");
          localStorage.removeItem("dietbyrd_login_at");
          setSessionExpired(true);
        } else {
          const parsedUser = JSON.parse(stored);
          if (isUsableStoredUser(parsedUser)) {
            setUser(parsedUser);
          } else {
            localStorage.removeItem("dietbyrd_user");
            localStorage.removeItem("dietbyrd_login_at");
          }
        }
      } catch {
        localStorage.removeItem("dietbyrd_user");
        localStorage.removeItem("dietbyrd_login_at");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (phone: string, password: string): Promise<{ success: boolean; error?: string; pending?: boolean; admin_message?: string | null }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 403 && data.data?.pending) {
          return { success: false, error: data.error, pending: true, admin_message: data.data.admin_message ?? null };
        }
        return { success: false, error: data.error || "Login failed" };
      }

      const authUser: AuthUser = data.data;
      saveSession(authUser);

      return { success: true };
    } catch (err) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const signup = async (phone: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password, name }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Signup failed" };
      }

      const authUser: AuthUser = data.data;
      saveSession(authUser);
      
      return { success: true };
    } catch (err) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const sendOtp = async (phone: string): Promise<{ success: boolean; error?: string; expiresIn?: number }> => {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to send OTP" };
      }
      
      return { success: true, expiresIn: data.expiresIn };
    } catch (err) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const verifyOtp = async (phone: string, otp: string): Promise<{ success: boolean; error?: string; data?: AuthUser }> => {
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "OTP verification failed" };
      }
      
      const authUser: AuthUser = data.data;
      
      // If this is a new patient who needs to complete the welcome form, don't log them in yet
      if (authUser.isNewPatient || authUser.requiresWelcomeForm) {
        return { success: true, data: authUser };
      }
      
      // Existing user - log them in
      saveSession(authUser);

      return { success: true, data: authUser };
    } catch (err) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const verifyOtpOnly = async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/verify-otp-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "OTP verification failed" };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const setPasswordAfterOtp = async (phone: string, otp: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/set-password-after-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to set password" };
      }

      const authUser: AuthUser = data.data;
      saveSession(authUser);

      return { success: true };
    } catch (err) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const sendSignupOtp = async (phone: string, password: string, name?: string): Promise<{ success: boolean; error?: string; expiresIn?: number }> => {
    try {
      const res = await fetch("/api/auth/signup/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password, name }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to send OTP" };
      }
      
      return { success: true, expiresIn: data.expiresIn };
    } catch (err) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const verifySignupOtp = async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "OTP verification failed" };
      }
      
      const authUser: AuthUser = data.data;
      saveSession(authUser);

      return { success: true };
    } catch (err) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const loginWithData = (authUser: AuthUser) => {
    saveSession(authUser);
  };

  const logout = () => {
    setUser(null);
    setSessionExpired(false);
    localStorage.removeItem("dietbyrd_user");
    localStorage.removeItem("dietbyrd_login_at");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, sessionExpired, login, loginWithData, signup, sendOtp, verifyOtp, verifyOtpOnly, setPasswordAfterOtp, sendSignupOtp, verifySignupOtp, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// Helper to get dashboard path based on role
export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "doctor":
    case "assistant":
      return "/doctor";
    case "rd":
      return "/dietician";
    case "ops_manager":
    case "founder":
    case "tech_lead":
      return "/admin";
    case "mlt_intern":
      return "/mlt-intern";
    case "support_intern":
      return "/support";
    case "patient":
      return "/patient";
    default:
      return "/";
  }
}
