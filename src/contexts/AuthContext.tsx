import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "doctor" | "assistant" | "rd" | "patient" | "ops_manager" | "founder" | "tech_lead";

export interface AuthUser {
  id: number;
  phone: string;
  role: UserRole;
  name?: string;
  profileId?: number; // doctor_id, rd_id, assistant_id, or patient_id
  doctorId?: number; // For assistants - links to the doctor they work for
  isVerified?: boolean; // For doctors/dieticians - false until admin approves
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (phone: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (phone: string) => Promise<{ success: boolean; error?: string; expiresIn?: number }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  sendSignupOtp: (phone: string, password: string, name?: string) => Promise<{ success: boolean; error?: string; expiresIn?: number }>;
  verifySignupOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const stored = localStorage.getItem("dietbyrd_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("dietbyrd_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Login failed" };
      }
      
      const authUser: AuthUser = data.data;
      setUser(authUser);
      localStorage.setItem("dietbyrd_user", JSON.stringify(authUser));
      
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
      setUser(authUser);
      localStorage.setItem("dietbyrd_user", JSON.stringify(authUser));
      
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

  const verifyOtp = async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
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
      setUser(authUser);
      localStorage.setItem("dietbyrd_user", JSON.stringify(authUser));
      
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
      setUser(authUser);
      localStorage.setItem("dietbyrd_user", JSON.stringify(authUser));
      
      return { success: true };
    } catch (err) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("dietbyrd_user");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, sendOtp, verifyOtp, sendSignupOtp, verifySignupOtp, logout, isAuthenticated: !!user }}>
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
    case "patient":
      return "/patient";
    default:
      return "/";
  }
}
