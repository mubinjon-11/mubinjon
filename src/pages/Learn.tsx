import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { LEARNING_SUBJECTS } from "@/lib/constants";
import { BookOpen } from "lucide-react";
import iconPython from "@/assets/icon-python.png";
import iconCpp from "@/assets/icon-cpp.png";

const ICONS: Record<string, string> = {
  "Ingliz tili": "🇬🇧",
  "English Listening": "🎧",
  "Rus tili": "🇷🇺",
  "Koreys tili": "🇰🇷",
  "Xitoy tili": "🇨🇳",
  "Arab tili": "🇸🇦",
  "Matematika": "📐",
  "Fizika": "⚛️",
  "Kimyo": "🧪",
  "Biologiya": "🧬",
  "Tarix": "🏛️",
  "Geografiya": "🌍",
  "Iqtisodiyot": "💹",
  "Ona tili": "📖",
  "Adabiyot": "📚",
  "Informatika": "💻",
};

const IMAGE_ICONS: Record<string, string> = {
  "Python dasturlash": iconPython,
  "C++ dasturlash": iconCpp,
};

export default function Learn() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 md:py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">O'rganish</h1>
        </div>
        <p className="text-muted-foreground mb-8">Fan tanlang va o'z darajangiz bo'yicha bosqichma-bosqich o'rganing.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEARNING_SUBJECTS.map((s) => (
            <Link
              key={s}
              to={`/organish/${encodeURIComponent(s)}`}
              className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-base hover:border-primary/40 hover:shadow-md"
            >
              <div className="mb-3 h-12 flex items-center">
                {IMAGE_ICONS[s] ? (
                  <img src={IMAGE_ICONS[s]} alt={s} loading="lazy" width={48} height={48} className="h-12 w-12 object-contain" />
                ) : (
                  <div className="text-4xl">{ICONS[s] ?? "📘"}</div>
                )}
              </div>
              <h2 className="text-lg font-semibold group-hover:text-primary transition-base">{s}</h2>
              <p className="text-sm text-muted-foreground mt-1">Darajalarni ko'rish →</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
