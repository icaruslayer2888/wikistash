import { StashedIdea, UserStats } from './types';

const STASH_KEY = 'wikistash_saved_ideas_v1';
const STATS_KEY = 'wikistash_user_stats_v1';
const QUIZ_KEY = 'wikistash_quiz_answers_v1';

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function loadStashedIdeas(): StashedIdea[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STASH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStashedIdeas(ideas: StashedIdea[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STASH_KEY, JSON.stringify(ideas));
  } catch {}
}

export function isIdeaStashed(articleId: number, cardNumber: number): boolean {
  const ideas = loadStashedIdeas();
  const id = `${articleId}-${cardNumber}`;
  return ideas.some((item) => item.id === id);
}

export function toggleStashIdea(item: Omit<StashedIdea, 'saved_at'>): boolean {
  const ideas = loadStashedIdeas();
  const exists = ideas.some((i) => i.id === item.id);

  let updated: StashedIdea[];
  if (exists) {
    updated = ideas.filter((i) => i.id !== item.id);
  } else {
    updated = [
      {
        ...item,
        saved_at: new Date().toISOString(),
      },
      ...ideas,
    ];
  }

  saveStashedIdeas(updated);
  return !exists; // returns true if now stashed, false if removed
}

export function loadUserStats(): UserStats {
  const defaultStats: UserStats = {
    streak: 1,
    lastReadDate: getTodayString(),
    ideasReadToday: 0,
    quizzesSolved: 0,
    totalIdeasRead: 0,
  };

  if (typeof window === 'undefined') return defaultStats;

  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats;

    const parsed: UserStats = JSON.parse(raw);
    const today = getTodayString();

    // Check if streak is maintained
    if (parsed.lastReadDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (parsed.lastReadDate === yesterdayStr) {
        // Consecutive day
        return {
          ...parsed,
          ideasReadToday: 0,
        };
      } else {
        // Streak broken
        return {
          ...parsed,
          streak: 1,
          ideasReadToday: 0,
        };
      }
    }

    return parsed;
  } catch {
    return defaultStats;
  }
}

export function incrementIdeasRead(): UserStats {
  const current = loadUserStats();
  const today = getTodayString();

  const updated: UserStats = {
    ...current,
    lastReadDate: today,
    ideasReadToday: current.ideasReadToday + 1,
    totalIdeasRead: current.totalIdeasRead + 1,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(updated));
    } catch {}
  }

  return updated;
}

export function recordQuizSolved(articleId: number): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    const solved: number[] = raw ? JSON.parse(raw) : [];
    if (!solved.includes(articleId)) {
      solved.push(articleId);
      localStorage.setItem(QUIZ_KEY, JSON.stringify(solved));

      const stats = loadUserStats();
      stats.quizzesSolved += 1;
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    }
  } catch {}
}

export function isQuizSolved(articleId: number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    const solved: number[] = raw ? JSON.parse(raw) : [];
    return solved.includes(articleId);
  } catch {
    return false;
  }
}
