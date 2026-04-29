import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUBJECTS } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, Target } from "lucide-react";

export default function LevelTest() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!subject) {
      toast.error("Fanni tanlang");
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
        <p className="text-muted-foreground mb-8">O'z darajangizni bilib oling. Teacher: Mubinjon.</p>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-5">
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
      </main>
    </div>
  );
}
