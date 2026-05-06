import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getLevelsForSubject, LEARNING_SUBJECTS, levelColor } from "@/lib/constants";
import { Loader2, Lock, CheckCircle2, BookOpen } from "lucide-react";
import { toast } from "sonner";

const LESSONS_PER_LEVEL = 8;

export default function LearnLevel() {
  const { subject: rawSubject, level: rawLevel } = useParams();
  const subject = decodeURIComponent(rawSubject ?? "");
  const level = decodeURIComponent(rawLevel ?? "");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<number, { passed: boolean; best_percentage: number }>>({});
  const [loading, setLoading] = useState(true);

  const validSubject = (LEARNING_SUBJECTS as readonly string[]).includes(subject);
  const levels = validSubject ? getLevelsForSubject(subject) : [];
  const validLevel = levels.includes(level);

  useEffect(() => {
    if (!validSubject || !validLevel) {
      navigate("/organish", { replace: true });
      return;
    }
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("learning_progress")
        .select("position, passed, best_percentage")
        .eq("user_id", user.id)
        .eq("subject", subject)
        .eq("level", level);
      const map: Record<number, { passed: boolean; best_percentage: number }> = {};
      data?.forEach((r: any) => {
        map[r.position] = { passed: r.passed, best_percentage: Number(r.best_percentage) };
      });
      setProgress(map);
      setLoading(false);
    })();
  }, [user, subject, level, validSubject, validLevel, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isUnlocked = (pos: number) => pos === 1 || progress[pos - 1]?.passed === true;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 md:py-12 max-w-3xl">
        <div className="mb-6">
          <Link to={`/organish/${encodeURIComponent(subject)}`} className="text-sm text-muted-foreground hover:text-foreground">← {subject}</Link>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-3 py-1.5 rounded-lg font-bold ${levelColor(level)}`}>{level}</span>
            <h1 className="text-2xl font-bold tracking-tight">{level} darajasi — darslar</h1>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Har bir dars ketma-ket ochiladi. Keyingi darsga o'tish uchun testdan kamida 70% to'plang.
          </p>
        </div>

        <div className="grid gap-3">
          {Array.from({ length: LESSONS_PER_LEVEL }, (_, i) => i + 1).map((pos) => {
            const p = progress[pos];
            const unlocked = isUnlocked(pos);
            const passed = p?.passed === true;

            return (
              <button
                key={pos}
                disabled={!unlocked}
                onClick={() => navigate(`/organish/${encodeURIComponent(subject)}/${encodeURIComponent(level)}/${pos}`)}
                className={`flex items-center justify-between rounded-2xl border p-5 text-left transition-base ${
                  unlocked
                    ? "border-border bg-card shadow-soft hover:border-primary/40"
                    : "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
                    passed ? "bg-success text-success-foreground" : unlocked ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {passed ? <CheckCircle2 className="h-5 w-5" /> : unlocked ? pos : <Lock className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-semibold">{pos}-dars</div>
                    <div className="text-xs text-muted-foreground">
                      {passed ? `O'tilgan · ${Math.round(p.best_percentage)}%` : unlocked ? "Boshlash mumkin" : "Avval oldingi darsni 70%+ ga yeching"}
                    </div>
                  </div>
                </div>
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
