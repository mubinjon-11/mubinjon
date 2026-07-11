import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Trophy, Star, Flame, Crown, Target, Award, Languages, GraduationCap,
  Sparkles, TrendingUp, Zap, ClipboardCheck, BookOpen, Lock,
  Camera, Calendar, ChevronRight,
} from "lucide-react";
import {
  type ResultRow, totalXpFromResults, levelFromXp, computeStreak,
  evaluateAchievements, xpForResult,
} from "@/lib/stats";
import { format } from "date-fns";

const ICONS: Record<string, any> = {
  Trophy, Star, Flame, Crown, Target, Award, Languages, GraduationCap, Sparkles,
};

interface Achievement {
  id: string; code: string; name: string; description: string; icon: string; xp_reward: number;
}
interface UserAchievement { achievement_id: string; unlocked_at: string; }
interface Certificate { id: string; subject: string; level: string; score: number | null; issued_at: string; }
interface Profile { full_name: string | null; email: string | null; avatar_url: string | null; created_at: string; }

export default function Profile() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlocked, setUnlocked] = useState<Map<string, string>>(new Map());
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profRes, resultsRes, achRes, uaRes, certRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email, avatar_url, created_at").eq("id", user.id).maybeSingle(),
        supabase.from("results").select("id, subject, topic, mode, score, total, percentage, level, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("achievements").select("*").order("xp_reward"),
        supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", user.id),
        supabase.from("certificates").select("*").eq("user_id", user.id).order("issued_at", { ascending: false }),
      ]);
      setProfile(profRes.data as Profile);
      setResults((resultsRes.data as ResultRow[]) ?? []);
      setAchievements((achRes.data as Achievement[]) ?? []);
      setUnlocked(new Map(((uaRes.data as UserAchievement[]) ?? []).map((u) => [u.achievement_id, u.unlocked_at])));
      setCertificates((certRes.data as Certificate[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  // Derive stats
  const xp = totalXpFromResults(results);
  const { level, currentLevelXp, nextLevelXp, progress } = levelFromXp(xp);
  const streak = computeStreak(results);
  const perfectCount = results.filter((r) => r.percentage >= 100).length;
  const subjectsCount = new Set(results.map((r) => r.subject)).size;
  const avgScore = results.length
    ? Math.round(results.reduce((s, r) => s + Number(r.percentage), 0) / results.length)
    : 0;

  // Auto-unlock new achievements
  useEffect(() => {
    if (!user || loading || achievements.length === 0) return;
    const checks = evaluateAchievements(results, streak.current, streak.longest, level);
    const byCode = new Map(achievements.map((a) => [a.code, a]));
    const toInsert = checks
      .filter((c) => c.unlocked)
      .map((c) => byCode.get(c.code))
      .filter((a): a is Achievement => !!a && !unlocked.has(a.id));
    if (toInsert.length === 0) return;
    (async () => {
      const rows = toInsert.map((a) => ({ user_id: user.id, achievement_id: a.id }));
      await supabase.from("user_achievements").insert(rows);
      setUnlocked((prev) => {
        const next = new Map(prev);
        toInsert.forEach((a) => next.set(a.id, new Date().toISOString()));
        return next;
      });
      toInsert.forEach((a) => toast.success(`Yutuq: ${a.name}`, { description: `+${a.xp_reward} XP` }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, results.length, achievements.length, streak.current, level]);

  // Auto-issue certificates for level tests with strong scores
  useEffect(() => {
    if (!user || loading) return;
    const existing = new Set(certificates.map((c) => `${c.subject}::${c.level}`));
    const eligible = results.filter((r) => r.mode === "daraja" && r.level && Number(r.percentage) >= 70);
    const byKey = new Map<string, ResultRow>();
    eligible.forEach((r) => {
      const key = `${r.subject}::${r.level}`;
      if (!existing.has(key) && !byKey.has(key)) byKey.set(key, r);
    });
    if (byKey.size === 0) return;
    (async () => {
      const rows = Array.from(byKey.values()).map((r) => ({
        user_id: user.id, subject: r.subject, level: r.level!,
        score: Math.round(Number(r.percentage)),
      }));
      const { data } = await supabase.from("certificates").insert(rows).select();
      if (data) setCertificates((prev) => [...(data as Certificate[]), ...prev]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, results.length]);

  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const { error } = await supabase.from("profiles").update({ avatar_url: dataUrl }).eq("id", user.id);
      if (error) toast.error("Rasm saqlanmadi");
      else {
        setProfile((p) => p ? { ...p, avatar_url: dataUrl } : p);
        toast.success("Avatar yangilandi");
      }
      setAvatarUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-10 max-w-6xl">
        {loading ? <ProfileSkeleton /> : (
          <div className="space-y-6 animate-fade-in">
            {/* Hero card */}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
              <div className="absolute inset-0 gradient-hero opacity-90" />
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-white/5 blur-3xl" />

              <div className="relative p-6 md:p-10 flex flex-col md:flex-row md:items-center gap-6">
                <div className="relative group shrink-0">
                  <div className="h-28 w-28 md:h-32 md:w-32 rounded-full bg-white/20 backdrop-blur-md border-4 border-white/40 flex items-center justify-center overflow-hidden shadow-glow">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-white">{initials}</span>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-white text-primary shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} disabled={avatarUploading} />
                  </label>
                </div>

                <div className="flex-1 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-md">
                      {role === "admin" ? "Admin" : role === "oqituvchi" ? "O'qituvchi" : "O'quvchi"}
                    </Badge>
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-md">
                      <Zap className="h-3 w-3 mr-1" /> Daraja {level}
                    </Badge>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold">{profile?.full_name || "Foydalanuvchi"}</h1>
                  <p className="text-white/80 text-sm mt-1">{profile?.email}</p>
                  {profile?.created_at && (
                    <p className="text-white/60 text-xs mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(profile.created_at), "dd.MM.yyyy")} da qo'shildi
                    </p>
                  )}

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-white/80 mb-1.5">
                      <span>{xp} XP</span>
                      <span>{nextLevelXp} XP · Keyingi daraja</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/20 overflow-hidden backdrop-blur-md">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-glow"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Flame} color="text-orange-500" label="Joriy streak" value={`${streak.current}`} sub={`${streak.longest} - eng uzun`} />
              <StatCard icon={ClipboardCheck} color="text-primary" label="Testlar" value={`${results.length}`} sub={`${subjectsCount} fan`} />
              <StatCard icon={TrendingUp} color="text-success" label="O'rtacha ball" value={`${avgScore}%`} sub={`${perfectCount} ta mukammal`} />
              <StatCard icon={Trophy} color="text-warning" label="Yutuqlar" value={`${unlocked.size}/${achievements.length}`} sub={`${certificates.length} sertifikat`} />
            </div>

            {/* Achievements */}
            <section className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft">
                    <Trophy className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Yutuqlar</h2>
                    <p className="text-xs text-muted-foreground">{unlocked.size} / {achievements.length} qo'lga kiritilgan</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {achievements.map((a) => {
                  const isUnlocked = unlocked.has(a.id);
                  const Icon = ICONS[a.icon] || Trophy;
                  return (
                    <div
                      key={a.id}
                      className={`relative rounded-2xl border p-4 text-center transition-base ${
                        isUnlocked
                          ? "border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 hover:scale-105 hover:shadow-glow"
                          : "border-border bg-muted/40 opacity-60"
                      }`}
                    >
                      <div className={`h-12 w-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                        isUnlocked ? "gradient-primary shadow-soft" : "bg-muted"
                      }`}>
                        {isUnlocked ? <Icon className="h-6 w-6 text-primary-foreground" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="text-sm font-semibold truncate">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.description}</div>
                      <div className="text-[11px] font-bold text-primary mt-1.5">+{a.xp_reward} XP</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Certificates + Recent activity */}
            <div className="grid md:grid-cols-2 gap-6">
              <section className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center shadow-soft">
                    <Award className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Sertifikatlar</h2>
                    <p className="text-xs text-muted-foreground">Daraja testlarida 70%+ olsangiz</p>
                  </div>
                </div>
                {certificates.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Hozircha sertifikat yo'q. Daraja aniqlash testlarini yeching!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {certificates.map((c) => (
                      <div
                        key={c.id}
                        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-primary/5 to-accent/5 p-4 hover:shadow-soft transition-base"
                      >
                        <div className="absolute right-0 top-0 h-full w-1.5 gradient-primary" />
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-soft shrink-0">
                            <Award className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate">{c.subject}</div>
                            <div className="text-xs text-muted-foreground">
                              {c.level} · {c.score}% · {format(new Date(c.issued_at), "dd.MM.yyyy")}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-soft">
                    <BookOpen className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Oxirgi faollik</h2>
                    <p className="text-xs text-muted-foreground">So'nggi 10 ta test</p>
                  </div>
                </div>
                {results.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">Hali test yechilmagan</div>
                ) : (
                  <div className="space-y-2">
                    {results.slice(0, 10).map((r) => (
                      <Link
                        key={r.id}
                        to={`/yechilgan/${r.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-base group"
                      >
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          Number(r.percentage) >= 70 ? "bg-success/15 text-success" : Number(r.percentage) >= 50 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                        }`}>
                          <span className="font-bold text-sm">{Math.round(Number(r.percentage))}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate text-sm">{r.subject}{r.topic ? ` · ${r.topic}` : ""}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.score}/{r.total} · +{xpForResult(r)} XP · {format(new Date(r.created_at), "dd.MM.yyyy")}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </Link>
                    ))}
                    <div className="pt-2">
                      <Button asChild variant="ghost" size="sm" className="w-full">
                        <Link to="/yechilgan">Barcha testlar</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, sub }: { icon: any; color: string; label: string; value: string; sub: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-base">
      <div className="flex items-center justify-between mb-3">
        <Icon className={`h-5 w-5 ${color} group-hover:scale-110 transition-transform`} />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 rounded-3xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-3xl" />
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </div>
  );
}
