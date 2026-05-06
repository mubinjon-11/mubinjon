import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getLevelsForSubject, LEARNING_SUBJECTS, levelColor } from "@/lib/constants";
import { Loader2, ChevronRight, Lock, CheckCircle2 } from "lucide-react";

export default function LearnSubject() {
  const { subject: rawSubject } = useParams();
  const subject = decodeURIComponent(rawSubject ?? "");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, { passed: boolean; best_percentage: number }>>({});
  const [loading, setLoading] = useState(true);

  const validSubject = (LEARNING_SUBJECTS as readonly string[]).includes(subject);
  const levels = validSubject ? getLevelsForSubject(subject) : [];

  useEffect(() => {
    if (!validSubject) {
      navigate("/organish", { replace: true });
      return;
    }
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("learning_progress")
        .select("level, position, passed, best_percentage")
        .eq("user_id", user.id)
        .eq("subject", subject);
      const map: Record<string, { passed: boolean; best_percentage: number }> = {};
      data?.forEach((r: any) => {
        map[`${r.level}:${r.position}`] = { passed: r.passed, best_percentage: Number(r.best_percentage) };
      });
      setProgress(map);
      setLoading(false);
    })();
  }, [user, subject, validSubject, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Determine level unlock: a level is unlocked if all its previous level's lesson 1 is passed,
  // OR if it's the first level. For simplicity, all levels are visible; locking happens at the lesson level.
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 md:py-12 max-w-4xl">
        <div className="mb-6">
          <Link to="/organish" className="text-sm text-muted-foreground hover:text-foreground">← O'rganish</Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">{subject}</h1>
          <p className="text-muted-foreground">Darajani tanlang. Har bir darajada darslar ketma-ket ochiladi.</p>
        </div>

        <div className="grid gap-3">
          {levels.map((lvl) => {
            const completedCount = Object.entries(progress).filter(([k, v]) => k.startsWith(`${lvl}:`) && v.passed).length;
            return (
              <Link
                key={lvl}
                to={`/organish/${encodeURIComponent(subject)}/${encodeURIComponent(lvl)}`}
                className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-soft transition-base hover:border-primary/40"
              >
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1.5 rounded-lg font-bold text-sm ${levelColor(lvl)}`}>{lvl}</span>
                  <div>
                    <div className="font-semibold">{lvl} darajasi</div>
                    <div className="text-xs text-muted-foreground">{completedCount} ta dars o'tilgan</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
