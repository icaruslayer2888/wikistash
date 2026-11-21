import { fetchQualityWikipediaArticles } from './lib/wikipedia';
import { batchSummarizeArticles } from './lib/gemini';
import * as d1 from './lib/d1';

function parseArgs(argv: string[]): { limit: number; dryRun: boolean } {
  let limit = 50;
  let dryRun = false;

  for (const arg of argv) {
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 100);
      }
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  return { limit, dryRun };
}

function checkD1Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_API_TOKEN?.trim() &&
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim() &&
      process.env.CLOUDFLARE_D1_DATABASE_ID?.trim()
  );
}

async function main() {
  const { limit, dryRun } = parseArgs(process.argv.slice(2));
  const publishDate = new Date().toISOString().slice(0, 10);
  const d1Enabled = checkD1Configured();
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';

  console.log('======================================================================');
  console.log('⚡ WikiStash — Daily AI Ingestion Pipeline');
  console.log('======================================================================');
  console.log(`Target Count     : ${limit} articles`);
  console.log(`Publish Date     : ${publishDate}`);
  console.log(`Dry Run Mode     : ${dryRun ? 'YES' : 'NO'}`);
  console.log(`Cloudflare D1    : ${d1Enabled ? 'Configured (HTTP API)' : 'Not Configured'}`);
  console.log(`Gemini API Key   : ${geminiKey ? 'Configured (Live AI)' : 'Missing (Fallback Mode)'}`);
  console.log('======================================================================');

  console.log('[1/4] Checking existing Wikipedia page IDs for deduplication...');
  const getExistingIds =
    (d1 as any).getExistingPageIdsFromD1 ||
    (d1 as any).fetchExistingPageIds ||
    (d1 as any).getExistingWikipediaPageIds;

  const existingIds: Set<number> =
    d1Enabled && !dryRun && typeof getExistingIds === 'function'
      ? await getExistingIds()
      : new Set<number>();
  console.log(`Found ${existingIds.size} already stored articles. Zero duplicates guaranteed.`);

  console.log(`[2/4] Fetching ${limit} quality-filtered Wikipedia articles (min 450 words)...`);
  const candidates = await fetchQualityWikipediaArticles(limit, existingIds, 450);
  console.log(`Successfully collected ${candidates.length} high-signal Wikipedia articles.`);

  if (candidates.length === 0) {
    console.warn('No new candidate articles collected. Skipping summarization and DB writes.');
    return;
  }

  console.log('[3/4] Summarizing articles into Deepstash-style micro-learning cards...');
  const digests = await batchSummarizeArticles(candidates, publishDate, geminiKey);
  console.log(`Successfully generated ${digests.length} ArticleDigest records.`);

  if (dryRun) {
    console.log('[4/4] Dry-run enabled: skipping Cloudflare D1 writes and static feed export.');
    return;
  }

  console.log('[4/4] Inserting into Cloudflare D1 and exporting static CDN feed...');
  if (!d1Enabled) {
    throw new Error('Cloudflare D1 environment variables are not configured; aborting ingest.');
  }

  const insertFn = (d1 as any).insertArticlesToD1 || (d1 as any).upsertArticlesToD1;
  if (typeof insertFn !== 'function') {
    throw new Error(`Could not find insert function in scripts/lib/d1.ts. Exports found: ${Object.keys(d1).join(', ')}`);
  }

  const insertResult = await insertFn(digests);
  const insertedCount =
    typeof insertResult === 'number'
      ? insertResult
      : typeof insertResult?.inserted === 'number'
        ? insertResult.inserted
        : digests.length;

  console.log(`Inserted ${insertedCount} new records.`);

  if (insertedCount === 0) {
    throw new Error(
      `D1 write guard triggered: ${digests.length} digests were generated, but 0 rows were inserted into D1.`
    );
  }

  const exportFn =
    (d1 as any).exportStaticFeedsFromD1 ||
    (d1 as any).exportFeedFiles ||
    (d1 as any).exportStaticFeed;

  if (typeof exportFn === 'function') {
    await exportFn();
  } else {
    console.warn(`No export function matched in scripts/lib/d1.ts (${Object.keys(d1).join(', ')}).`);
  }

  console.log('======================================================================');
  console.log('🎉 WikiStash daily ingestion completed successfully!');
  console.log('======================================================================');
}

main().catch((err) => {
  console.error('❌ Ingestion pipeline failed:', err);
  process.exit(1);
});
