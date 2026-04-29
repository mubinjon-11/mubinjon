import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut } from "lucide-react";

export function AppHeader() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const isStudent = role === "oquvchi";
  const isTeacher = role === "oqituvchi";

  const navLinks = isStudent
    ? [
        { to: "/test/yaratish", label: "Oddiy test yaratish" },
        { to: "/test/daraja", label: "Darajani aniqlash" },
      ]
    : isTeacher
    ? [
        { to: "/oqituvchi", label: "Mening testlarim" },
        { to: "/oqituvchi/yangi", label: "Yangi test" },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to={user ? (isStudent ? "/dashboard" : "/oqituvchi") : "/"} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-soft">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">BilimTest</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-base ${
                loc.pathname === l.to
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Chiqish
            </Button>
          ) : (
            <Button onClick={() => navigate("/auth")} size="sm">Kirish</Button>
          )}
        </div>
      </div>

      {navLinks.length > 0 && (
        <nav className="md:hidden border-t border-border overflow-x-auto">
          <div className="container flex gap-1 py-2">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium ${
                  loc.pathname === l.to ? "bg-secondary" : "text-muted-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
