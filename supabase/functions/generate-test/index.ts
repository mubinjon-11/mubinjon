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

    const LANGUAGE_SUBJECTS = ["Ingliz tili", "English Listening", "Rus tili", "Koreys tili", "Xitoy tili", "Arab tili"];
    const LISTENING_SUBJECT = "English Listening";
    const isLanguage = LANGUAGE_SUBJECTS.includes(subject);
    const isListening = subject === LISTENING_SUBJECT;

    // Strict difficulty distribution for level tests (20 questions)
    // Languages: CEFR A1, A2, B1, B2, C1, C2
    // Other subjects: 1=juda oson ... 6=olimpiada darajasi
    const langDistribution = "A1: 2 ta, A2: 3 ta, B1: 4 ta, B2: 4 ta, C1: 4 ta, C2: 3 ta";
    const subjDistribution = "C (boshlang'ich, juda oson — 5-6 sinf): 2 ta, C+ (oson — 7-8 sinf): 3 ta, B (o'rta — 9-sinf bazaviy): 4 ta, B+ (o'rta+, DTM bazasi — 10-sinf): 4 ta, A (qiyin, DTM yuqori — 11-sinf): 4 ta, A+ (juda qiyin, olimpiada/universitet kirish darajasi): 3 ta";

    const sysPrompt = isLevelTest
      ? `Siz O'zbekiston ta'lim tizimi uchun PROFESSIONAL test tuzuvchisiz va "${subject}" fanining mutaxassisisiz.

VAZIFA: O'quvchining HAQIQIY darajasini aniqlash uchun aynan ${qCount} ta savol tuzing. ${isLanguage ? "Til xalqaro CEFR (A1-C2) standartiga to'liq mos kelishi shart." : "Fan O'zbekiston Milliy sertifikat / DTM standartiga (C, C+, B, B+, A, A+) mos bo'lishi shart."} Yengil-yelpi, javobi ko'rinib turgan savollar TAQIQLANADI.

QIYINLIK TAQSIMOTI (qat'iy rioya qiling):
${isLanguage ? langDistribution : subjDistribution}

TALABLAR:
1. Har bir savolda AYNAN 4 ta variant bo'lsin va FAQAT BITTA aniq to'g'ri javob bo'lsin.
2. Noto'g'ri variantlar (distractor) ham mantiqiy va ishonarli bo'lsin.
3. Savollar TAFAKKURNI tekshirsin: yodlash emas, tushunish va qo'llashni.
4. ${isLanguage ? `B1+ darajadan boshlab murakkab grammatika (perfect, conditionals, passive, reported speech, modals), idiomalar, phrasal verbs, kontekstga qarab so'z tanlash. C1-C2 da akademik leksika, advanced collocations. Savol va variantlar ${subject}da, ko'rsatma o'zbekcha.` : `B+ va undan yuqori darajalarda DTM ko'rinishidagi masalalar, ko'p bosqichli hisob-kitob va tahliliy fikrlash bo'lsin. A+ darajadagilar olimpiada darajasida.`}
5. Savollar takrorlanmasin, turli mavzularni qamrab olsin.
6. ${isLanguage ? `${subject} tilida (ko'rsatmalar o'zbekcha)` : "O'ZBEK tilida"} bo'lsin.

HAR BIR SAVOL UCHUN difficulty maydoni bo'lishi SHART:
${isLanguage ? '"A1", "A2", "B1", "B2", "C1", "C2" dan biri.' : '"C", "C+", "B", "B+", "A", "A+" dan biri.'}

Savollarni difficulty bo'yicha o'sish tartibida bering (oson → qiyin).`
      : `Siz professional o'qituvchisiz. ${grade ? grade + "-sinf" : ""} o'quvchilari uchun "${subject}" fanidan "${topic}" mavzusida aynan ${qCount} ta test savol yarating. Har bir savolda 4 ta variant va bitta to'g'ri javob bo'lsin. Barchasi O'ZBEK tilida bo'lsin (agar fan til bo'lsa, savollar shu tilda bo'lishi mumkin). Savollar takrorlanmasin.`;

    const listeningInstruction = isListening
      ? `\n\nMUHIM (English Listening): Har bir savol AUDIO TINGLASH asosida bo'lsin. Savol matnida tinglash kerak bo'lgan inglizcha so'z yoki qisqa jumla "[LISTEN: matn]" formatida bo'lsin. Masalan: "Quyidagini tinglang va to'g'ri javobni tanlang: [LISTEN: through the woods]". 4 ta variant FONETIK BIR-BIRIGA O'XSHASH inglizcha so'zlar/jumlalar bo'lsin (minimal pairs, homophones, similar sounds). Misol: through / though / thought / thorough; ship / sheep / cheap / chip; write / right / rite / wright. To'g'ri javob — eshitilgan matn.`
      : "";

    const questionItemProps: any = {
      question: { type: "string" },
      options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
      correct_index: { type: "integer", minimum: 0, maximum: 3 },
    };
    const requiredFields = ["question", "options", "correct_index"];
    if (isLevelTest) {
      questionItemProps.difficulty = isLanguage
        ? { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] }
        : { type: "string", enum: ["C", "C+", "B", "B+", "A", "A+"] };
      requiredFields.push("difficulty");
    }

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
                properties: questionItemProps,
                required: requiredFields,
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
        model: isLevelTest ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sysPrompt + listeningInstruction },
          { role: "user", content: `Iltimos, aynan ${qCount} ta savol yarating va save_questions tool orqali qaytaring.${isLevelTest ? " Qiyinlik taqsimotiga QAT'IY rioya qiling va har bir savolga difficulty belgilang." : ""}${isListening ? " Har bir savolga [LISTEN: ...] bloki kiriting va variantlarni fonetik o'xshash so'zlardan tuzing." : ""}` },
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
