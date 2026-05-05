import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Kirish talab qilinadi" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await serviceClient.rpc("has_role", {
      _user_id: authData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Faqat admin o'chira oladi" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "Foydalanuvchi ID topilmadi" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId === authData.user.id) {
      return new Response(JSON.stringify({ error: "O'zingizni o'chira olmaysiz" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetRole } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (targetRole?.role === "admin") {
      return new Response(JSON.stringify({ error: "Admin akkaunt himoyalangan" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: teacherTests } = await serviceClient.from("tests").select("id").eq("teacher_id", userId);
    const testIds = (teacherTests ?? []).map((t) => t.id);
    if (testIds.length > 0) {
      await serviceClient.from("questions").delete().in("test_id", testIds);
      await serviceClient.from("results").delete().in("test_id", testIds);
    }

    await serviceClient.from("results").delete().eq("user_id", userId);
    await serviceClient.from("tests").delete().eq("teacher_id", userId);
    await serviceClient.from("user_roles").delete().eq("user_id", userId);
    await serviceClient.from("profiles").delete().eq("id", userId);

    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Xatolik yuz berdi" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});