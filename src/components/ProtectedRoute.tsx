import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login page with return url
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // User doesn't have permission, redirect to their dashboard
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
