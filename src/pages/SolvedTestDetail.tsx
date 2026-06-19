import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { format } from "date-fns";

interface Q {
  question: string;
  options: string[];
  correct_index: number;
  image_url?: string;
}

interface ResultDetail {
  id: string;
  subject: string;
  topic: string | null;
  mode: string;
  score: number;
  total: number;
  percentage: number;
  level: string | null;
  created_at: string;
  test_id: string | null;
  answers: number[] | null;
  questions_snapshot: Q[] | null;
}

export default function SolvedTestDetail() {
  const { resultId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ResultDetail | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !resultId) return;
    (async () => {
      const { data: r, error } = await supabase
        .from("results")
        .select("*")
        .eq("id", resultId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !r) {
        navigate("/yechilgan");
        return;
      }
      const row = r as unknown as ResultDetail;
      setData(row);

      let qs: Q[] = Array.isArray(row.questions_snapshot) ? row.questions_snapshot : [];
      if ((!qs || qs.length === 0) && row.test_id) {
        const { data: qrows } = await supabase
          .from("questions")
          .select("question, options, correct_index, position")
          .eq("test_id", row.test_id)
          .order("position", { ascending: true });
        qs = (qrows ?? []).map((q: any) => ({
          question: q.question,
          options: Array.isArray(q.options) ? q.options : [],
          correct_index: q.correct_index,
        }));
      }
      setQuestions(qs);
      setLoading(false);
    })();
  }, [user, resultId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;
  const answers = data.answers ?? [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-10 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/yechilgan")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Orqaga
        </Button>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft mb-6">
          <h1 className="text-2xl font-bold mb-1">{data.subject}{data.topic ? ` · ${data.topic}` : ""}</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {data.mode === "daraja" ? "Daraja aniqlash" : "Oddiy test"} ·{" "}
            {format(new Date(data.created_at), "dd.MM.yyyy HH:mm")}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-muted-foreground">Natija: </span><span className="font-semibold">{data.score}/{data.total}</span></div>
            <div><span className="text-muted-foreground">Foiz: </span><span className="font-semibold">{Math.round(Number(data.percentage))}%</span></div>
            {data.level && <div><span className="text-muted-foreground">Daraja: </span><span className="font-semibold">{data.level}</span></div>}
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Bu test uchun savollar saqlanmagan.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, i) => {
              const userIdx = answers[i] ?? -1;
              const correctIdx = q.correct_index;
              const isCorrect = userIdx === correctIdx;
              return (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold leading-relaxed flex-1">
                      {i + 1}. {q.question}
                    </h3>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                      isCorrect ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}>
                      {isCorrect ? <><Check className="h-3 w-3" /> To'g'ri</> : <><X className="h-3 w-3" /> Noto'g'ri</>}
                    </span>
                  </div>
                  {q.image_url && (
                    <img src={q.image_url} alt="" loading="lazy"
                      className="w-full max-h-72 object-contain rounded-xl border border-border bg-secondary/30 mb-3" />
                  )}
                  <div className="space-y-2">
                    {q.options.map((opt, idx) => {
                      const isUser = idx === userIdx;
                      const isRight = idx === correctIdx;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border-2 flex items-start gap-3 ${
                            isRight
                              ? "border-success bg-success/5"
                              : isUser
                              ? "border-destructive bg-destructive/5"
                              : "border-border"
                          }`}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold">
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="pt-0.5 flex-1">{opt}</span>
                          <div className="flex flex-col items-end gap-1 text-xs">
                            {isUser && <span className="font-medium text-muted-foreground">Sizning javobingiz</span>}
                            {isRight && <span className="font-medium text-success">To'g'ri javob</span>}
                          </div>
                        </div>
                      );
                    })}
                    {userIdx === -1 && (
                      <p className="text-xs text-muted-foreground italic">Javob belgilanmagan</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
