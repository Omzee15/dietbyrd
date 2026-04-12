import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "doctor" | "rd" | "patient" | "ops_manager" | "founder" | "tech_lead";

export interface AuthUser {
  id: number;
  phone: string;
  role: UserRole;
  name?: string;
  profileId?: number; // doctor_id, rd_id, or patient_id
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (phone: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem("dietbyrd_user");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, isAuthenticated: !!user }}>
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
