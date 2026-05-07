import { Button } from "@/components/ui/button";
import { Volume2, Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Renders a question text that may contain "[LISTEN: ...]" blocks.
 * Each block becomes a "Tinglash" button + a "Takrorlash" (mic) button.
 */
export function ListenText({ text, lang = "en-US" }: { text: string; lang?: string }) {
  const parts = parseListen(text);
  return (
    <span className="leading-relaxed">
      {parts.map((p, i) =>
        p.type === "text" ? (
          <span key={i}>{p.value}</span>
        ) : (
          <ListenBlock key={i} phrase={p.value} lang={lang} />
        ),
      )}
    </span>
  );
}

function parseListen(text: string): Array<{ type: "text" | "listen"; value: string }> {
  const out: Array<{ type: "text" | "listen"; value: string }> = [];
  const re = /\[LISTEN:\s*([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    out.push({ type: "listen", value: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  if (out.length === 0) out.push({ type: "text", value: text });
  return out;
}

function ListenBlock({ phrase, lang }: { phrase: string; lang: string }) {
  const [recording, setRecording] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  const speak = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("Brauzeringiz nutq sintezini qo'llab-quvvatlamaydi");
      return;
    }
    const u = new SpeechSynthesisUtterance(phrase);
    u.lang = lang;
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const startRec = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Brauzeringiz nutqni tanib olishni qo'llab-quvvatlamaydi (Chrome tavsiya etiladi)");
      return;
    }
    const r = new SR();
    r.lang = lang;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const said = e.results[0][0].transcript as string;
      setHeard(said);
      const ok = said.trim().toLowerCase() === phrase.trim().toLowerCase();
      if (ok) toast.success("Aniq talaffuz! ✓");
      else toast.message(`Siz: "${said}" — to'g'ri: "${phrase}"`);
    };
    r.onerror = () => setRecording(false);
    r.onend = () => setRecording(false);
    recRef.current = r;
    setHeard(null);
    setRecording(true);
    r.start();
  };

  const stopRec = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  useEffect(() => () => recRef.current?.stop?.(), []);

  return (
    <span className="inline-flex flex-wrap items-center gap-2 mx-1 align-middle">
      <Button type="button" size="sm" variant="secondary" onClick={speak} className="h-8">
        <Volume2 className="h-4 w-4 mr-1" /> Tinglash
      </Button>
      <Button
        type="button"
        size="sm"
        variant={recording ? "destructive" : "outline"}
        onClick={recording ? stopRec : startRec}
        className="h-8"
      >
        {recording ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
        {recording ? "To'xtatish" : "Takrorlash"}
      </Button>
      {heard && <span className="text-xs text-muted-foreground">Eshitildi: "{heard}"</span>}
    </span>
  );
}
