export const SUBJECTS = [
  "Ingliz tili",
  "Rus tili",
  "Koreys tili",
  "Matematika",
  "Fizika",
  "Kimyo",
  "Biologiya",
  "Tarix",
  "Geografiya",
  "Ona tili",
  "Adabiyot",
  "Informatika",
  "Python dasturlash",
] as const;

export const LANGUAGE_SUBJECTS = ["Ingliz tili", "Rus tili", "Koreys tili"];

// Subjects available in the "O'rganish" (learning) module
export const LEARNING_SUBJECTS = [
  "Ingliz tili",
  "Rus tili",
  "Koreys tili",
  "Matematika",
  "Fizika",
  "Kimyo",
  "Biologiya",
  "Python dasturlash",
  "Informatika",
] as const;

// National certificate level labels (B-DTM / Milliy sertifikat darajalari)
export const NATIONAL_LEVELS = ["C", "C+", "B", "B+", "A", "A+"] as const;
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

export type Subject = typeof SUBJECTS[number];

export function calculateLevel(percentage: number, subject: string): string {
  const isLanguage = LANGUAGE_SUBJECTS.includes(subject);
  const tiers = isLanguage
    ? ["A1", "A2", "B1", "B2", "C1", "C2"]
    : ["1", "2", "3", "4", "5", "6"];
  // National certificate labels for non-language subjects
  const labels = isLanguage
    ? ["A1", "A2", "B1", "B2", "C1", "C2"]
    : ["C", "C+", "B", "B+", "A", "A+"];

  const stats: Record<string, { correct: number; total: number }> = {};
  tiers.forEach((t) => (stats[t] = { correct: 0, total: 0 }));

  let hasDifficulty = false;
  questions.forEach((q, i) => {
    if (q.difficulty === undefined || q.difficulty === null) return;
    hasDifficulty = true;
    const key = String(q.difficulty);
    if (!stats[key]) return;
    stats[key].total += 1;
    if (answers[i] === correctIndices[i]) stats[key].correct += 1;
  });

  if (!hasDifficulty) {
    const correct = answers.reduce((s, a, i) => s + (a === correctIndices[i] ? 1 : 0), 0);
    const pct = (correct / questions.length) * 100;
    return calculateLevel(pct, subject);
  }

  let achievedIdx = -1;
  let allLowerOk = true;
  for (let i = 0; i < tiers.length; i++) {
    const s = stats[tiers[i]];
    if (s.total === 0) continue;
    const ratio = s.correct / s.total;
    if (allLowerOk && ratio >= 0.6) achievedIdx = i;
    if (ratio < 0.5) allLowerOk = false;
  }

  if (achievedIdx === -1) return isLanguage ? "A1" : "C";
  return labels[achievedIdx];
}

export function levelColor(level: string): string {
  if (["C2", "C1", "A+", "A"].includes(level)) return "bg-success text-success-foreground";
  if (["B2", "B1", "B+", "B"].includes(level)) return "bg-primary text-primary-foreground";
  if (["A2", "C+"].includes(level)) return "bg-warning text-warning-foreground";
  if (["A1", "C"].includes(level)) return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}
