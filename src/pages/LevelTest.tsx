import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUBJECTS, levelColor } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, Target, History } from "lucide-react";

interface LevelResult {
  subject: string;
  level: string | null;
  percentage: number;
  created_at: string;
}

export default function LevelTest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<LevelResult[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("results")
        .select("subject, level, percentage, created_at")
        .eq("user_id", user.id)
        .eq("mode", "daraja")
        .order("created_at", { ascending: false });
      setHistory((data as any) ?? []);
    })();
  }, [user]);

  // Best (latest) per subject
  const bestPerSubject = new Map<string, LevelResult>();
  history.forEach((r) => {
    if (!bestPerSubject.has(r.subject)) bestPerSubject.set(r.subject, r);
  });

  const handleStart = async () => {
    if (!subject) {
      toast.error("Fanni tanlang");
      return;
    }
    if (isGuest) {
      toast.error("Bu funksiyadan foydalanish uchun akkaunt oching");
      return;
    }
    setLoading(true);
    try {
      toast.message("AI 20 ta savol tayyorlamoqda...");
      const { data, error } = await supabase.functions.invoke("generate-test", {
        body: { subject, mode: "daraja" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      navigate("/test/ai/run", {
        state: { questions: data.questions, mode: "daraja", subject, topic: "Daraja aniqlash" },
      });
    } catch (e: any) {
      toast.error(e.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const isGuest = Boolean((user?.user_metadata as any)?.is_guest);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 md:py-12 max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-accent">
            <Target className="h-5 w-5 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Darajani aniqlash</h1>
        </div>
        <p className="text-muted-foreground mb-4">
          Tillar xalqaro CEFR (A1–C2), English Listening — IELTS (4.5–8.0), qolgan fanlar Milliy sertifikat (C–A+) standartida baholanadi.
        </p>

        {isGuest && (
          <div className="mb-6 rounded-xl border-2 border-destructive bg-destructive/10 p-4">
            <p className="text-destructive font-bold text-base">
              Bu funksiyadan foydalanish uchun siz akkaunt ochishingiz kerak!
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-5 mb-8">
          <div className="space-y-2">
            <Label>Fan</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Fanni tanlang" /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleStart} disabled={loading} size="lg" className="w-full gradient-accent">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Savollar tayyorlanmoqda...</> : "Testni boshlash"}
          </Button>
        </div>

        {bestPerSubject.size > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Mening darajalarim</h2>
            </div>
            <div className="space-y-2">
              {Array.from(bestPerSubject.values()).map((r) => (
                <div key={r.subject} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <div className="font-medium">{r.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("uz-UZ")} · {Math.round(Number(r.percentage))}%
                    </div>
                  </div>
                  {r.level && (
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${levelColor(r.level)}`}>{r.level}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
