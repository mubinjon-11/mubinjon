import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, role }: { children: ReactNode; role?: "oqituvchi" | "oquvchi" }) {
  const { user, role: userRole, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (role && userRole !== role) {
    return <Navigate to={userRole === "oqituvchi" ? "/oqituvchi" : "/dashboard"} replace />;
  }
  return <>{children}</>;
}
