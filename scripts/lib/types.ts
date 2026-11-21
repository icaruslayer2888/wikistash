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

export interface WikipediaCandidate {
  pageId: number;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  description: string;
  extractText: string;
  wordCount: number;
}

export interface ArchiveIndexEntry {
  wikipedia_page_id: number;
  published_date: string;
  article_title: string;
  category: ArticleCategory;
  read_time_minutes: number;
  hook: string;
  thumbnail_url: string | null;
  idea_cards_count: number;
}
