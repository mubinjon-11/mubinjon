export const SUBJECTS = [
  "Ingliz tili",
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

export const LANGUAGE_SUBJECTS = ["Ingliz tili"];

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

export function levelColor(level: string): string {
  if (["C2", "C1", "Yuqori daraja"].includes(level)) return "bg-success text-success-foreground";
  if (["B2", "B1", "O'rta daraja"].includes(level)) return "bg-primary text-primary-foreground";
  if (["A2", "Boshlang'ich+"].includes(level)) return "bg-warning text-warning-foreground";
  if (["A1", "Boshlang'ich"].includes(level)) return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}
