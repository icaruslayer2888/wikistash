import { WikipediaCandidate } from './types';

const USER_AGENT = 'WikiStashBot/1.0 (https://github.com/wikistash; contact@wikistash.app)';
const MIN_WORD_COUNT = 450;

interface WikipediaRandomSummary {
  type?: string;
  title: string;
  displaytitle?: string;
  pageid: number;
  extract?: string;
  description?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls?: {
    desktop?: {
      page: string;
    };
  };
}

interface WikipediaQueryResponse {
  query?: {
    pages?: {
      [key: string]: {
        pageid: number;
        title: string;
        extract?: string;
      };
    };
  };
}

/**
 * Fetch a single candidate random summary from Wikipedia REST API.
 */
async function fetchRandomSummary(): Promise<WikipediaRandomSummary | null> {
  try {
    const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary', {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as WikipediaRandomSummary;
  } catch {
    return null;
  }
}

/**
 * Fetch full plain text extract from Wikipedia Action API to verify word count >= 450.
 */
async function fetchFullExtract(pageId: number): Promise<{ extract: string; wordCount: number } | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&pageids=${pageId}&format=json&origin=*`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as WikipediaQueryResponse;
    const page = data.query?.pages?.[String(pageId)];
    const extract = page?.extract || '';
    const words = extract.trim().split(/\s+/).filter(Boolean);

    return {
      extract,
      wordCount: words.length,
    };
  } catch {
    return null;
  }
}

/**
 * Quality filter rules:
 * 1. Reject disambiguation pages
 * 2. Reject lists and index catalogues
 * 3. Reject missing or too short descriptions
 * 4. Reject previously stored wikipedia_page_id's
 * 5. Reject articles under 450 words
 */
export async function getValidWikipediaCandidate(
  excludedIds: Set<number>
): Promise<WikipediaCandidate | null> {
  const summary = await fetchRandomSummary();
  if (!summary || !summary.pageid) return null;

  // 1. Check excluded IDs
  if (excludedIds.has(summary.pageid)) {
    return null;
  }

  // 2. Reject disambiguation
  if (summary.type === 'disambiguation') {
    return null;
  }

  // 3. Reject list / index / glossary titles and descriptions
  const title = summary.title || '';
  const desc = summary.description || '';

  const isListTitle = /^(List of|Lists of|Index of|Glossary of|Timeline of|Bibliography of|Outline of)/i.test(title);
  if (isListTitle) return null;

  const isListDesc = /wikimedia list|disambiguation page|index of/i.test(desc);
  if (isListDesc) return null;

  // 4. Reject missing or stub description
  if (!desc || desc.trim().length < 8) {
    return null;
  }

  // 5. Verify >= 450 words via action=query&prop=extracts&explaintext=1
  const fullExtractData = await fetchFullExtract(summary.pageid);
  if (!fullExtractData || fullExtractData.wordCount < MIN_WORD_COUNT) {
    return null;
  }

  const wikiUrl = summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const thumbnailUrl = summary.thumbnail?.source || null;

  return {
    pageId: summary.pageid,
    title,
    url: wikiUrl,
    thumbnailUrl,
    description: desc,
    extractText: fullExtractData.extract,
    wordCount: fullExtractData.wordCount,
  };
}

/**
 * Collects a specified number of high-quality Wikipedia candidates.
 * Rate-friendly with backoff and retry.
 */
export async function collectWikipediaCandidates(
  targetCount: number = 50,
  excludedIds: Set<number> = new Set(),
  onProgress?: (collected: number, attempts: number) => void
): Promise<WikipediaCandidate[]> {
  const candidates: WikipediaCandidate[] = [];
  const currentExcluded = new Set(excludedIds);
  let attempts = 0;
  const maxAttempts = targetCount * 12; // allow enough sampling for quality filters

  while (candidates.length < targetCount && attempts < maxAttempts) {
    attempts++;
    const candidate = await getValidWikipediaCandidate(currentExcluded);

    if (candidate) {
      candidates.push(candidate);
      currentExcluded.add(candidate.pageId);
      if (onProgress) onProgress(candidates.length, attempts);
    }

    // Gentle pacing to respect Wikipedia API policies (100ms)
    await new Promise((r) => setTimeout(r, 120));
  }

  return candidates;
}
