import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SUBJECTS, calculateLevel, levelColor } from "@/lib/constants";
import { Sparkles, Target, BookOpen, TrendingUp } from "lucide-react";

interface BestResult {
  subject: string;
  percentage: number;
  level: string;
  isFromLevelTest: boolean;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [levels, setLevels] = useState<Record<string, BestResult | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("results")
        .select("subject, percentage, level, mode, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const map: Record<string, BestResult | null> = {};
      SUBJECTS.forEach((s) => (map[s] = null));
      (data ?? []).forEach((r: any) => {
        const cur = map[r.subject];
        // prefer level-tests over normal; otherwise latest (already ordered desc)
        if (!cur) {
          map[r.subject] = {
            subject: r.subject,
            percentage: Number(r.percentage),
            level: r.level || calculateLevel(Number(r.percentage), r.subject),
            isFromLevelTest: r.mode === "daraja",
          };
        } else if (r.mode === "daraja" && !cur.isFromLevelTest) {
          map[r.subject] = {
            subject: r.subject,
            percentage: Number(r.percentage),
            level: r.level || calculateLevel(Number(r.percentage), r.subject),
            isFromLevelTest: true,
          };
        }
      });
      setLevels(map);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Bosh sahifa</h1>
          <p className="text-muted-foreground">Xush kelibsiz! Quyida fanlar bo'yicha darajangiz va testlar.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => navigate("/test/yaratish")}
            className="group text-left rounded-2xl p-6 gradient-primary text-primary-foreground shadow-soft transition-base hover:shadow-glow hover:-translate-y-1"
          >
            <Sparkles className="h-8 w-8 mb-3" />
            <h3 className="text-xl font-bold mb-1">Oddiy test yaratish</h3>
            <p className="text-sm opacity-90">Sinf, fan va mavzu tanlab AI yoki o'qituvchi testlarini yeching.</p>
          </button>
          <button
            onClick={() => navigate("/test/daraja")}
            className="group text-left rounded-2xl p-6 gradient-accent text-accent-foreground shadow-soft transition-base hover:shadow-glow hover:-translate-y-1"
          >
            <Target className="h-8 w-8 mb-3" />
            <h3 className="text-xl font-bold mb-1">Darajani aniqlash</h3>
            <p className="text-sm opacity-90">20 ta savol orqali fan bo'yicha haqiqiy darajangizni bilib oling.</p>
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Fanlar bo'yicha darajangiz</h2>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUBJECTS.map((s) => (
              <div key={s} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUBJECTS.map((s) => {
              const r = levels[s];
              return (
                <div key={s} className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-base hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">{s}</h3>
                    </div>
                    {r?.isFromLevelTest && (
                      <Badge variant="outline" className="text-xs">Aniqlangan</Badge>
                    )}
                  </div>
                  {r ? (
                    <div className="flex items-center justify-between">
                      <Badge className={`${levelColor(r.level)} text-base px-3 py-1`}>{r.level}</Badge>
                      <span className="text-sm text-muted-foreground">{r.percentage.toFixed(0)}%</span>
                    </div>
                  ) : (
                    <Badge variant="secondary">Aniqlanmagan</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
