import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Mail, Award, Trash2, Ban, Clock, ShieldCheck, FileText, Eye, MoreVertical, UserCog } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  role: string | null;
  is_blocked: boolean;
  blocked_until: string | null;
  results: { subject: string; level: string | null; percentage: number; created_at: string }[];
}

interface TestRow {
  id: string;
  title: string;
  subject: string;
  topic: string;
  grade: string | null;
  question_count: number;
  created_at: string;
  teacher_id: string;
  teacher_name: string | null;
  teacher_email: string | null;
}

interface QuestionRow {
  id: string;
  question: string;
  options: any;
  correct_index: number;
  position: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);

  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<UserRow | null>(null);
  const [tempBlockUser, setTempBlockUser] = useState<UserRow | null>(null);
  const [tempHours, setTempHours] = useState("24");
  const [confirmDeleteTest, setConfirmDeleteTest] = useState<TestRow | null>(null);
  const [viewTest, setViewTest] = useState<TestRow | null>(null);
  const [teacherTestsUser, setTeacherTestsUser] = useState<UserRow | null>(null);
  const [viewQuestions, setViewQuestions] = useState<QuestionRow[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [roleUser, setRoleUser] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState<string>("oquvchi");
  const [savingRole, setSavingRole] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: results }, { data: testsData }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, created_at, is_blocked, blocked_until"),
      supabase.from("user_roles").select("user_id, role"),
      supabase
        .from("results")
        .select("user_id, subject, level, percentage, created_at, mode")
        .order("created_at", { ascending: false }),
      supabase
        .from("tests")
        .select("id, title, subject, topic, grade, question_count, created_at, teacher_id")
        .order("created_at", { ascending: false }),
    ]);

    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));

    const profileMap = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => profileMap.set(p.id, p));

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
      is_blocked: !!p.is_blocked,
      blocked_until: p.blocked_until,
      role: roleMap.get(p.id) ?? null,
      results: resultsMap.get(p.id) ?? [],
    }));

    merged.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setRows(merged);

    const mergedTests: TestRow[] = (testsData ?? []).map((t: any) => {
      const tp = profileMap.get(t.teacher_id);
      return {
        id: t.id,
        title: t.title,
        subject: t.subject,
        topic: t.topic,
        grade: t.grade,
        question_count: t.question_count,
        created_at: t.created_at,
        teacher_id: t.teacher_id,
        teacher_name: tp?.full_name ?? null,
        teacher_email: tp?.email ?? null,
      };
    });
    setTests(mergedTests);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalUsers = rows.length;
  const totalStudents = rows.filter((r) => r.role === "oquvchi").length;
  const totalTeachers = rows.filter((r) => r.role === "oqituvchi").length;
  const selectedTeacherTests = teacherTestsUser
    ? tests.filter((t) => t.teacher_id === teacherTestsUser.id)
    : [];

  const blockStatus = (u: UserRow) => {
    if (u.is_blocked) return { label: "Bloklangan", variant: "destructive" as const };
    if (u.blocked_until && new Date(u.blocked_until).getTime() > Date.now())
      return {
        label: `Vaqtinchalik (${new Date(u.blocked_until).toLocaleString("uz-UZ")})`,
        variant: "secondary" as const,
      };
    return null;
  };

  const handlePermanentBlock = async (u: UserRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: true, blocked_until: null })
      .eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success("Foydalanuvchi bloklandi");
    setConfirmBlock(null);
    load();
  };

  const handleTempBlock = async () => {
    if (!tempBlockUser) return;
    const hours = parseInt(tempHours);
    if (isNaN(hours) || hours <= 0) return toast.error("To'g'ri soatlar sonini kiriting");
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ blocked_until: until, is_blocked: false })
      .eq("id", tempBlockUser.id);
    if (error) return toast.error(error.message);
    toast.success(`${hours} soatga vaqtinchalik bloklandi`);
    setTempBlockUser(null);
    setTempHours("24");
    load();
  };

  const handleUnblock = async (u: UserRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: false, blocked_until: null })
      .eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success("Blok olib tashlandi");
    load();
  };

  const handleDelete = async (u: UserRow) => {
    const { error } = await supabase.functions.invoke("admin-delete-user", {
      body: { userId: u.id },
    });
    if (error) return toast.error(error.message);
    toast.success("Foydalanuvchi saytdan o'chirildi");
    setConfirmDelete(null);
    setTeacherTestsUser(null);
    load();
  };

  const handleDeleteTest = async (t: TestRow) => {
    await supabase.from("questions").delete().eq("test_id", t.id);
    const { error } = await supabase.from("tests").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Test o'chirildi");
    setConfirmDeleteTest(null);
    load();
  };

  const openViewTest = async (t: TestRow) => {
    setViewTest(t);
    setLoadingQuestions(true);
    const { data } = await supabase
      .from("questions")
      .select("id, question, options, correct_index, position")
      .eq("test_id", t.id)
      .order("position", { ascending: true });
    setViewQuestions((data as any) ?? []);
    setLoadingQuestions(false);
  };

  const openRoleDialog = (u: UserRow) => {
    setRoleUser(u);
    setNewRole(u.role ?? "oquvchi");
  };

  const handleSaveRole = async () => {
    if (!roleUser) return;
    setSavingRole(true);
    await supabase.from("user_roles").delete().eq("user_id", roleUser.id);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: roleUser.id, role: newRole as any });
    setSavingRole(false);
    if (error) return toast.error(error.message);
    toast.success("Rol o'zgartirildi");
    setRoleUser(null);
    load();
  };

  const ROLE_LABEL: Record<string, string> = {
    admin: "Admin",
    oqituvchi: "O'qituvchi",
    oquvchi: "O'quvchi",
  };

  // REPLACE_MARKER_OPENVIEW
    setViewTest(t);
    setLoadingQuestions(true);
    const { data } = await supabase
      .from("questions")
      .select("id, question, options, correct_index, position")
      .eq("test_id", t.id)
      .order("position", { ascending: true });
    setViewQuestions((data as any) ?? []);
    setLoadingQuestions(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Saytni kuzatish</h1>
          <p className="text-muted-foreground mt-1">
            Foydalanuvchilarni boshqaring va o'qituvchilar testlarini ko'rib chiqing.
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

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Foydalanuvchilar</TabsTrigger>
            <TabsTrigger value="tests">O'qituvchi testlari ({tests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
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
                      <TableHead>Holat</TableHead>
                      <TableHead>Fanlar</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((u) => {
                      const status = blockStatus(u);
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{u.email || "—"}</TableCell>
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
                            {status ? (
                              <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Faol</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {u.results.length === 0 ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                                {u.results.map((r, i) => (
                                  <Badge key={i} variant="outline" className="font-normal text-xs">
                                    {r.subject}: {r.level ?? `${Math.round(r.percentage)}%`}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Amallar menyusi">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-60">
                                {status && (
                                  <DropdownMenuItem onSelect={() => handleUnblock(u)}>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Blokdan chiqarish
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem disabled={u.role === "admin"} onSelect={() => setConfirmBlock(u)}>
                                  <Ban className="mr-2 h-4 w-4" />
                                  Foydalanuvchini bloklash
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled={u.role === "admin"} onSelect={() => setTempBlockUser(u)}>
                                  <Clock className="mr-2 h-4 w-4" />
                                  Vaqtinchalik bloklash
                                </DropdownMenuItem>
                                {u.role === "oqituvchi" && (
                                  <DropdownMenuItem onSelect={() => setTeacherTestsUser(u)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Yaratgan testlarini ko'rish
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={u.role === "admin"}
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => setConfirmDelete(u)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Saytdan chiqarib tashlash
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="tests">
            <Card className="overflow-hidden">
              {loading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : tests.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  O'qituvchilar tomonidan yaratilgan testlar yo'q.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test nomi</TableHead>
                      <TableHead>Fan / Mavzu</TableHead>
                      <TableHead>Sinf</TableHead>
                      <TableHead>Savollar</TableHead>
                      <TableHead>O'qituvchi</TableHead>
                      <TableHead>Sana</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell className="text-sm">
                          <div>{t.subject}</div>
                          <div className="text-muted-foreground text-xs">{t.topic}</div>
                        </TableCell>
                        <TableCell className="text-sm">{t.grade ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{t.question_count}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{t.teacher_name ?? "—"}</div>
                          <div className="text-muted-foreground text-xs">{t.teacher_email ?? ""}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(t.created_at).toLocaleDateString("uz-UZ")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => openViewTest(t)}>
                              <Eye className="h-3.5 w-3.5" />
                              Ko'rish
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteTest(t)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              O'chir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete user */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Foydalanuvchini o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDelete?.full_name || confirmDelete?.email}</strong> saytdan butunlay o'chiriladi.
              Uning barcha natijalari va ma'lumotlari yo'qoladi. Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Ha, o'chir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent block */}
      <AlertDialog open={!!confirmBlock} onOpenChange={(o) => !o && setConfirmBlock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Foydalanuvchini bloklash</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmBlock?.full_name || confirmBlock?.email}</strong> saytga kira olmaydi.
              Keyinchalik blokni olib tashlashingiz mumkin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmBlock && handlePermanentBlock(confirmBlock)}>
              Blokla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temp block */}
      <Dialog open={!!tempBlockUser} onOpenChange={(o) => !o && setTempBlockUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vaqtinchalik bloklash</DialogTitle>
            <DialogDescription>
              {tempBlockUser?.full_name || tempBlockUser?.email} qancha vaqtga bloklansin?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Soatlar soni</Label>
            <Input
              type="number"
              min="1"
              value={tempHours}
              onChange={(e) => setTempHours(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap pt-1">
              {[1, 24, 72, 168].map((h) => (
                <Button key={h} type="button" size="sm" variant="outline" onClick={() => setTempHours(String(h))}>
                  {h === 1 ? "1 soat" : h === 24 ? "1 kun" : h === 72 ? "3 kun" : "1 hafta"}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTempBlockUser(null)}>Bekor</Button>
            <Button onClick={handleTempBlock}>Blokla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher tests for selected user */}
      <Dialog open={!!teacherTestsUser} onOpenChange={(o) => !o && setTeacherTestsUser(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>O'qituvchi testlari</DialogTitle>
            <DialogDescription>
              {teacherTestsUser?.full_name || teacherTestsUser?.email} yaratgan testlar ro'yxati
            </DialogDescription>
          </DialogHeader>
          {selectedTeacherTests.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Bu o'qituvchi hali test yaratmagan.</div>
          ) : (
            <div className="space-y-3">
              {selectedTeacherTests.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.subject} • {t.topic} {t.grade ? `• ${t.grade}-sinf` : ""} • {t.question_count} savol
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setTeacherTestsUser(null); openViewTest(t); }}>
                      <Eye className="h-3.5 w-3.5" />
                      Ko'rish
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setTeacherTestsUser(null); setConfirmDeleteTest(t); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                      O'chir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeacherTestsUser(null)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete test */}
      <AlertDialog open={!!confirmDeleteTest} onOpenChange={(o) => !o && setConfirmDeleteTest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Testni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDeleteTest?.title}</strong> testi va uning barcha savollari o'chiriladi.
              Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteTest && handleDeleteTest(confirmDeleteTest)}
            >
              Ha, o'chir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View test questions */}
      <Dialog open={!!viewTest} onOpenChange={(o) => !o && setViewTest(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewTest?.title}
            </DialogTitle>
            <DialogDescription>
              {viewTest?.subject} • {viewTest?.topic} {viewTest?.grade ? `• ${viewTest.grade}-sinf` : ""}
            </DialogDescription>
          </DialogHeader>
          {loadingQuestions ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : viewQuestions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Savollar yo'q.</p>
          ) : (
            <ol className="space-y-4 list-decimal list-inside">
              {viewQuestions.map((q) => {
                const opts = Array.isArray(q.options) ? q.options : [];
                return (
                  <li key={q.id} className="border rounded-lg p-3 space-y-2">
                    <div className="font-medium">{q.question}</div>
                    <div className="space-y-1">
                      {opts.map((opt: string, i: number) => (
                        <div
                          key={i}
                          className={`text-sm px-2 py-1 rounded ${
                            i === q.correct_index
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                          {i === q.correct_index && " ✓"}
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <DialogFooter>
            {viewTest && (
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmDeleteTest(viewTest);
                  setViewTest(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Testni o'chir
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewTest(null)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
