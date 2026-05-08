export const SUBJECTS = [
  "Ingliz tili",
  "English Listening",
  "Rus tili",
  "Koreys tili",
  "Xitoy tili",
  "Arab tili",
  "Matematika",
  "Fizika",
  "Kimyo",
  "Biologiya",
  "Tarix",
  "Geografiya",
  "Iqtisodiyot",
  "Ona tili",
  "Adabiyot",
  "Informatika",
  "Python dasturlash",
  "C++ dasturlash",
  "Tibbiyot",
  "Guvohnoma",
] as const;

export const LANGUAGE_SUBJECTS = [
  "Ingliz tili",
  "English Listening",
  "Rus tili",
  "Koreys tili",
  "Xitoy tili",
  "Arab tili",
];

export const LISTENING_SUBJECT = "English Listening";

export const LEARNING_SUBJECTS = SUBJECTS;

export const NATIONAL_LEVELS = ["C", "C+", "B", "B+", "A", "A+"] as const;
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
/** IELTS bands used for English Listening */
export const IELTS_LEVELS = ["4.5", "5.5", "6.0", "6.5", "7.0", "8.0"] as const;

export const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

export type Subject = typeof SUBJECTS[number];

export function getLevelsForSubject(subject: string): readonly string[] {
  if (subject === LISTENING_SUBJECT) return IELTS_LEVELS;
  return LANGUAGE_SUBJECTS.includes(subject) ? CEFR_LEVELS : NATIONAL_LEVELS;
}

/** Simple percentage-based level (CEFR for languages, IELTS for listening, national for others) */
export function calculateLevel(percentage: number, subject: string): string {
  if (subject === LISTENING_SUBJECT) {
    if (percentage >= 95) return "8.0";
    if (percentage >= 85) return "7.0";
    if (percentage >= 70) return "6.5";
    if (percentage >= 55) return "6.0";
    if (percentage >= 35) return "5.5";
    return "4.5";
  }
  const isLanguage = LANGUAGE_SUBJECTS.includes(subject);
  if (isLanguage) {
    if (percentage >= 95) return "C2";
    if (percentage >= 85) return "C1";
    if (percentage >= 70) return "B2";
    if (percentage >= 55) return "B1";
    if (percentage >= 35) return "A2";
    return "A1";
  }
  if (percentage >= 95) return "A+";
  if (percentage >= 85) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 55) return "B";
  if (percentage >= 35) return "C+";
  return "C";
}

/**
 * Weighted level calculation for AI-generated level tests.
 * Level = highest tier with ≥60% correct, provided all easier tiers ≥50%.
 */
export function calculateLevelWeighted(
  questions: Array<{ difficulty?: string | number }>,
  answers: number[],
  correctIndices: number[],
  subject: string,
): string {
  const tiers: string[] =
    subject === LISTENING_SUBJECT
      ? [...IELTS_LEVELS]
      : LANGUAGE_SUBJECTS.includes(subject)
      ? [...CEFR_LEVELS]
      : [...NATIONAL_LEVELS];

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

  if (achievedIdx === -1) return tiers[0];
  return tiers[achievedIdx];
}

export function levelColor(level: string): string {
  if (["C2", "C1", "A+", "A", "8.0", "7.5", "7.0"].includes(level)) return "bg-success text-success-foreground";
  if (["B2", "B1", "B+", "B", "6.5", "6.0"].includes(level)) return "bg-primary text-primary-foreground";
  if (["A2", "C+", "5.5"].includes(level)) return "bg-warning text-warning-foreground";
  if (["A1", "C", "4.5"].includes(level)) return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}
