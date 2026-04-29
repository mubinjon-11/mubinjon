import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { levelColor } from "@/lib/constants";
import { CheckCircle2, XCircle, Trophy, Home, RotateCw } from "lucide-react";

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const s = location.state as any;
  if (!s) return <Navigate to="/dashboard" replace />;

  const { score, total, percentage, level, subject, topic, mode, questions, answers } = s;
  const wrong = total - score;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 md:py-12 max-w-3xl">
        <div className="rounded-2xl gradient-hero p-8 md:p-10 text-primary-foreground shadow-glow mb-6 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Test yakunlandi!</h1>
          <p className="opacity-90 mb-6">{subject} {topic && `· ${topic}`}</p>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
            <div className="rounded-xl bg-white/15 backdrop-blur p-4">
              <div className="text-3xl font-bold">{score}</div>
              <div className="text-xs opacity-80">To'g'ri</div>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur p-4">
              <div className="text-3xl font-bold">{wrong}</div>
              <div className="text-xs opacity-80">Noto'g'ri</div>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur p-4">
              <div className="text-3xl font-bold">{percentage.toFixed(0)}%</div>
              <div className="text-xs opacity-80">Ball</div>
            </div>
          </div>

          {mode === "daraja" && (
            <div>
              <div className="text-sm opacity-80 mb-2">Sizning darajangiz:</div>
              <Badge className={`${levelColor(level)} text-lg px-4 py-1.5`}>{level}</Badge>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            <Home className="h-4 w-4 mr-2" /> Bosh sahifa
          </Button>
          <Button onClick={() => navigate(mode === "daraja" ? "/test/daraja" : "/test/yaratish")}>
            <RotateCw className="h-4 w-4 mr-2" /> Yangi test
          </Button>
        </div>

        <h2 className="text-xl font-bold mb-4">Savollar tahlili</h2>
        <div className="space-y-3">
          {questions.map((q: any, i: number) => {
            const userAns = answers[i];
            const isCorrect = userAns === q.correct_index;
            return (
              <div key={i} className={`rounded-xl border-2 p-4 ${isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                <div className="flex items-start gap-3">
                  {isCorrect ? <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-medium mb-2">{i + 1}. {q.question}</p>
                    <div className="text-sm space-y-1">
                      <div>Sizning javobingiz: <span className={isCorrect ? "text-success font-medium" : "text-destructive font-medium"}>{q.options[userAns] ?? "—"}</span></div>
                      {!isCorrect && <div>To'g'ri javob: <span className="text-success font-medium">{q.options[q.correct_index]}</span></div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
