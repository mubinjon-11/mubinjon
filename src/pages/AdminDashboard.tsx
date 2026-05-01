import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Mail, Award } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  role: string | null;
  results: { subject: string; level: string | null; percentage: number; created_at: string }[];
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserRow[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: roles }, { data: results }] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase
          .from("results")
          .select("user_id, subject, level, percentage, created_at, mode")
          .order("created_at", { ascending: false }),
      ]);

      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      const resultsMap = new Map<string, UserRow["results"]>();
      (results ?? []).forEach((r: any) => {
        const arr = resultsMap.get(r.user_id) ?? [];
        if (!arr.find((x) => x.subject === r.subject)) {
          arr.push({
            subject: r.subject,
            level: r.level,
            percentage: Number(r.percentage),
            created_at: r.created_at,
          });
        }
        resultsMap.set(r.user_id, arr);
      });

      const merged: UserRow[] = (profiles ?? []).map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at,
        role: roleMap.get(p.id) ?? null,
        results: resultsMap.get(p.id) ?? [],
      }));

      merged.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const totalUsers = rows.length;
  const totalStudents = rows.filter((r) => r.role === "oquvchi").length;
  const totalTeachers = rows.filter((r) => r.role === "oqituvchi").length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Saytni kuzatish</h1>
          <p className="text-muted-foreground mt-1">
            Saytga ro'yxatdan o'tgan barcha foydalanuvchilar va ularning fanlar bo'yicha darajalari.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Jami foydalanuvchilar</div>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">O'quvchilar</div>
              <div className="text-2xl font-bold">{totalStudents}</div>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">O'qituvchilar</div>
              <div className="text-2xl font-bold">{totalTeachers}</div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              Hozircha foydalanuvchilar yo'q.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ism</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fanlar bo'yicha darajalari</TableHead>
                  <TableHead>Ro'yxatdan o'tdi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                    <TableCell>
                      {u.role ? (
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin"
                            ? "Admin"
                            : u.role === "oqituvchi"
                            ? "O'qituvchi"
                            : "O'quvchi"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.results.length === 0 ? (
                        <span className="text-muted-foreground text-sm">Hali test topshirmagan</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {u.results.map((r, i) => (
                            <Badge key={i} variant="outline" className="font-normal">
                              {r.subject}: {r.level ?? `${Math.round(r.percentage)}%`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.created_at).toLocaleDateString("uz-UZ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>
    </div>
  );
}
