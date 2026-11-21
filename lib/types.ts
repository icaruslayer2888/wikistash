export type ArticleCategory =
  | 'Science & Tech'
  | 'History & Culture'
  | 'Psychology & Philosophy'
  | 'Biography'
  | 'Nature & Space'
  | 'Society & Economics';

export interface IdeaCard {
  card_number: number;
  title: string;           // 3–6 word punchy headline
  insight: string;         // 2–3 crisp, engaging sentences
  key_takeaway: string;    // 1 memorable mental model / takeaway
}

export interface Quiz {
  question: string;
  options: [string, string, string];
  correct_index: 0 | 1 | 2;
  explanation: string;
}

export interface ArticleDigest {
  wikipedia_page_id: number;
  published_date: string;  // YYYY-MM-DD
  article_title: string;
  wikipedia_url: string;
  thumbnail_url: string | null;
  category: ArticleCategory;
  read_time_minutes: number;
  hook: string;            // 1-sentence curiosity hook
  idea_cards: IdeaCard[];  // 3 to 5 cards
  quiz: Quiz;
}

export interface StashedIdea {
  id: string; // `${page_id}-${card_number}`
  article_id: number;
  article_title: string;
  category: ArticleCategory;
  card: IdeaCard;
  saved_at: string;
}

export interface UserStats {
  streak: number;
  lastReadDate: string;
  ideasReadToday: number;
  quizzesSolved: number;
  totalIdeasRead: number;
}
