import { GoogleGenAI, Type } from '@google/genai';
import { ArticleDigest, WikipediaCandidate } from './types';

const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-3.6-flash';

const ideaCardSchema = {
  type: Type.OBJECT,
  properties: {
    card_number: {
      type: Type.INTEGER,
      description: 'Card sequence number, starting from 1 up to 5',
    },
    title: {
      type: Type.STRING,
      description: '3–6 word punchy headline capturing the core concept',
    },
    insight: {
      type: Type.STRING,
      description: '2–3 crisp, engaging sentences delivering the insight with zero fluff',
    },
    key_takeaway: {
      type: Type.STRING,
      description: '1 memorable mental model, rule of thumb, or life takeaway',
    },
  },
  required: ['card_number', 'title', 'insight', 'key_takeaway'],
};

const articleDigestSchema = {
  type: Type.OBJECT,
  properties: {
    wikipedia_page_id: { type: Type.INTEGER },
    published_date: {
      type: Type.STRING,
      description: 'ISO formatted date string YYYY-MM-DD',
    },
    article_title: { type: Type.STRING },
    wikipedia_url: { type: Type.STRING },
    thumbnail_url: {
      type: Type.STRING,
      nullable: true,
      description: 'URL of image thumbnail or null',
    },
    category: {
      type: Type.STRING,
      enum: [
        'Science & Tech',
        'History & Culture',
        'Psychology & Philosophy',
        'Biography',
        'Nature & Space',
        'Society & Economics',
      ],
      description: 'Best matching category for this topic',
    },
    read_time_minutes: {
      type: Type.INTEGER,
      description: 'Estimated reading time in minutes (2 to 6)',
    },
    hook: {
      type: Type.STRING,
      description: '1 captivating curiosity hook that makes the reader stop scrolling',
    },
    idea_cards: {
      type: Type.ARRAY,
      items: ideaCardSchema,
      description: '3 to 5 high-signal idea cards summarizing the key takeaways',
    },
    quiz: {
      type: Type.OBJECT,
      properties: {
        question: {
          type: Type.STRING,
          description: 'A punchy, multiple choice question testing comprehension',
        },
        options: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Exactly 3 distinct answer options',
        },
        correct_index: {
          type: Type.INTEGER,
          description: 'Zero-based index (0, 1, or 2) of the correct answer',
        },
        explanation: {
          type: Type.STRING,
          description: '1-2 sentence crisp explanation of why that answer is correct',
        },
      },
      required: ['question', 'options', 'correct_index', 'explanation'],
    },
  },
  required: [
    'wikipedia_page_id',
    'published_date',
    'article_title',
    'wikipedia_url',
    'category',
    'read_time_minutes',
    'hook',
    'idea_cards',
    'quiz',
  ],
};

export function createFallbackDigest(candidate: WikipediaCandidate, targetDate: string): ArticleDigest {
  const words = candidate.extractText.split(/\s+/).filter(Boolean);
  const categories = [
    'Science & Tech',
    'History & Culture',
    'Psychology & Philosophy',
    'Biography',
    'Nature & Space',
    'Society & Economics',
  ] as const;
  const category = categories[Math.abs(candidate.pageId) % categories.length];

  const cleanDescription = candidate.description
    ? candidate.description.charAt(0).toUpperCase() + candidate.description.slice(1)
    : 'A significant historical and cultural topic';

  return {
    wikipedia_page_id: candidate.pageId,
    published_date: targetDate,
    article_title: candidate.title,
    wikipedia_url: candidate.url,
    thumbnail_url: candidate.thumbnailUrl,
    category,
    read_time_minutes: Math.max(2, Math.min(6, Math.round(words.length / 250))),
    hook: `${candidate.title} illuminates how ${candidate.description.toLowerCase() || 'key events'} reshaped our understanding of ${category.toLowerCase()}.`,
    idea_cards: [
      {
        card_number: 1,
        title: `Origins of ${candidate.title.slice(0, 24)}`,
        insight: words.slice(0, 45).join(' ') + '...',
        key_takeaway: `Takeaway: ${cleanDescription} reveals underlying foundational patterns in ${category}.`,
      },
      {
        card_number: 2,
        title: 'Core Dynamics & Developments',
        insight: words.slice(45, 95).join(' ') + '...',
        key_takeaway: 'Mental Model: First-principles examination clarifies how complex historical and scientific systems evolve.',
      },
      {
        card_number: 3,
        title: 'Lasting Impact & Legacy',
        insight: words.slice(95, 140).join(' ') + '...',
        key_takeaway: 'Takeaway: Historical precedents directly inform contemporary decisions and cultural developments.',
      },
    ],
    quiz: {
      question: `What primary subject is central to ${candidate.title}?`,
      options: [
        `${cleanDescription}`,
        'Unrelated peripheral documentation',
        'Modern speculative fiction only',
      ],
      correct_index: 0,
      explanation: `${candidate.title} is primarily known as: ${candidate.description || 'a notable Wikipedia subject'}.`,
    },
  };
}

export async function summarizeArticleWithGemini(
  candidate: WikipediaCandidate,
  targetDate: string,
  apiKey: string,
  modelName?: string
): Promise<ArticleDigest> {
  const ai = new GoogleGenAI({ apiKey });

  // 1,200 words cuts TPM by >50% while retaining core thesis & mechanisms
  const contentSnippet = candidate.extractText
    .split(/\s+/)
    .slice(0, 1200)
    .join(' ');

  const systemInstruction = `You are the lead curator at WikiStash, a Deepstash-style micro-learning platform.
Transform this Wikipedia article into bite-sized, high-signal knowledge nuggets readable in under 3 minutes.
Rules:
1. Category: strictly one of 'Science & Tech', 'History & Culture', 'Psychology & Philosophy', 'Biography', 'Nature & Space', 'Society & Economics'.
2. Hook: 1 provocative, intriguing sentence highlighting an unexpected fact or counter-intuitive truth.
3. Idea Cards: 3 to 5 cards. Each card needs:
   - title: 3–6 words punchy headline.
   - insight: 2–3 vivid, clear sentences explaining the mechanism or context.
   - key_takeaway: 1 memorable mental model or practical takeaway starting with "Takeaway:" or "Mental Model:".
4. Quiz: 1 question, 3 plausible options, correct_index (0, 1, or 2), and a 1–2 sentence explanation.
5. Date: "${targetDate}". Page ID: ${candidate.pageId}. Title: "${candidate.title}".
6. Return strictly valid JSON adhering to the schema.`;

  const prompt = `Article Title: ${candidate.title}
Wikipedia URL: ${candidate.url}
Overview: ${candidate.description}

Article Text:
${contentSnippet}
`;

  const maxRetries = 3;
  let activeModel = modelName || process.env.GEMINI_MODEL || PRIMARY_MODEL;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\n${prompt}` }] },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: articleDigestSchema,
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      const parsed = JSON.parse(responseText) as ArticleDigest;

      parsed.wikipedia_page_id = candidate.pageId;
      parsed.article_title = candidate.title;
      parsed.wikipedia_url = candidate.url;
      parsed.thumbnail_url = candidate.thumbnailUrl || null;
      parsed.published_date = targetDate;

      if (parsed.quiz?.options && parsed.quiz.options.length !== 3) {
        if (parsed.quiz.options.length > 3) {
          parsed.quiz.options = parsed.quiz.options.slice(0, 3) as [string, string, string];
        } else {
          while (parsed.quiz.options.length < 3) {
            parsed.quiz.options.push('None of the above');
          }
        }
      }

      if (parsed.quiz && (parsed.quiz.correct_index < 0 || parsed.quiz.correct_index > 2)) {
        parsed.quiz.correct_index = 0;
      }

      return parsed;
    } catch (err: any) {
      if (err?.status === 400 || err?.status === 401 || err?.status === 403) {
        console.error(`[Gemini Fatal Config Error (${err.status})] Model="${activeModel}" -> ${err?.message || err}`);
        break;
      }

      // Fail fast on 404 model-not-found without burning retry sleep
      if (err?.status === 404 && activeModel !== FALLBACK_MODEL) {
        console.warn(`[Model 404] "${activeModel}" unavailable. Switching to "${FALLBACK_MODEL}"...`);
        activeModel = FALLBACK_MODEL;
        continue;
      }

      const isCapacityIssue =
        err?.status === 503 ||
        err?.status === 500 ||
        err?.message?.includes('503') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.message?.includes('high demand');

      if (isCapacityIssue && attempt < maxRetries) {
        if (activeModel !== FALLBACK_MODEL) {
          console.warn(`[503 High Demand on ${activeModel}] Switching to "${FALLBACK_MODEL}"...`);
          activeModel = FALLBACK_MODEL;
          continue;
        }
        const waitMs = 8000 * (attempt + 1);
        console.warn(`[Gemini 503] Cooling down ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      const isRateLimit =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('Quota');

      if (isRateLimit && attempt < maxRetries) {
        // Switch model on second 429 so we tap a fresh per-model quota bucket
        if (attempt >= 1 && activeModel !== FALLBACK_MODEL) {
          console.warn(`[429 Quota Limit on ${activeModel}] Switching to "${FALLBACK_MODEL}"...`);
          activeModel = FALLBACK_MODEL;
        }
        // Longer backoff (15s -> 30s -> 45s) lets the rolling 60s RPM/TPM window reset
        const delayMs = 15000 * (attempt + 1) + Math.floor(Math.random() * 2000);
        console.warn(`[Gemini Rate Limit 429] Backing off for ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (attempt < maxRetries) {
        console.warn(`[Gemini API Error] ${err?.message || err}. Retrying in 4s...`);
        await new Promise((resolve) => setTimeout(resolve, 4000));
        continue;
      }
    }
  }

  console.warn(`[Graceful Recovery] "${candidate.title}" fell back to algorithmic digest.`);
  return createFallbackDigest(candidate, targetDate);
}

export async function batchSummarizeArticles(
  candidates: WikipediaCandidate[],
  targetDate: string,
  apiKey: string,
  modelName?: string,
  onProgress?: (completed: number, total: number, currentTitle: string) => void
): Promise<ArticleDigest[]> {
  const results: ArticleDigest[] = [];
  // 7s pacing (~8.5 RPM) prevents hitting rolling minute limits across 50 articles (~6 min total)
  const PACING_DELAY_MS = 7000;
  const resolvedModel = modelName || process.env.GEMINI_MODEL || PRIMARY_MODEL;

  let aiCount = 0;
  let fallbackCount = 0;

  console.log(`Using Gemini model: "${resolvedModel}" (${candidates.length} articles queued)`);

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    console.log(`-> [${i + 1}/${candidates.length}] Calling Gemini for "${candidate.title}"...`);
    try {
      const digest = await summarizeArticleWithGemini(
        candidate,
        targetDate,
        apiKey,
        resolvedModel
      );
      if (digest.quiz.options[1] === 'Unrelated peripheral documentation') {
        fallbackCount++;
      } else {
        aiCount++;
      }
      results.push(digest);
      if (onProgress) {
        onProgress(results.length, candidates.length, digest.article_title);
      }
    } catch (err) {
      console.error(`Error processing "${candidate.title}", generating fallback:`, err);
      fallbackCount++;
      const fallback = createFallbackDigest(candidate, targetDate);
      results.push(fallback);
      if (onProgress) {
        onProgress(results.length, candidates.length, fallback.article_title);
      }
    }

    if (i < candidates.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, PACING_DELAY_MS));
    }
  }

  console.log(`Summarization quality summary: ${aiCount} AI-curated, ${fallbackCount} algorithmic fallbacks.`);
  return results;
}
