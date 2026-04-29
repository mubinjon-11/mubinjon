import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Loader2 } from "lucide-react";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("tests")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });
      setTests(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mening testlarim</h1>
            <p className="text-muted-foreground">Yaratgan testlaringiz ro'yxati</p>
          </div>
          <Button asChild className="gradient-primary">
            <Link to="/oqituvchi/yangi"><Plus className="h-4 w-4 mr-2" /> Yangi test</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : tests.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Hali test yaratilmagan</h3>
            <p className="text-muted-foreground mb-4">Birinchi testingizni yarating va o'quvchilar foydalansin.</p>
            <Button asChild className="gradient-primary"><Link to="/oqituvchi/yangi">Test yaratish</Link></Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map((t) => (
              <div key={t.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-base hover:shadow-elevated">
                <div className="text-xs text-muted-foreground mb-2">{t.subject} · {t.grade ? `${t.grade}-sinf` : "Sinf belgilanmagan"}</div>
                <h3 className="font-semibold text-lg mb-1">{t.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">Mavzu: {t.topic}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.question_count} ta savol</span>
                  <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("uz-UZ")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
