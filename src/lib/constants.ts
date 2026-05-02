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
] as const;

export const LANGUAGE_SUBJECTS = ["Ingliz tili", "Rus tili", "Koreys tili"];

export const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

export type Subject = typeof SUBJECTS[number];

export function calculateLevel(percentage: number, subject: string): string {
  const isLanguage = LANGUAGE_SUBJECTS.includes(subject);
  if (isLanguage) {
    if (percentage >= 95) return "C2";
    if (percentage >= 85) return "C1";
    if (percentage >= 70) return "B2";
    if (percentage >= 55) return "B1";
    if (percentage >= 35) return "A2";
    return "A1";
  }
  if (percentage >= 90) return "Yuqori daraja";
  if (percentage >= 70) return "O'rta daraja";
  if (percentage >= 50) return "Boshlang'ich+";
  return "Boshlang'ich";
}

/**
 * Weighted level calculation for AI-generated level tests.
 * Uses each question's difficulty (CEFR for languages, 1-6 for other subjects).
 * Student's level = highest tier where they got ≥60% correct,
 * provided all easier tiers were ≥50%.
 */
export function calculateLevelWeighted(
  questions: Array<{ difficulty?: string | number }>,
  answers: number[],
  correctIndices: number[],
  subject: string,
): string {
  const isLanguage = LANGUAGE_SUBJECTS.includes(subject);
  const tiers = isLanguage
    ? ["A1", "A2", "B1", "B2", "C1", "C2"]
    : ["1", "2", "3", "4", "5", "6"];
  const labels = isLanguage
    ? ["A1", "A2", "B1", "B2", "C1", "C2"]
    : ["Boshlang'ich", "Boshlang'ich+", "O'rta", "O'rta+", "Yuqori", "Olimpiada"];

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

  if (achievedIdx === -1) return isLanguage ? "A1" : "Boshlang'ich";
  return labels[achievedIdx];
}

export function levelColor(level: string): string {
  if (["C2", "C1", "Yuqori daraja", "Yuqori", "Olimpiada"].includes(level)) return "bg-success text-success-foreground";
  if (["B2", "B1", "O'rta daraja", "O'rta", "O'rta+"].includes(level)) return "bg-primary text-primary-foreground";
  if (["A2", "Boshlang'ich+"].includes(level)) return "bg-warning text-warning-foreground";
  if (["A1", "Boshlang'ich"].includes(level)) return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}
