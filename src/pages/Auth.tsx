import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

// Faqat haqiqiy email provayderlari ruxsat etiladi
const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "mail.ru",
  "bk.ru",
  "inbox.ru",
  "list.ru",
  "yandex.ru",
  "yandex.com",
  "ya.ru",
  "proton.me",
  "protonmail.com",
  "umail.uz",
  "mail.uz",
  "exat.uz",
  "bilimtest.uz",
];

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Noto'g'ri email format")
  .refine(
    (val) => {
      const domain = val.split("@")[1];
      if (!domain) return false;
      // Domen tarkibida nuqta bo'lishi shart va oxiri kamida 2 harf
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return false;
      return ALLOWED_EMAIL_DOMAINS.includes(domain);
    },
    { message: "Faqat haqiqiy email manzil kiriting (masalan: gmail.com, mail.ru, yandex.ru)" }
  );

const signInSchema = z.object({
  email: emailField,
  password: z.string().min(6, "Parol kamida 6 ta belgi"),
});

const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(2, "Ism kiriting").max(100),
  role: z.enum(["oqituvchi", "oquvchi"]),
});

export default function Auth() {
  const { user, role, loading: authLoading, refreshRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "oquvchi" as "oqituvchi" | "oquvchi",
  });

  if (!authLoading && user) {
    const dest = role === "admin" ? "/admin" : role === "oqituvchi" ? "/oqituvchi" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(signInData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email yoki parol noto'g'ri" : error.message);
      return;
    }
    toast.success("Xush kelibsiz!");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(signUpData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);

    // Email haqiqatan mavjudligini server orqali tekshirish (MX DNS yozuvi)
    try {
      const { data: vData, error: vErr } = await supabase.functions.invoke("verify-email", {
        body: { email: parsed.data.email },
      });
      if (vErr) throw vErr;
      if (!vData?.valid) {
        setLoading(false);
        toast.error(vData?.reason || "Bu email mavjud emas. Haqiqiy email kiriting.");
        return;
      }
    } catch {
      setLoading(false);
      toast.error("Emailni tekshirib bo'lmadi. Qayta urinib ko'ring.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.full_name },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message.includes("already") ? "Bu email allaqachon ro'yxatdan o'tgan" : error.message);
      return;
    }
    if (data.user) {
      const { error: rErr } = await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: parsed.data.role,
      });
      if (rErr) console.error(rErr);
      await refreshRole();
    }
    setLoading(false);
    toast.success("Ro'yxatdan o'tdingiz!");
    navigate(parsed.data.role === "oqituvchi" ? "/oqituvchi" : "/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight">BilimTest</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-elevated">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Kirish</TabsTrigger>
              <TabsTrigger value="signup">Ro'yxatdan o'tish</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" autoComplete="email" required
                    value={signInData.email} onChange={(e) => setSignInData({ ...signInData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pass">Parol</Label>
                  <Input id="si-pass" type="password" autoComplete="current-password" required
                    value={signInData.password} onChange={(e) => setSignInData({ ...signInData, password: e.target.value })} />
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-primary">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Kirish
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">To'liq ism</Label>
                  <Input id="su-name" required maxLength={100}
                    value={signUpData.full_name} onChange={(e) => setSignUpData({ ...signUpData, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" autoComplete="email" required
                    value={signUpData.email} onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pass">Parol</Label>
                  <Input id="su-pass" type="password" autoComplete="new-password" required minLength={6}
                    value={signUpData.password} onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Roli</Label>
                  <RadioGroup
                    value={signUpData.role}
                    onValueChange={(v) => setSignUpData({ ...signUpData, role: v as "oqituvchi" | "oquvchi" })}
                    className="grid grid-cols-2 gap-2"
                  >
                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-base ${signUpData.role === "oquvchi" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="oquvchi" />
                      <span className="text-sm font-medium">O'quvchi</span>
                    </label>
                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-base ${signUpData.role === "oqituvchi" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="oqituvchi" />
                      <span className="text-sm font-medium">O'qituvchi</span>
                    </label>
                  </RadioGroup>
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-primary">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Ro'yxatdan o'tish
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
