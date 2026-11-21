import dotenv from 'dotenv';
import path from 'path';
import { collectWikipediaCandidates } from './lib/wikipedia';
import { batchSummarizeArticles, summarizeArticleWithGemini } from './lib/gemini';
import { getD1Config, getExistingPageIds, insertArticlesToD1, exportFeedFromD1 } from './lib/d1';
import { ArticleDigest, WikipediaCandidate } from './lib/types';

// Load environment variables from .env or .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 50;
  let isDryRun = false;
  let isMock = false;
  let customDate = new Date().toISOString().split('T')[0];

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      const parsed = parseInt(arg.split('=')[1], 10);
      if (!isNaN(parsed) && parsed > 0) limit = parsed;
    } else if (arg === '--dry-run') {
      isDryRun = true;
    } else if (arg === '--mock') {
      isMock = true;
    } else if (arg.startsWith('--date=')) {
      customDate = arg.split('=')[1];
    }
  }

  return { limit, isDryRun, isMock, customDate };
}

/**
 * Generate a synthetic mock digest when running in mock mode or when Gemini API key is missing.
 */
function createMockDigest(candidate: WikipediaCandidate, targetDate: string): ArticleDigest {
  const words = candidate.extractText.split(/\s+/);
  const categories = [
    'Science & Tech',
    'History & Culture',
    'Psychology & Philosophy',
    'Biography',
    'Nature & Space',
    'Society & Economics',
  ] as const;
  const category = categories[Math.abs(candidate.pageId) % categories.length];

  return {
    wikipedia_page_id: candidate.pageId,
    published_date: targetDate,
    article_title: candidate.title,
    wikipedia_url: candidate.url,
    thumbnail_url: candidate.thumbnailUrl,
    category,
    read_time_minutes: Math.max(2, Math.min(6, Math.round(words.length / 250))),
    hook: `${candidate.title} challenges our conventional assumptions through ${candidate.description.toLowerCase()}.`,
    idea_cards: [
      {
        card_number: 1,
        title: `The Essence of ${candidate.title.slice(0, 20)}`,
        insight: words.slice(0, 45).join(' ') + '...',
        key_takeaway: `Takeaway: Understanding ${candidate.title} reveals hidden structural patterns in ${category}.`,
      },
      {
        card_number: 2,
        title: 'Core Mechanisms & Impact',
        insight: words.slice(45, 90).join(' ') + '...',
        key_takeaway: 'Mental Model: First principles reasoning clarifies complex emergent phenomena.',
      },
      {
        card_number: 3,
        title: 'Modern Relevance & Synthesis',
        insight: words.slice(90, 135).join(' ') + '...',
        key_takeaway: 'Takeaway: Historical insights directly inform present technological and cultural shifts.',
      },
    ],
    quiz: {
      question: `What fundamental principle is central to ${candidate.title}?`,
      options: [
        `The dynamics of ${category.toLowerCase()}`,
        'Random thermal fluctuation without systemic cause',
        'Standard equilibrium theory in isolation',
      ],
      correct_index: 0,
      explanation: `${candidate.title} primarily exemplifies core principles of ${category.toLowerCase()}.`,
    },
  };
}

async function main() {
  const { limit, isDryRun, isMock, customDate } = parseArgs();
  const d1Config = getD1Config();
  const apiKey = process.env.GEMINI_API_KEY;

  console.log('='.repeat(70));
  console.log('⚡ WikiStash — Daily AI Ingestion Pipeline');
  console.log('='.repeat(70));
  console.log(`Target Count     : ${limit} articles`);
  console.log(`Publish Date     : ${customDate}`);
  console.log(`Dry Run Mode     : ${isDryRun ? 'YES (Preview only)' : 'NO'}`);
  console.log(`Mock Mode        : ${isMock ? 'YES (Bypassing Gemini)' : 'NO'}`);
  console.log(`Cloudflare D1    : ${d1Config.accountId ? 'Configured (HTTP API)' : d1Config.isLocal ? 'Local Wrangler' : 'Static Fallback'}`);
  console.log(`Gemini API Key   : ${apiKey ? 'Configured (Live AI)' : isMock ? 'Mocked' : 'Missing (Will use Mock Mode)'}`);
  console.log('='.repeat(70));

  // 1. Fetch existing Page IDs to prevent duplicates
  console.log('\n[1/4] Checking existing Wikipedia page IDs for deduplication...');
  const excludedIds = await getExistingPageIds(d1Config);
  console.log(`Found ${excludedIds.size} already stored articles. Zero duplicates guaranteed.`);

  // 2. Fetch quality-filtered Wikipedia candidates
  console.log(`\n[2/4] Fetching ${limit} quality-filtered Wikipedia articles (min 450 words)...`);
  const candidates = await collectWikipediaCandidates(limit, excludedIds, (collected, attempts) => {
    process.stdout.write(`\rSampling articles: ${collected}/${limit} valid found (${attempts} attempts)`);
  });
  console.log(`\nSuccessfully collected ${candidates.length} high-signal Wikipedia articles.`);

  if (candidates.length === 0) {
    console.log('No new articles found. Exiting.');
    return;
  }

  if (isDryRun) {
    console.log('\n[DRY RUN SUMMARY]');
    candidates.forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.pageId}] ${c.title} (${c.wordCount} words) - ${c.description}`);
    });
    console.log('\nDry run complete. No database writes or AI requests executed.');
    return;
  }

  // 3. Summarize articles with Gemini
  console.log(`\n[3/4] Summarizing articles into Deepstash-style micro-learning cards...`);
  let digests: ArticleDigest[] = [];

  if (apiKey && !isMock) {
    console.log('Processing via Gemini Free Tier Guardrails: Small batches of 2 concurrent with 4-second delay...');
    digests = await batchSummarizeArticles(
      candidates,
      customDate,
      apiKey,
      process.env.GEMINI_MODEL,
      (completed, total, currentTitle) => {
        console.log(`[${completed}/${total}] Summarized: "${currentTitle}"`);
      }
    );
  } else {
    console.log('Using high-fidelity structured mock generator (No GEMINI_API_KEY required)...');
    digests = candidates.map((cand) => createMockDigest(cand, customDate));
  }

  console.log(`Successfully generated ${digests.length} ArticleDigest records.`);

  // 4. Save to Cloudflare D1 and Export Feed
  console.log(`\n[4/4] Inserting into Cloudflare D1 and exporting static CDN feed...`);
  const inserted = await insertArticlesToD1(digests, d1Config);
  console.log(`Inserted ${inserted} new records.`);

  const exportResult = await exportFeedFromD1(d1Config, 50);
  console.log(`Feed exported successfully:`);
  console.log(`  - public/data/latest.json        (${exportResult.latestCount} articles)`);
  console.log(`  - public/data/archive-index.json (${exportResult.archiveCount} historical articles)`);

  console.log('\n' + '='.repeat(70));
  console.log('🎉 WikiStash daily ingestion completed successfully!');
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error('\nFatal error in ingestion pipeline:', err);
  process.exit(1);
});
