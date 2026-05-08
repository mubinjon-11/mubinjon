// Deletes the calling user's account if it is a guest account older than 6 days.
// Called from the client on session load.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GUEST_TTL_DAYS = 6;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: udata, error: uerr } = await userClient.auth.getUser();
    if (uerr || !udata.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const u = udata.user;
    const isGuest = Boolean((u.user_metadata as any)?.is_guest);
    if (!isGuest) {
      return new Response(JSON.stringify({ deleted: false, reason: "not_guest" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const created = new Date(u.created_at).getTime();
    const ageMs = Date.now() - created;
    const ttlMs = GUEST_TTL_DAYS * 24 * 60 * 60 * 1000;
    if (ageMs < ttlMs) {
      const remainingMs = ttlMs - ageMs;
      return new Response(JSON.stringify({
        deleted: false,
        reason: "active",
        remaining_days: Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    await admin.from("user_roles").delete().eq("user_id", u.id);
    await admin.from("results").delete().eq("user_id", u.id);
    await admin.from("learning_progress").delete().eq("user_id", u.id);
    await admin.from("profiles").delete().eq("id", u.id);
    const { error: dErr } = await admin.auth.admin.deleteUser(u.id);
    if (dErr) throw dErr;

    return new Response(JSON.stringify({ deleted: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Xatolik" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
