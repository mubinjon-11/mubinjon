import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, Brain, BarChart3, Sparkles } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function Landing() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (user && role === "oquvchi") return <Navigate to="/dashboard" replace />;
  if (user && role === "oqituvchi") return <Navigate to="/oqituvchi" replace />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 gradient-hero opacity-10" />
          <div className="container py-20 md:py-32 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8 shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Sun'iy intellekt yordamida testlar
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Bilimingizni <span className="text-gradient">sinab ko'ring</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground mb-10">
              O'zbekiston o'qituvchilari va o'quvchilari uchun zamonaviy onlayn test platformasi. AI yordamida cheksiz testlar va daraja aniqlash.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-glow">
                <Link to="/auth">Boshlash</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Kirish</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container py-20 grid md:grid-cols-3 gap-6">
          {[
            { icon: Brain, title: "AI testlar", text: "Har qanday fan va mavzu bo'yicha cheksiz savollar avtomatik yaratiladi." },
            { icon: BarChart3, title: "Darajalar tizimi", text: "Ingliz tili — CEFR (A1–C2). Boshqa fanlar — Milliy sertifikat darajalari." },
            { icon: GraduationCap, title: "O'qituvchilar uchun", text: "O'z testlaringizni qo'lda yarating, o'quvchilarga taqdim eting." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-base hover:shadow-elevated hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary mb-4">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
