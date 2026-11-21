import { WikipediaCandidate } from './types';

const WIKI_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/random/summary';
const WIKI_QUERY_URL = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'WikiStashBot/1.0 (https://wikistash.pages.dev; contact@wikistash.app)';

const BLOCKED_TITLE_PREFIXES = [
  'List of ',
  'Lists of ',
  'Index of ',
  'Outline of ',
  'Category:',
  'Template:',
  'Portal:',
  'Wikipedia:',
  'File:',
  'Draft:',
  'Help:',
];

function isLowSignalCandidate(title: string, description: string): boolean {
  if (!title || !description.trim()) return true;
  if (BLOCKED_TITLE_PREFIXES.some((prefix) => title.startsWith(prefix))) return true;
  const descLower = description.toLowerCase();
  if (descLower.includes('disambiguation') || descLower.includes('wikimedia list article')) {
    return true;
  }
  return false;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function fetchFullArticleExtract(pageId: number): Promise<string> {
  const params = new URLSearchParams({
    action: 'query',
    pageids: String(pageId),
    prop: 'extracts',
    explaintext: '1',
    exsectionformat: 'plain',
    format: 'json',
    origin: '*',
  });

  const res = await fetch(`${WIKI_QUERY_URL}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Wikipedia extracts API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    query?: {
      pages?: Record<string, { extract?: string }>;
    };
  };

  return data.query?.pages?.[String(pageId)]?.extract?.trim() || '';
}

export async function fetchQualityWikipediaArticles(
  targetCount: number,
  excludedPageIds: Set<number> = new Set(),
  minWords: number = 450
): Promise<WikipediaCandidate[]> {
  const collected: WikipediaCandidate[] = [];
  const seenIds = new Set<number>(excludedPageIds);
  const maxAttempts = Math.max(250, targetCount * 8);

  let attempts = 0;

  while (collected.length < targetCount && attempts < maxAttempts) {
    attempts++;

    try {
      const summaryRes = await fetch(WIKI_SUMMARY_URL, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!summaryRes.ok) {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }

      const summary = (await summaryRes.json()) as {
        pageid?: number;
        title?: string;
        description?: string;
        content_urls?: { desktop?: { page?: string } };
        thumbnail?: { source?: string };
      };

      const pageId = summary.pageid;
      const title = summary.title?.trim() || '';
      const description = summary.description?.trim() || '';

      if (!pageId || seenIds.has(pageId) || isLowSignalCandidate(title, description)) {
        await new Promise((r) => setTimeout(r, 80));
        continue;
      }

      seenIds.add(pageId);

      const extractText = await fetchFullArticleExtract(pageId);
      const wordCount = countWords(extractText);
      if (wordCount < minWords) {
        await new Promise((r) => setTimeout(r, 80));
        continue;
      }

      const url =
        summary.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/?curid=${pageId}`;

      collected.push({
        pageId,
        title,
        description,
        url,
        thumbnailUrl: summary.thumbnail?.source || null,
        extractText,
        wordCount,
      });

      if (collected.length % 5 === 0 || collected.length === targetCount) {
        console.log(`Sampling articles: ${collected.length}/${targetCount} valid found (${attempts} attempts)`);
      }

      // Polite pacing to avoid Wikimedia throttling
      await new Promise((r) => setTimeout(r, 120));
    } catch (err) {
      console.warn(`[Wiki Sampling Warning] Attempt ${attempts}: ${(err as Error)?.message || err}`);
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return collected;
}
