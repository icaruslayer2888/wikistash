import fs from 'node:fs/promises';
import path from 'node:path';

export interface IdeaCard {
  card_number: number;
  title: string;
  insight: string;
  key_takeaway: string;
}

export interface QuizData {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface ArticleDigest {
  wikipedia_page_id: number;
  published_date: string;
  article_title: string;
  wikipedia_url: string;
  thumbnail_url: string | null;
  category: string;
  read_time_minutes: number;
  hook: string;
  idea_cards: IdeaCard[];
  quiz: QuizData;
}

export interface D1Config {
  apiToken: string;
  accountId: string;
  databaseId: string;
}

export interface ExportFeedResult {
  latestCount: number;
  archiveCount: number;
}

interface D1QueryResult<T = Record<string, unknown>> {
  results?: T[];
  success?: boolean;
  meta?: {
    changes?: number;
  };
}

interface D1ApiResponse<T = Record<string, unknown>> {
  success: boolean;
  errors?: Array<{ message?: string; code?: number }>;
  result?: Array<D1QueryResult<T>>;
}

export function getD1Config(): D1Config {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim() || '';
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || '';
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim() || '';

  if (!apiToken || !accountId || !databaseId) {
    throw new Error(
      'Missing Cloudflare D1 credentials. Ensure CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, and CLOUDFLARE_D1_DATABASE_ID are set.'
    );
  }

  return { apiToken, accountId, databaseId };
}

async function queryD1<T = Record<string, unknown>>(
  sql: string,
  params: Array<string | number | null> = [],
  overrideConfig?: D1Config
): Promise<D1QueryResult<T>> {
  const { apiToken, accountId, databaseId } = overrideConfig ?? getD1Config();
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`Cloudflare D1 HTTP ${res.status}: ${bodyText}`);
  }

  const data = (await res.json()) as D1ApiResponse<T>;
  if (!data.success) {
    const errMsg = data.errors?.map((e) => e.message).filter(Boolean).join('; ') || 'Unknown D1 error';
    throw new Error(`Cloudflare D1 query failed: ${errMsg}`);
  }

  return data.result?.[0] || { results: [] };
}

export async function getExistingPageIdsFromD1(overrideConfig?: D1Config): Promise<Set<number>> {
  const result = await queryD1<{ wikipedia_page_id: number }>(
    'SELECT wikipedia_page_id FROM articles',
    [],
    overrideConfig
  );
  const ids = new Set<number>();
  for (const row of result.results || []) {
    if (typeof row.wikipedia_page_id === 'number') {
      ids.add(row.wikipedia_page_id);
    }
  }
  return ids;
}

export async function insertArticlesToD1(
  digests: ArticleDigest[],
  overrideConfig?: D1Config
): Promise<number> {
  if (digests.length === 0) return 0;

  let inserted = 0;

  for (const item of digests) {
    const digestPayload = JSON.stringify({
      hook: item.hook,
      idea_cards: item.idea_cards,
      quiz: item.quiz,
    });

    const res = await queryD1(
      `INSERT OR IGNORE INTO articles (
        wikipedia_page_id,
        published_date,
        article_title,
        wikipedia_url,
        thumbnail_url,
        category,
        read_time_minutes,
        hook,
        digest_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.wikipedia_page_id,
        item.published_date,
        item.article_title,
        item.wikipedia_url,
        item.thumbnail_url ?? null,
        item.category,
        item.read_time_minutes,
        item.hook,
        digestPayload,
      ],
      overrideConfig
    );

    const changes = res.meta?.changes ?? 1;
    if (changes > 0) {
      inserted += changes;
    }
  }

  return inserted;
}

export async function exportFeedFromD1(
  overrideConfig?: D1Config,
  limit: number = 50
): Promise<ExportFeedResult> {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 500) : 50;

  const latestResult = await queryD1<{
    wikipedia_page_id: number;
    published_date: string;
    article_title: string;
    wikipedia_url: string;
    thumbnail_url: string | null;
    category: string;
    read_time_minutes: number;
    hook: string;
    digest_json: string;
  }>(
    `SELECT
      wikipedia_page_id,
      published_date,
      article_title,
      wikipedia_url,
      thumbnail_url,
      category,
      read_time_minutes,
      hook,
      digest_json
    FROM articles
    ORDER BY published_date DESC, wikipedia_page_id DESC
    LIMIT ?`,
    [safeLimit],
    overrideConfig
  );

  const latestRows = latestResult.results || [];
  const feed: ArticleDigest[] = latestRows.map((row) => {
    let parsedDigest: Partial<ArticleDigest> = {};
    try {
      parsedDigest = JSON.parse(row.digest_json || '{}');
    } catch {
      parsedDigest = {};
    }

    return {
      wikipedia_page_id: row.wikipedia_page_id,
      published_date: row.published_date,
      article_title: row.article_title,
      wikipedia_url: row.wikipedia_url,
      thumbnail_url: row.thumbnail_url ?? null,
      category: row.category,
      read_time_minutes: row.read_time_minutes,
      hook: row.hook || parsedDigest.hook || '',
      idea_cards: Array.isArray(parsedDigest.idea_cards) ? parsedDigest.idea_cards : [],
      quiz: parsedDigest.quiz || {
        question: `What is a central focus of ${row.article_title}?`,
        options: ['Core concepts & context', 'Unrelated topic', 'None of the above'],
        correct_index: 0,
        explanation: 'Based on the article summary.',
      },
    };
  });

  const archiveResult = await queryD1<{
    wikipedia_page_id: number;
    published_date: string;
    article_title: string;
    category: string;
    read_time_minutes: number;
    hook: string;
  }>(
    `SELECT
      wikipedia_page_id,
      published_date,
      article_title,
      category,
      read_time_minutes,
      hook
    FROM articles
    ORDER BY published_date DESC, wikipedia_page_id DESC`,
    [],
    overrideConfig
  );

  const archiveRows = archiveResult.results || [];

  const outDir = path.join(process.cwd(), 'public', 'data');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'latest.json'), JSON.stringify(feed, null, 2), 'utf8');
  await fs.writeFile(
    path.join(outDir, 'archive-index.json'),
    JSON.stringify(archiveRows, null, 2),
    'utf8'
  );

  console.log(`Exported ${feed.length} articles to public/data/latest.json.`);
  console.log(`Exported ${archiveRows.length} entries to public/data/archive-index.json.`);

  return {
    latestCount: feed.length,
    archiveCount: archiveRows.length,
  };
}

export const exportStaticFeedsFromD1 = exportFeedFromD1;
