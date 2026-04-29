// AI test generator — uses Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, topic, grade, count, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isLevelTest = mode === "daraja";
    const qCount = isLevelTest ? 20 : Math.min(Math.max(Number(count) || 10, 1), 30);

    const sysPrompt = isLevelTest
      ? `Siz O'zbekiston ta'lim tizimi uchun professional test tuzuvchisiz. "${subject}" fani bo'yicha o'quvchining darajasini aniqlash uchun aynan ${qCount} ta test savol yarating. Savollar oson (4 ta), o'rta (8 ta), qiyin (4 ta), juda qiyin (4 ta) darajada bo'lsin. Har bir savolda 4 ta variant bo'lsin va aniq bitta to'g'ri javob bo'lsin. Hammasi O'ZBEK tilida bo'lsin (agar fan "Ingliz tili" bo'lsa, savollar inglizcha matn bilan, ko'rsatmalar o'zbekcha).`
      : `Siz professional o'qituvchisiz. ${grade ? grade + "-sinf" : ""} o'quvchilari uchun "${subject}" fanidan "${topic}" mavzusida aynan ${qCount} ta test savol yarating. Har bir savolda 4 ta variant va bitta to'g'ri javob bo'lsin. Barchasi O'ZBEK tilida bo'lsin (agar fan "Ingliz tili" bo'lsa, savollar inglizcha bo'lishi mumkin). Savollar takrorlanmasin.`;

    const tools = [{
      type: "function",
      function: {
        name: "save_questions",
        description: "Generated test questions",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
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
          required: ["questions"],
          additionalProperties: false,
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: `Iltimos, aynan ${qCount} ta savol yarating va save_questions tool orqali qaytaring.` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "save_questions" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway:", resp.status, t);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "So'rovlar limiti oshib ketdi. Iltimos, biroz kuting." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Lovable AI kreditingiz tugagan. Iltimos, balansni to'ldiring." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI xatolik");
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI savol qaytarmadi");
    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ questions: args.questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Noma'lum xatolik" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
