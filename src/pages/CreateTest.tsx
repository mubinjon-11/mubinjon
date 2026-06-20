import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUBJECTS, getLevelsForSubject } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, Sparkles, BookOpen } from "lucide-react";

export default function CreateTest() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("10");
  const [loading, setLoading] = useState(false);

  const levels = subject ? getLevelsForSubject(subject) : [];

  const handleStart = async () => {
    if (!subject || !level) {
      toast.error("Fan va darajani tanlang");
      return;
    }
    const n = parseInt(count, 10);
    if (isNaN(n) || n < 3 || n > 30) {
      toast.error("Savollar soni 3 dan 30 gacha bo'lishi kerak");
      return;
    }
    const topicTrimmed = topic.trim();
    setLoading(true);
    try {
      // 1) Look for teacher tests matching subject+topic (only if topic provided)
      if (topicTrimmed) {
        const { data: teacherTests } = await supabase
          .from("tests")
          .select("id, title, question_count")
          .ilike("subject", subject)
          .ilike("topic", topicTrimmed)
          .gt("question_count", 0)
          .limit(1);

        if (teacherTests && teacherTests.length > 0) {
          toast.success("O'qituvchi testi topildi!");
          navigate(`/test/${teacherTests[0].id}/run`, {
            state: { mode: "oddiy", subject, topic: topicTrimmed },
          });
          return;
        }
      }

      // 2) Generate via AI
      toast.message("AI test tayyorlamoqda...");
      const { data, error } = await supabase.functions.invoke("generate-test", {
        body: { subject, topic: topicTrimmed, level, count: n, mode: "oddiy" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      navigate("/test/ai/run", {
        state: { questions: data.questions, mode: "oddiy", subject, topic: topicTrimmed, level },
      });
    } catch (e: any) {
      toast.error(e.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 md:py-12 max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Oddiy test yaratish</h1>
        </div>
        <p className="text-muted-foreground mb-8">Testni yechib bilimingizni oshiring. Teacher: Mubinjon.</p>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-5">
          <div className="space-y-2">
            <Label>Sinf</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger><SelectValue placeholder="Sinfni tanlang" /></SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => <SelectItem key={g} value={g}>{g}-sinf</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fan</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Fanni tanlang" /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mavzu</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Masalan: Algebraik ifodalar" maxLength={200} />
          </div>

          <div className="space-y-2">
            <Label>Savollar soni</Label>
            <Input type="number" min={3} max={30} value={count} onChange={(e) => setCount(e.target.value)} />
          </div>

          <Button onClick={handleStart} disabled={loading} size="lg" className="w-full gradient-primary">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Tayyorlanmoqda...</> : <><BookOpen className="h-4 w-4 mr-2" /> Testni boshlash</>}
          </Button>
        </div>
      </main>
    </div>
  );
}
