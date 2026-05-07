import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const email = `mehmon_${rand}@bilimtest.guest`;
    const password = crypto.randomUUID() + "Aa1!";
    const fullName = `Mehmon-${rand.slice(0, 6)}`;

    const { data: created, error: cErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, is_guest: true },
    });
    if (cErr || !created.user) throw cErr ?? new Error("Akkaunt yaratilmadi");

    const { error: rErr } = await service.from("user_roles").insert({
      user_id: created.user.id,
      role: "oquvchi",
    });
    if (rErr) {
      await service.auth.admin.deleteUser(created.user.id);
      throw rErr;
    }

    return new Response(JSON.stringify({ email, password }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Xatolik" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
