import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type AllowedRole = "oqituvchi" | "oquvchi" | "admin";

export function ProtectedRoute({ children, role }: { children: ReactNode; role?: AllowedRole | AllowedRole[] }) {
  const { user, role: userRole, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  const allowed = Array.isArray(role) ? role : role ? [role] : [];
  if (allowed.length > 0 && (!userRole || !allowed.includes(userRole as AllowedRole))) {
    const fallback = userRole === "admin" ? "/admin" : userRole === "oqituvchi" ? "/oqituvchi" : "/dashboard";
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}
