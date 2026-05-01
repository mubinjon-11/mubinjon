// Email haqiqiyligini tekshirish: format + MX DNS yozuvi mavjudligi
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ valid: false, reason: "Email kiritilmagan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return new Response(
        JSON.stringify({ valid: false, reason: "Email format noto'g'ri" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = trimmed.split("@")[1];

    // Google DNS over HTTPS — MX yozuvini tekshirish
    const dnsRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { Accept: "application/dns-json" } }
    );

    if (!dnsRes.ok) {
      // DNS xatosi — bloklaymaymiz, format to'g'ri bo'lsa o'tkazamiz
      return new Response(
        JSON.stringify({ valid: true, reason: "DNS tekshirib bo'lmadi" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dnsData = await dnsRes.json();
    const hasMx = Array.isArray(dnsData.Answer) && dnsData.Answer.some((a: any) => a.type === 15);

    if (!hasMx) {
      // MX yo'q bo'lsa A yozuviga ham qaraymiz (ba'zi domenlar fallback ishlatadi)
      const aRes = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
        { headers: { Accept: "application/dns-json" } }
      );
      const aData = await aRes.json();
      const hasA = Array.isArray(aData.Answer) && aData.Answer.some((a: any) => a.type === 1);
      if (!hasA) {
        return new Response(
          JSON.stringify({ valid: false, reason: "Bu domen mavjud emas yoki email qabul qilmaydi" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ valid: false, reason: "Tekshirishda xatolik" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
