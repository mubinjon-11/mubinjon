import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, User } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setAvatarUrl(null); return; }
    supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => setAvatarUrl((data?.avatar_url as string) ?? null));
  }, [user]);

  const isStudent = role === "oquvchi";
  const isTeacher = role === "oqituvchi";
  const isAdmin = role === "admin";

  const navLinks = isAdmin
    ? [
        { to: "/test/yaratish", label: "Oddiy test yaratish" },
        { to: "/test/daraja", label: "Darajani aniqlash" },
        { to: "/organish", label: "O'rganish" },
        { to: "/yechilgan", label: "Yechilgan testlar" },
        { to: "/oqituvchi/yangi", label: "Test tuzish" },
        { to: "/admin", label: "Saytni kuzatish" },
      ]
    : isStudent
    ? [
        { to: "/test/yaratish", label: "Oddiy test yaratish" },
        { to: "/test/daraja", label: "Darajani aniqlash" },
        { to: "/organish", label: "O'rganish" },
        { to: "/yechilgan", label: "Yechilgan testlar" },
      ]
    : isTeacher
    ? [
        { to: "/oqituvchi", label: "Mening testlarim" },
        { to: "/oqituvchi/yangi", label: "Yangi test" },
        { to: "/organish", label: "O'rganish" },
        { to: "/yechilgan", label: "Yechilgan testlar" },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to={user ? (isAdmin ? "/admin" : isStudent ? "/dashboard" : "/oqituvchi") : "/"} className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-soft group-hover:shadow-glow transition-base">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">BilimTest</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-base ${
                loc.pathname === l.to
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                to="/profil"
                className={`flex items-center gap-2 px-2 py-1.5 rounded-full transition-base hover:bg-secondary/60 ${
                  loc.pathname === "/profil" ? "bg-secondary" : ""
                }`}
                aria-label="Profil"
              >
                <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center overflow-hidden ring-2 ring-background shadow-soft">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-primary-foreground" />
                  )}
                </div>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => { await signOut(); navigate("/"); }}
              >
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Chiqish</span>
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")} size="sm">Kirish</Button>
          )}
        </div>
      </div>

      {navLinks.length > 0 && (
        <nav className="md:hidden border-t border-border/60 overflow-x-auto">
          <div className="container flex gap-1 py-2">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-base ${
                  loc.pathname === l.to ? "bg-secondary" : "text-muted-foreground hover:text-foreground"
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
