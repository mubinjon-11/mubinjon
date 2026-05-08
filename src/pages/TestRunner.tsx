import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { calculateLevel, calculateLevelWeighted } from "@/lib/constants";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Volume2 } from "lucide-react";
import { ListenText } from "@/components/ListenText";

interface Question {
  question: string;
  options: string[];
  correct_index: number;
}

export default function TestRunner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const state = location.state as any;
  const mode: "oddiy" | "daraja" = state?.mode ?? "oddiy";
  const subject: string = state?.subject ?? "";
  const topic: string = state?.topic ?? "";
  const testId: string | undefined = params.testId;

  useEffect(() => {
    (async () => {
      if (state?.questions) {
        setQuestions(state.questions);
        setLoading(false);
        return;
      }
      if (testId) {
        const { data, error } = await supabase
          .from("questions")
          .select("question, options, correct_index, position")
          .eq("test_id", testId)
          .order("position", { ascending: true });
        if (error || !data?.length) {
          toast.error("Test topilmadi");
          navigate(-1);
          return;
        }
        setQuestions(data.map((q: any) => ({
          question: q.question,
          options: Array.isArray(q.options) ? q.options : [],
          correct_index: q.correct_index,
        })));
        setLoading(false);
        return;
      }
      toast.error("Test ma'lumotlari topilmadi");
      navigate("/dashboard");
    })();
  }, [state, testId, navigate]);

  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    let score = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct_index) score++; });
    const total = questions.length;
    const percentage = (score / total) * 100;
    const level =
      mode === "daraja"
        ? calculateLevelWeighted(
            questions as any,
            questions.map((_, i) => answers[i] ?? -1),
            questions.map((q) => q.correct_index),
            subject,
          )
        : calculateLevel(percentage, subject);

    const { error } = await supabase.from("results").insert({
      user_id: user.id,
      subject,
      topic,
      mode,
      score,
      total,
      percentage,
      level,
      test_id: testId ?? null,
    });
    if (error) {
      toast.error("Natijani saqlashda xatolik");
      setSubmitting(false);
      return;
    }
    navigate("/natija", {
      state: { score, total, percentage, level, subject, topic, mode, questions, answers },
      replace: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const q = questions[current];
  if (!q) return null;
  const selected = answers[current];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-10 max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span className="font-medium">{subject} {topic && `· ${topic}`}</span>
            <span>{current + 1} / {questions.length}</span>
          </div>
          <Progress value={((current + 1) / questions.length) * 100} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-soft mb-6">
          {subject === "English Listening" ? (
            <ListeningPrompt index={current} text={q.question} />
          ) : (
            <h2 className="text-lg md:text-xl font-semibold mb-6 leading-relaxed">
              {current + 1}. <ListenText text={q.question} />
            </h2>
          )}
          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              const isSel = selected === idx;
              const isListeningOpt = subject === "English Listening";
              const speakOpt = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!("speechSynthesis" in window)) return;
                const u = new SpeechSynthesisUtterance(opt);
                u.lang = "en-US"; u.rate = 0.9;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(u);
              };
              return (
                <button
                  key={idx}
                  onClick={() => setAnswers({ ...answers, [current]: idx })}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-base ${
                    isSel
                      ? "border-primary bg-primary/5 shadow-soft"
                      : "border-border hover:border-primary/40 hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                      isSel ? "gradient-primary text-primary-foreground" : "bg-secondary text-foreground"
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="pt-0.5 flex-1">{opt}</span>
                    {isListeningOpt && (
                      <span
                        role="button"
                        onClick={speakOpt}
                        className="ml-2 inline-flex items-center justify-center h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 text-foreground"
                        title="Variantni tinglash"
                      >
                        <Volume2 className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setCurrent(current - 1)} disabled={current === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Oldingi
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-7 w-7 rounded text-xs font-medium transition-base ${
                  i === current
                    ? "gradient-primary text-primary-foreground"
                    : answers[i] !== undefined
                    ? "bg-success/20 text-success"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent(current + 1)}>
              Keyingi <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!allAnswered || submitting} className="gradient-accent">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Tugatish
            </Button>
          )}
        </div>

        {!allAnswered && current === questions.length - 1 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Tugatish uchun barcha savollarga javob bering ({Object.keys(answers).length}/{questions.length})
          </p>
        )}
      </main>
    </div>
  );
}

/**
 * Listening question prompt: extracts the [LISTEN: ...] phrase from the question text,
 * hides any written words, and auto-plays the audio when the question changes.
 */
function ListeningPrompt({ index, text }: { index: number; text: string }) {
  const m = text.match(/\[LISTEN:\s*([^\]]+)\]/);
  const phrase = (m?.[1] ?? text).trim();

  useEffect(() => {
    if (!("speechSynthesis" in window) || !phrase) return;
    const u = new SpeechSynthesisUtterance(phrase);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    const t = setTimeout(() => window.speechSynthesis.speak(u), 250);
    return () => {
      clearTimeout(t);
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phrase]);

  const replay = () => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(phrase);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="mb-6">
      <div className="text-sm text-muted-foreground mb-3">
        {index + 1}. Audioni tinglang va to'g'ri javobni tanlang
      </div>
      <button
        type="button"
        onClick={replay}
        className="w-full flex items-center justify-center gap-3 rounded-2xl gradient-primary text-primary-foreground py-6 text-lg font-semibold shadow-soft hover:opacity-90 transition-base"
      >
        <Volume2 className="h-6 w-6" /> Audioni qayta eshitish
      </button>
    </div>
  );
}
