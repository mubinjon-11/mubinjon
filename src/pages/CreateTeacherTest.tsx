import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUBJECTS, GRADES } from "@/lib/constants";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

interface QInput {
  question: string;
  options: [string, string, string, string];
  correct_index: number;
}

const blank = (): QInput => ({ question: "", options: ["", "", "", ""], correct_index: 0 });

export default function CreateTeacherTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("");
  const [questions, setQuestions] = useState<QInput[]>([blank()]);
  const [saving, setSaving] = useState(false);

  const updateQ = (i: number, patch: Partial<QInput>) => {
    setQuestions(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };
  const updateOpt = (i: number, oi: number, v: string) => {
    setQuestions(questions.map((q, idx) => {
      if (idx !== i) return q;
      const opts = [...q.options] as [string, string, string, string];
      opts[oi] = v;
      return { ...q, options: opts };
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim() || !subject || !topic.trim() || !grade) {
      toast.error("Sarlavha, fan, mavzu va sinfni to'ldiring");
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim() || q.options.some((o) => !o.trim())) {
        toast.error(`${i + 1}-savol va uning barcha variantlarini to'ldiring`);
        return;
      }
    }
    setSaving(true);
    const { data: test, error } = await supabase.from("tests").insert({
      teacher_id: user.id,
      title: title.trim(),
      subject,
      topic: topic.trim(),
      grade,
      question_count: questions.length,
    }).select().single();

    if (error || !test) {
      toast.error("Testni saqlashda xatolik");
      setSaving(false);
      return;
    }

    const { error: qErr } = await supabase.from("questions").insert(
      questions.map((q, idx) => ({
        test_id: test.id,
        question: q.question.trim(),
        options: q.options,
        correct_index: q.correct_index,
        position: idx,
      }))
    );
    if (qErr) {
      toast.error("Savollarni saqlashda xatolik");
      setSaving(false);
      return;
    }
    toast.success("Test saqlandi!");
    navigate("/oqituvchi");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 md:py-12 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Yangi test yaratish</h1>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4 mb-6">
          <div className="space-y-2">
            <Label>Test sarlavhasi</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Masalan: 7-sinf algebra nazorat ishi" />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Sinf</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fan</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mavzu</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} />
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {questions.map((q, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{i + 1}-savol</h3>
                {questions.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <Textarea
                value={q.question}
                onChange={(e) => updateQ(i, { question: e.target.value })}
                placeholder="Savol matnini kiriting"
                className="mb-3"
                rows={2}
              />
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQ(i, { correct_index: oi })}
                      className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-base ${
                        q.correct_index === oi ? "gradient-primary text-primary-foreground" : "bg-secondary text-foreground"
                      }`}
                      title="To'g'ri javob deb belgilash"
                    >
                      {String.fromCharCode(65 + oi)}
                    </button>
                    <Input
                      value={opt}
                      onChange={(e) => updateOpt(i, oi, e.target.value)}
                      placeholder={`Variant ${String.fromCharCode(65 + oi)}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Harf tugmasini bosib to'g'ri javobni belgilang</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setQuestions([...questions, blank()])}>
            <Plus className="h-4 w-4 mr-2" /> Savol qo'shish
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Testni saqlash
          </Button>
        </div>
      </main>
    </div>
  );
}
