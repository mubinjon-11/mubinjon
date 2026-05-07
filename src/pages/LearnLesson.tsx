import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getLevelsForSubject, LEARNING_SUBJECTS } from "@/lib/constants";
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight, BookOpen, ArrowRight, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { ListenText } from "@/components/ListenText";

interface Q { question: string; options: string[]; correct_index: number }

export default function LearnLesson() {
  const { subject: rawSubject, level: rawLevel, position: rawPos } = useParams();
  const subject = decodeURIComponent(rawSubject ?? "");
  const level = decodeURIComponent(rawLevel ?? "");
  const position = parseInt(rawPos ?? "1", 10);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accessOk, setAccessOk] = useState(false);
  const [lesson, setLesson] = useState<{ title: string; content: string; questions: Q[] } | null>(null);
  const [phase, setPhase] = useState<"lesson" | "quiz" | "result">("lesson");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; percentage: number; passed: boolean } | null>(null);

  const validSubject = (LEARNING_SUBJECTS as readonly string[]).includes(subject);
  const levels = validSubject ? getLevelsForSubject(subject) : [];
  const validLevel = levels.includes(level);

  useEffect(() => {
    if (!validSubject || !validLevel || isNaN(position) || position < 1 || position > 8) {
      navigate("/organish", { replace: true });
      return;
    }
    if (!user) return;

    (async () => {
      // Access check: previous lesson must be passed
      if (position > 1) {
        const { data: prev } = await supabase
          .from("learning_progress")
          .select("passed")
          .eq("user_id", user.id)
          .eq("subject", subject)
          .eq("level", level)
          .eq("position", position - 1)
          .maybeSingle();
        if (!prev?.passed) {
          toast.error("Avval oldingi darsni 70%+ ga yeching");
          navigate(`/organish/${encodeURIComponent(subject)}/${encodeURIComponent(level)}`, { replace: true });
          return;
        }
      }
      setAccessOk(true);

      // Load or generate lesson
      const { data, error } = await supabase.functions.invoke("generate-lesson", {
        body: { subject, level, position },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Dars yuklanmadi");
        navigate(`/organish/${encodeURIComponent(subject)}/${encodeURIComponent(level)}`, { replace: true });
        return;
      }
      const l = data.lesson;
      setLesson({
        title: l.title,
        content: l.content,
        questions: Array.isArray(l.questions) ? l.questions : [],
      });
      setLoading(false);
    })();
  }, [user, subject, level, position, validSubject, validLevel, navigate]);

  const submitQuiz = async () => {
    if (!lesson || !user) return;
    setSubmitting(true);
    let score = 0;
    lesson.questions.forEach((q, i) => { if (answers[i] === q.correct_index) score++; });
    const total = lesson.questions.length;
    const percentage = (score / total) * 100;
    const passed = percentage >= 70;

    // Upsert progress (keep best)
    const { data: existing } = await supabase
      .from("learning_progress")
      .select("id, best_percentage, passed")
      .eq("user_id", user.id)
      .eq("subject", subject).eq("level", level).eq("position", position)
      .maybeSingle();

    const newBest = !existing || percentage > Number(existing.best_percentage);
    const finalPassed = (existing?.passed ?? false) || passed;

    if (existing) {
      if (newBest || (passed && !existing.passed)) {
        await supabase.from("learning_progress").update({
          best_score: newBest ? score : undefined as any,
          best_total: newBest ? total : undefined as any,
          best_percentage: newBest ? percentage : undefined as any,
          passed: finalPassed,
          passed_at: passed && !existing.passed ? new Date().toISOString() : undefined as any,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      }
    } else {
      await supabase.from("learning_progress").insert({
        user_id: user.id, subject, level, position,
        best_score: score, best_total: total, best_percentage: percentage,
        passed, passed_at: passed ? new Date().toISOString() : null,
      });
    }

    setResult({ score, total, percentage, passed });
    setPhase("result");
    setSubmitting(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!accessOk || !lesson) return null;

  const backUrl = `/organish/${encodeURIComponent(subject)}/${encodeURIComponent(level)}`;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-10 max-w-3xl">
        <Link to={backUrl} className="text-sm text-muted-foreground hover:text-foreground">← {subject} · {level}</Link>

        {phase === "lesson" && (
          <>
            <div className="mt-3 mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{position}-dars</div>
                <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
              </div>
            </div>
            <article className="prose prose-sm md:prose-base max-w-none rounded-2xl border border-border bg-card p-6 shadow-soft whitespace-pre-wrap">
              <ListenText text={lesson.content} />
            </article>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setPhase("quiz")} className="gradient-primary">
                Testga o'tish <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {phase === "quiz" && (
          <QuizView
            subject={subject}
            questions={lesson.questions}
            current={current} setCurrent={setCurrent}
            answers={answers} setAnswers={setAnswers}
            onSubmit={submitQuiz} submitting={submitting}
          />
        )}

        {phase === "result" && result && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 shadow-soft text-center">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${result.passed ? "bg-success" : "bg-warning"}`}>
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mt-4">{result.passed ? "Tabriklaymiz!" : "Yana urinib ko'ring"}</h2>
            <p className="text-muted-foreground mt-2">
              Natija: {result.score}/{result.total} ({Math.round(result.percentage)}%)
            </p>
            <p className="text-sm mt-2">
              {result.passed ? "Keyingi darsga o'tishingiz mumkin." : "Keyingi darsga o'tish uchun kamida 70% to'plash kerak."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => { setPhase("lesson"); setAnswers({}); setCurrent(0); }}>
                Darsni qayta o'qish
              </Button>
              {result.passed && position < 8 ? (
                <Button onClick={() => navigate(`/organish/${encodeURIComponent(subject)}/${encodeURIComponent(level)}/${position + 1}`)} className="gradient-primary">
                  Keyingi dars <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => navigate(backUrl)} className="gradient-primary">Darslar ro'yxati</Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function QuizView({ questions, current, setCurrent, answers, setAnswers, onSubmit, submitting }: any) {
  const q = questions[current];
  const allAnswered = Object.keys(answers).length === questions.length;
  const selected = answers[current];

  return (
    <>
      <div className="mt-3 mb-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Test</span><span>{current + 1} / {questions.length}</span>
        </div>
        <Progress value={((current + 1) / questions.length) * 100} />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft mb-6">
        <h3 className="font-semibold mb-5">{current + 1}. {q.question}</h3>
        <div className="space-y-3">
          {q.options.map((opt: string, idx: number) => {
            const isSel = selected === idx;
            return (
              <button key={idx} onClick={() => setAnswers({ ...answers, [current]: idx })}
                className={`w-full text-left p-4 rounded-xl border-2 transition-base ${isSel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <div className="flex gap-3">
                  <div className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-sm font-semibold ${isSel ? "gradient-primary text-primary-foreground" : "bg-secondary"}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="pt-0.5">{opt}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrent(current - 1)} disabled={current === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Oldingi
        </Button>
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent(current + 1)}>Keyingi <ChevronRight className="h-4 w-4 ml-1" /></Button>
        ) : (
          <Button disabled={!allAnswered || submitting} onClick={onSubmit} className="gradient-accent">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Tugatish
          </Button>
        )}
      </div>
    </>
  );
}
