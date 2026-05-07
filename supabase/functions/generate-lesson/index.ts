// Generates a single lesson + quiz for a (subject, level, position).
// Caches result in public.lessons so all users share the same content.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGUAGE_SUBJECTS = ["Ingliz tili", "English Listening", "Rus tili", "Koreys tili", "Xitoy tili", "Arab tili"];
const LISTENING_SUBJECT = "English Listening";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
const NAT = ["C", "C+", "B", "B+", "A", "A+"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, level, position } = await req.json();
    if (!subject || !level || typeof position !== "number") {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isLanguage = LANGUAGE_SUBJECTS.includes(subject);
    const validLevels = isLanguage ? CEFR : NAT;
    if (!validLevels.includes(level)) {
      return new Response(JSON.stringify({ error: "Bu fan uchun noto'g'ri daraja" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Cache check
    const { data: cached } = await admin
      .from("lessons")
      .select("*")
      .eq("subject", subject)
      .eq("level", level)
      .eq("position", position)
      .maybeSingle();
    if (cached) {
      return new Response(JSON.stringify({ lesson: cached }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const standardNote = isLanguage
      ? `Daraja CEFR (${level}) xalqaro standartiga to'liq mos bo'lsin.`
      : `Daraja O'zbekiston Milliy sertifikat / DTM standartining "${level}" darajasiga mos bo'lsin.`;

    const sysPrompt = `Siz "${subject}" fanidan PROFESSIONAL o'qituvchisiz. ${standardNote}

VAZIFA: ${level} darajasi uchun ${position}-tartibli DARS yarating.
- Dars mavzusi shu darajada o'qitilishi kerak bo'lgan keyingi mantiqiy mavzu bo'lsin (${position} - tartib raqami).
- "title": qisqa va aniq mavzu nomi.
- "content": batafsil o'quv matni (markdown ishlatish mumkin: **bold**, ro'yxatlar, misollar, \`kod\`). Kamida 400 so'z. ${isLanguage ? `Til darslari uchun ${subject}da misollar va o'zbekcha tushuntirish bering.` : "Formulalar, qoidalar, yechim usullari va kamida 2 ta yechilgan misol bo'lsin."}
- "questions": 8 ta test savoli, har biri 4 variant va bitta to'g'ri javobli, faqat shu darsda o'tilgan materialdan.

Hammasi o'zbek tilida bo'lsin (til darslarida misollar shu tilda).`;

    const tools = [{
      type: "function",
      function: {
        name: "save_lesson",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            questions: {
              type: "array",
              minItems: 8,
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                  correct_index: { type: "integer", minimum: 0, maximum: 3 },
                },
                required: ["question", "options", "correct_index"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "content", "questions"],
          additionalProperties: false,
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: `${subject} - ${level} darajasi - ${position}-dars. Save_lesson tool orqali qaytaring.` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "save_lesson" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error:", resp.status, t);
      if (resp.status === 429) return new Response(JSON.stringify({ error: "So'rovlar limiti oshib ketdi." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Lovable AI kreditingiz tugagan." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI xatolik");
    }

    const data = await resp.json();
    const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);

    const { data: inserted, error: insErr } = await admin
      .from("lessons")
      .insert({ subject, level, position, title: args.title, content: args.content, questions: args.questions })
      .select("*")
      .single();
    if (insErr) {
      // Race: another request just inserted; re-fetch
      const { data: again } = await admin.from("lessons").select("*").eq("subject", subject).eq("level", level).eq("position", position).maybeSingle();
      if (again) return new Response(JSON.stringify({ lesson: again }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw insErr;
    }

    return new Response(JSON.stringify({ lesson: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Noma'lum xatolik" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
