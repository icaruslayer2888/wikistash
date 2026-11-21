import { ArticleCategory } from './types';

export interface CategoryTheme {
  label: ArticleCategory;
  text: string;
  badgeBg: string;
  border: string;
  glow: string;
  gradient: string;
  cardBorder: string;
}

export const CATEGORY_THEMES: Record<ArticleCategory, CategoryTheme> = {
  'Science & Tech': {
    label: 'Science & Tech',
    text: 'text-cyan-400',
    badgeBg: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/80',
    border: 'border-cyan-500/40',
    glow: 'shadow-cyan-500/10',
    gradient: 'from-cyan-500/10 via-sky-500/5 to-transparent',
    cardBorder: 'hover:border-cyan-500/50',
  },
  'History & Culture': {
    label: 'History & Culture',
    text: 'text-amber-400',
    badgeBg: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/10',
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    cardBorder: 'hover:border-amber-500/50',
  },
  'Psychology & Philosophy': {
    label: 'Psychology & Philosophy',
    text: 'text-purple-400',
    badgeBg: 'bg-purple-950/70 text-purple-300 border-purple-800/80',
    border: 'border-purple-500/40',
    glow: 'shadow-purple-500/10',
    gradient: 'from-purple-500/10 via-indigo-500/5 to-transparent',
    cardBorder: 'hover:border-purple-500/50',
  },
  'Biography': {
    label: 'Biography',
    text: 'text-rose-400',
    badgeBg: 'bg-rose-950/70 text-rose-300 border-rose-800/80',
    border: 'border-rose-500/40',
    glow: 'shadow-rose-500/10',
    gradient: 'from-rose-500/10 via-pink-500/5 to-transparent',
    cardBorder: 'hover:border-rose-500/50',
  },
  'Nature & Space': {
    label: 'Nature & Space',
    text: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/10',
    gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    cardBorder: 'hover:border-emerald-500/50',
  },
  'Society & Economics': {
    label: 'Society & Economics',
    text: 'text-blue-400',
    badgeBg: 'bg-blue-950/70 text-blue-300 border-blue-800/80',
    border: 'border-blue-500/40',
    glow: 'shadow-blue-500/10',
    gradient: 'from-blue-500/10 via-indigo-500/5 to-transparent',
    cardBorder: 'hover:border-blue-500/50',
  },
};

export function getCategoryTheme(category: ArticleCategory): CategoryTheme {
  return CATEGORY_THEMES[category] || CATEGORY_THEMES['Science & Tech'];
}
