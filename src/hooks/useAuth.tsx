import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "oqituvchi" | "oquvchi" | "admin" | null;

export interface BlockInfo {
  isBlocked: boolean;
  blockedUntil: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: Role;
  loading: boolean;
  block: BlockInfo;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  refreshBlock: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState<BlockInfo>({ isBlocked: false, blockedUntil: null });

  const fetchRole = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
    setRole((data?.role as Role) ?? null);
  };

  const fetchBlock = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_blocked, blocked_until")
      .eq("id", uid)
      .maybeSingle();
    if (!data) {
      setBlock({ isBlocked: false, blockedUntil: null });
      return;
    }
    const tempActive = !!(data.blocked_until && new Date(data.blocked_until).getTime() > Date.now());
    setBlock({
      isBlocked: !!data.is_blocked,
      blockedUntil: tempActive ? data.blocked_until : null,
    });
  }, []);

  const checkGuestExpiryAndSignOut = async (u: User): Promise<boolean> => {
    if (!(u.user_metadata as any)?.is_guest) return false;
    try {
      const { data } = await supabase.functions.invoke("guest-cleanup");
      if ((data as any)?.deleted) {
        await supabase.auth.signOut();
        setRole(null); setUser(null); setSession(null);
        const { toast } = await import("sonner");
        toast.error("Mehmon akkauntingiz muddati tugadi (6 kun) va o'chirildi.");
        return true;
      }
    } catch (_) { /* ignore */ }
    return false;
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(async () => {
          await fetchBlock(s.user.id);
          const expired = await checkGuestExpiryAndSignOut(s.user);
          if (!expired) fetchRole(s.user.id);
        }, 0);
      } else {
        setRole(null);
        setBlock({ isBlocked: false, blockedUntil: null });
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await fetchBlock(s.user.id);
        const expired = await checkGuestExpiryAndSignOut(s.user);
        if (!expired) await fetchRole(s.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [fetchBlock]);

  // Poll block status every 20s so admin changes propagate to the user quickly.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => { fetchBlock(user.id); }, 20000);
    return () => clearInterval(id);
  }, [user, fetchBlock]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const refreshRole = async () => {
    if (user) await fetchRole(user.id);
  };

  const refreshBlock = async () => {
    if (user) await fetchBlock(user.id);
  };

  return (
    <Ctx.Provider value={{ user, session, role, loading, block, signOut, refreshRole, refreshBlock }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
