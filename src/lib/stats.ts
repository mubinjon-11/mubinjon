export interface ResultRow {
  id: string;
  subject: string;
  topic: string | null;
  mode: string;
  score: number;
  total: number;
  percentage: number;
  level: string | null;
  created_at: string;
}

// XP per test: base 10 + score*8 + perfect bonus 50
export function xpForResult(r: ResultRow): number {
  const base = 10;
  const perScore = r.score * 8;
  const perfect = r.percentage >= 100 ? 50 : r.percentage >= 90 ? 25 : 0;
  return base + perScore + perfect;
}

export function totalXpFromResults(results: ResultRow[]): number {
  return results.reduce((s, r) => s + xpForResult(r), 0);
}

// Level curve: level = floor(sqrt(xp / 80)) + 1
export function levelFromXp(xp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progress: number } {
  const level = Math.floor(Math.sqrt(xp / 80)) + 1;
  const currentLevelXp = (level - 1) * (level - 1) * 80;
  const nextLevelXp = level * level * 80;
  const progress = Math.min(100, Math.max(0, ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100));
  return { level, currentLevelXp, nextLevelXp, progress };
}

export function computeStreak(results: ResultRow[]): { current: number; longest: number } {
  if (!results.length) return { current: 0, longest: 0 };
  const days = new Set(
    results.map((r) => new Date(r.created_at).toISOString().slice(0, 10)),
  );
  const sorted = Array.from(days).sort();
  // longest
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) { run++; longest = Math.max(longest, run); }
    else { run = 1; }
  }
  // current: walk back from today
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let cursor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  let current = 0;
  while (cursor && days.has(cursor)) {
    current++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return { current, longest };
}

export interface AchievementCheck {
  code: string;
  unlocked: boolean;
}

export function evaluateAchievements(
  results: ResultRow[],
  streakCurrent: number,
  streakLongest: number,
  level: number,
): AchievementCheck[] {
  const subjects = new Set(results.map((r) => r.subject));
  const languageSubjects = new Set(
    ["Ingliz tili", "English Listening", "Rus tili", "Koreys tili", "Xitoy tili", "Arab tili"]
      .filter((s) => subjects.has(s)),
  );
  return [
    { code: "first_test", unlocked: results.length >= 1 },
    { code: "perfect_score", unlocked: results.some((r) => r.percentage >= 100) },
    { code: "streak_3", unlocked: streakLongest >= 3 || streakCurrent >= 3 },
    { code: "streak_7", unlocked: streakLongest >= 7 || streakCurrent >= 7 },
    { code: "streak_30", unlocked: streakLongest >= 30 || streakCurrent >= 30 },
    { code: "tests_10", unlocked: results.length >= 10 },
    { code: "tests_50", unlocked: results.length >= 50 },
    { code: "level_up_5", unlocked: level >= 5 },
    { code: "polyglot", unlocked: languageSubjects.size >= 3 },
    { code: "scholar", unlocked: subjects.size >= 5 },
  ];
}
