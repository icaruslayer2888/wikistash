import { GoogleGenAI, Type } from '@google/genai';
import { ArticleDigest, WikipediaCandidate } from './types';

const DEFAULT_MODEL = 'gemini-3.8-flash';

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

/**
 * Summarize a Wikipedia article into Deepstash-style micro-learning cards.
 * Uses Gemini structured output schema with rate-limit retries.
 */
export async function summarizeArticleWithGemini(
  candidate: WikipediaCandidate,
  targetDate: string,
  apiKey: string,
  modelName: string = process.env.GEMINI_MODEL || DEFAULT_MODEL
): Promise<ArticleDigest> {
  const ai = new GoogleGenAI({ apiKey });

  // Excerpt first ~2,500 words to ensure we stay well within context while getting full substance
  const contentSnippet = candidate.extractText
    .split(/\s+/)
    .slice(0, 2500)
    .join(' ');

  const systemInstruction = `You are the lead curator at WikiStash, a Deepstash-style micro-learning platform.
Your mission is to transform dense Wikipedia articles into bite-sized, high-signal knowledge nuggets that readers can learn in under 3 minutes.
Rules:
1. Category must be strictly one of: 'Science & Tech', 'History & Culture', 'Psychology & Philosophy', 'Biography', 'Nature & Space', 'Society & Economics'.
2. Hook: Exactly 1 provocative, intriguing sentence highlighting an unexpected fact or counter-intuitive truth.
3. Idea Cards: Provide 3 to 5 cards. Each card must have:
   - title: 3 to 6 words punchy headline (e.g. "The Illusion of Infinite Choice").
   - insight: 2 to 3 sentences explaining the mechanism or historical context simply and vividly.
   - key_takeaway: 1 memorable mental model or practical takeaway (e.g. "Takeaway: Abundance without curation creates cognitive paralysis.").
4. Quiz: Exactly 1 question, 3 plausible options, correct_index (0, 1, or 2), and a brief explanation.
5. Date: Use "${targetDate}".
6. Page ID: ${candidate.pageId}. Title: "${candidate.title}".
7. Return strictly valid JSON adhering to the provided schema.`;

  const prompt = `Article Title: ${candidate.title}
Wikipedia URL: ${candidate.url}
Overview Description: ${candidate.description}
Thumbnail: ${candidate.thumbnailUrl || 'null'}

Article Text:
${contentSnippet}
`;

  let lastError: unknown = null;
  const maxRetries = 4;
  let activeModel = modelName || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbackModels = ['gemini-3.8-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

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
          temperature: 0.4,
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      const parsed = JSON.parse(responseText) as ArticleDigest;

      // Ensure mandatory fields are firmly aligned
      parsed.wikipedia_page_id = candidate.pageId;
      parsed.article_title = candidate.title;
      parsed.wikipedia_url = candidate.url;
      parsed.thumbnail_url = candidate.thumbnailUrl || null;
      parsed.published_date = targetDate;

      // Normalize quiz options array length to 3
      if (parsed.quiz && parsed.quiz.options && parsed.quiz.options.length !== 3) {
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
      lastError = err;
      const isNotFound =
        err?.status === 404 ||
        err?.message?.includes('404') ||
        err?.message?.includes('no longer available') ||
        err?.message?.includes('NOT_FOUND');

      if (isNotFound) {
        const nextModel = fallbackModels.find((m) => m !== activeModel);
        if (nextModel) {
          console.warn(`[Gemini Model Unavailable] "${activeModel}" is not available. Auto-falling back to "${nextModel}"...`);
          activeModel = nextModel;
          continue;
        }
      }

      const isRateLimit =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('Quota');

      if (isRateLimit && attempt < maxRetries) {
        const delayMs = 4000 * Math.pow(2, attempt);
        console.warn(`[Gemini Rate Limit 429] Backing off for ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (attempt < maxRetries) {
        console.warn(`[Gemini API Error] ${err?.message || err}. Retrying in 2000ms...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
    }
  }

  throw new Error(`Failed to summarize article "${candidate.title}" after ${maxRetries} retries: ${lastError}`);
}

/**
 * Process a collection of Wikipedia candidates in batches of 2 with a 4-second delay.
 * Adheres strictly to Gemini AI Studio Free Tier rate limits (15 RPM).
 */
export async function batchSummarizeArticles(
  candidates: WikipediaCandidate[],
  targetDate: string,
  apiKey: string,
  modelName?: string,
  onProgress?: (completed: number, total: number, currentTitle: string) => void
): Promise<ArticleDigest[]> {
  const results: ArticleDigest[] = [];
  const BATCH_SIZE = 2;
  const DELAY_MS = 4000;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const currentBatch = candidates.slice(i, i + BATCH_SIZE);

    const batchPromises = currentBatch.map(async (candidate) => {
      try {
        const digest = await summarizeArticleWithGemini(
          candidate,
          targetDate,
          apiKey,
          modelName
        );
        return digest;
      } catch (err) {
        console.error(`Error processing "${candidate.title}":`, err);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const item of batchResults) {
      if (item) {
        results.push(item);
        if (onProgress) {
          onProgress(results.length, candidates.length, item.article_title);
        }
      }
    }

    // Delay between batches if there are more to process
    if (i + BATCH_SIZE < candidates.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return results;
}
