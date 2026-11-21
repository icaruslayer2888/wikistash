import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ArticleDigest, ArchiveIndexEntry } from './types';

export interface D1Config {
  accountId?: string;
  databaseId?: string;
  apiToken?: string;
  databaseName?: string;
  isLocal?: boolean;
}

export function getD1Config(): D1Config {
  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    databaseName: process.env.CLOUDFLARE_D1_NAME || 'wikistash-db',
    isLocal: process.env.D1_LOCAL === 'true',
  };
}

/**
 * Execute SQL query against Cloudflare D1 via HTTP API.
 */
async function executeD1HttpApi(
  config: D1Config,
  sql: string,
  params: any[] = []
): Promise<any> {
  if (!config.accountId || !config.databaseId || !config.apiToken) {
    throw new Error('Missing Cloudflare D1 HTTP API credentials');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sql,
      params,
    }),
  });

  const data: any = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`D1 API error: ${JSON.stringify(data.errors || data)}`);
  }

  return data.result?.[0]?.results || [];
}

/**
 * Execute SQL query via Wrangler CLI.
 */
function executeD1Wrangler(
  config: D1Config,
  sql: string,
  useLocal: boolean = false
): any {
  const dbName = config.databaseName || 'wikistash-db';
  const localFlag = useLocal ? '--local' : '--remote';

  // Escape double quotes for shell execution
  const escapedSql = sql.replace(/"/g, '\\"');
  const cmd = `npx wrangler d1 execute ${dbName} ${localFlag} --command="${escapedSql}" --json`;

  const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  const parsed = JSON.parse(output);
  return parsed?.[0]?.results || [];
}

/**
 * Fetch all existing wikipedia_page_id's from D1 (or local fallback) to ensure zero duplicates.
 */
export async function getExistingPageIds(config: D1Config): Promise<Set<number>> {
  const ids = new Set<number>();

  // Check Cloudflare D1 HTTP API first if credentials exist
  if (config.accountId && config.databaseId && config.apiToken) {
    try {
      const results = await executeD1HttpApi(config, 'SELECT wikipedia_page_id FROM articles');
      for (const row of results) {
        if (row.wikipedia_page_id) ids.add(Number(row.wikipedia_page_id));
      }
      return ids;
    } catch (e) {
      console.warn('Could not query D1 HTTP API for existing page IDs:', (e as Error).message);
    }
  }

  // Next check local wrangler if local flag set
  if (config.isLocal) {
    try {
      const results = executeD1Wrangler(config, 'SELECT wikipedia_page_id FROM articles', true);
      for (const row of results) {
        if (row.wikipedia_page_id) ids.add(Number(row.wikipedia_page_id));
      }
      return ids;
    } catch {
      // Local D1 might not be initialized yet
    }
  }

  // Fallback to local files: public/data/archive-index.json and public/data/latest.json
  const dataDir = path.resolve(process.cwd(), 'public/data');
  const archivePath = path.join(dataDir, 'archive-index.json');
  const latestPath = path.join(dataDir, 'latest.json');

  if (fs.existsSync(archivePath)) {
    try {
      const content = JSON.parse(fs.readFileSync(archivePath, 'utf-8')) as ArchiveIndexEntry[];
      for (const item of content) {
        if (item.wikipedia_page_id) ids.add(Number(item.wikipedia_page_id));
      }
    } catch {}
  }

  if (fs.existsSync(latestPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(latestPath, 'utf-8')) as ArticleDigest[];
      for (const item of content) {
        if (item.wikipedia_page_id) ids.add(Number(item.wikipedia_page_id));
      }
    } catch {}
  }

  return ids;
}

/**
 * Save new ArticleDigest records into Cloudflare D1.
 * Also persists locally to ensure immediate zero-latency builds.
 */
export async function insertArticlesToD1(
  digests: ArticleDigest[],
  config: D1Config
): Promise<number> {
  if (digests.length === 0) return 0;

  let insertedCount = 0;

  // 1. Try Cloudflare D1 HTTP API if credentials present
  if (config.accountId && config.databaseId && config.apiToken) {
    console.log(`Inserting ${digests.length} articles into Cloudflare D1 via HTTP API...`);
    for (const item of digests) {
      const sql = `
        INSERT OR IGNORE INTO articles (
          wikipedia_page_id,
          published_date,
          article_title,
          wikipedia_url,
          thumbnail_url,
          category,
          read_time_minutes,
          hook,
          digest_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const params = [
        item.wikipedia_page_id,
        item.published_date,
        item.article_title,
        item.wikipedia_url,
        item.thumbnail_url,
        item.category,
        item.read_time_minutes,
        item.hook,
        JSON.stringify(item),
      ];

      try {
        await executeD1HttpApi(config, sql, params);
        insertedCount++;
      } catch (err) {
        console.error(`Failed to insert article ${item.wikipedia_page_id} into D1:`, err);
      }
    }
  } else if (config.isLocal) {
    console.log(`Inserting ${digests.length} articles into local Wrangler D1...`);
    // Write temporary SQL file and execute via wrangler d1 execute
    const sqlFile = path.resolve(process.cwd(), '.temp_insert.sql');
    const statements = digests.map((item) => {
      const jsonStr = JSON.stringify(item).replace(/'/g, "''");
      const title = item.article_title.replace(/'/g, "''");
      const hook = item.hook.replace(/'/g, "''");
      const thumb = item.thumbnail_url ? `'${item.thumbnail_url.replace(/'/g, "''")}'` : 'NULL';
      return `INSERT OR IGNORE INTO articles (wikipedia_page_id, published_date, article_title, wikipedia_url, thumbnail_url, category, read_time_minutes, hook, digest_json) VALUES (${item.wikipedia_page_id}, '${item.published_date}', '${title}', '${item.wikipedia_url}', ${thumb}, '${item.category}', ${item.read_time_minutes}, '${hook}', '${jsonStr}');`;
    });

    fs.writeFileSync(sqlFile, statements.join('\n'));
    try {
      execSync(`npx wrangler d1 execute ${config.databaseName || 'wikistash-db'} --local --file="${sqlFile}"`, {
        stdio: 'inherit',
      });
      insertedCount = digests.length;
    } catch (e) {
      console.warn('Local wrangler execution failed:', e);
    } finally {
      if (fs.existsSync(sqlFile)) fs.unlinkSync(sqlFile);
    }
  } else {
    console.log('No Cloudflare D1 credentials detected. Proceeding with static JSON export mode.');
    const dataDir = path.resolve(process.cwd(), 'public/data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const latestPath = path.join(dataDir, 'latest.json');
    let existing: ArticleDigest[] = [];
    if (fs.existsSync(latestPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
      } catch {}
    }
    const combined = [...digests, ...existing];
    const seen = new Set<number>();
    const unique = combined.filter((item) => {
      if (seen.has(item.wikipedia_page_id)) return false;
      seen.add(item.wikipedia_page_id);
      return true;
    });
    fs.writeFileSync(latestPath, JSON.stringify(unique, null, 2), 'utf-8');
    insertedCount = digests.length;
  }

  return insertedCount;
}

/**
 * Export feed from D1 or local store directly to public/data/latest.json and archive-index.json
 */
export async function exportFeedFromD1(
  config: D1Config,
  limitLatest: number = 50
): Promise<{ latestCount: number; archiveCount: number }> {
  const dataDir = path.resolve(process.cwd(), 'public/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const latestPath = path.join(dataDir, 'latest.json');
  const archivePath = path.join(dataDir, 'archive-index.json');

  let allArticles: ArticleDigest[] = [];

  // Try querying D1 if credentials exist
  if (config.accountId && config.databaseId && config.apiToken) {
    try {
      const rows = await executeD1HttpApi(
        config,
        'SELECT digest_json FROM articles ORDER BY published_date DESC, created_at DESC'
      );
      allArticles = rows.map((r: any) => JSON.parse(r.digest_json) as ArticleDigest);
    } catch (e) {
      console.warn('Could not fetch articles from D1 API for export:', (e as Error).message);
    }
  }

  // If D1 did not return rows, read existing local latest & archive
  if (allArticles.length === 0) {
    if (fs.existsSync(latestPath)) {
      try {
        const existingLatest = JSON.parse(fs.readFileSync(latestPath, 'utf-8')) as ArticleDigest[];
        allArticles.push(...existingLatest);
      } catch {}
    }
  }

  // Deduplicate by wikipedia_page_id
  const seen = new Set<number>();
  const uniqueArticles: ArticleDigest[] = [];
  for (const art of allArticles) {
    if (!seen.has(art.wikipedia_page_id)) {
      seen.add(art.wikipedia_page_id);
      uniqueArticles.push(art);
    }
  }

  const latestSlice = uniqueArticles.slice(0, limitLatest);
  fs.writeFileSync(latestPath, JSON.stringify(latestSlice, null, 2), 'utf-8');

  // Build archive index
  const archiveIndex: ArchiveIndexEntry[] = uniqueArticles.map((art) => ({
    wikipedia_page_id: art.wikipedia_page_id,
    published_date: art.published_date,
    article_title: art.article_title,
    category: art.category,
    read_time_minutes: art.read_time_minutes,
    hook: art.hook,
    thumbnail_url: art.thumbnail_url,
    idea_cards_count: art.idea_cards?.length || 0,
  }));

  fs.writeFileSync(archivePath, JSON.stringify(archiveIndex, null, 2), 'utf-8');

  return {
    latestCount: latestSlice.length,
    archiveCount: archiveIndex.length,
  };
}
