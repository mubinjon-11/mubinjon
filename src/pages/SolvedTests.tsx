import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Loader2, ClipboardCheck, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface ResultRow {
  id: string;
  subject: string;
  topic: string | null;
  mode: string;
  score: number;
  total: number;
  percentage: number;
  level: string | null;
  created_at: string;
}

export default function SolvedTests() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("results")
        .select("id, subject, topic, mode, score, total, percentage, level, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data as ResultRow[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-10 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft">
            <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Yechilgan testlar</h1>
            <p className="text-sm text-muted-foreground">Barcha yechgan testlaringizni ko'rib chiqing</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            Hali yechilgan test mavjud emas.
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <Link
                key={r.id}
                to={`/yechilgan/${r.id}`}
                className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-soft hover:border-primary/40 transition-base flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {r.subject}{r.topic ? ` · ${r.topic}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.mode === "daraja" ? "Daraja aniqlash" : "Oddiy test"} ·{" "}
                    {format(new Date(r.created_at), "dd.MM.yyyy HH:mm")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold">{r.score}/{r.total}</div>
                    <div className="text-xs text-muted-foreground">{Math.round(Number(r.percentage))}%{r.level ? ` · ${r.level}` : ""}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
