import { ArticleDigest, WikipediaCandidate } from './types';

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_GROQ_MODEL = 'llama-3.1-8b-instant';

/**
 * Summarize a Wikipedia article using Groq's high-speed inference engine.
 * Ideal zero-cost secondary fallback when Google AI Studio hits 503 high-demand spikes.
 */
export async function summarizeArticleWithGroq(
  candidate: WikipediaCandidate,
  targetDate: string,
  apiKey: string,
  model: string = DEFAULT_GROQ_MODEL
): Promise<ArticleDigest> {
  const contentSnippet = candidate.extractText
    .split(/\s+/)
    .slice(0, 2500)
    .join(' ');

  const systemPrompt = `You are the lead curator at WikiStash, a Deepstash-style micro-learning platform.
Your mission is to transform dense Wikipedia articles into bite-sized, high-signal knowledge nuggets that readers can learn in under 3 minutes.
Rules:
1. Category must be strictly one of: 'Science & Tech', 'History & Culture', 'Psychology & Philosophy', 'Biography', 'Nature & Space', 'Society & Economics'.
2. Hook: Exactly 1 provocative, intriguing sentence highlighting an unexpected fact or counter-intuitive truth.
3. Idea Cards: Provide 3 to 5 cards. Each card must have:
   - card_number: sequential number (1, 2, 3...)
   - title: 3 to 6 words punchy headline (e.g. "The Illusion of Infinite Choice")
   - insight: 2 to 3 sentences explaining the core mechanism or context simply and vividly
   - key_takeaway: 1 memorable mental model or practical takeaway (e.g. "Takeaway: Abundance without curation creates cognitive paralysis.")
4. Quiz: Exactly 1 question, 3 plausible options, correct_index (0, 1, or 2), and a brief explanation.
5. Return strictly valid JSON with this exact structure:
{
  "category": "Science & Tech",
  "read_time_minutes": 3,
  "hook": "...",
  "idea_cards": [
    {
      "card_number": 1,
      "title": "...",
      "insight": "...",
      "key_takeaway": "..."
    }
  ],
  "quiz": {
    "question": "...",
    "options": ["A", "B", "C"],
    "correct_index": 0,
    "explanation": "..."
  }
}`;

  const userPrompt = `Article Title: ${candidate.title}
Wikipedia URL: ${candidate.url}
Overview Description: ${candidate.description}
Thumbnail: ${candidate.thumbnailUrl || 'null'}

Article Text:
${contentSnippet}`;

  const modelsToTry = [model, FALLBACK_GROQ_MODEL];

  for (const currentModel of modelsToTry) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq HTTP ${response.status}: ${errorText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty completion from Groq API');
      }

      const parsed = JSON.parse(content);

      // Align and sanitize fields
      const digest: ArticleDigest = {
        wikipedia_page_id: candidate.pageId,
        published_date: targetDate,
        article_title: candidate.title,
        wikipedia_url: candidate.url,
        thumbnail_url: candidate.thumbnailUrl || null,
        category: parsed.category || 'Science & Tech',
        read_time_minutes: parsed.read_time_minutes || 3,
        hook: parsed.hook || `${candidate.title} reveals hidden foundational principles.`,
        idea_cards: Array.isArray(parsed.idea_cards) ? parsed.idea_cards : [],
        quiz: parsed.quiz || {
          question: `What is a central principle of ${candidate.title}?`,
          options: ['Core systemic dynamics', 'Arbitrary historical chance', 'Peripheral trivia'],
          correct_index: 0,
          explanation: `${candidate.title} primarily exemplifies core dynamics in its field.`,
        },
      };

      // Validate quiz options
      if (digest.quiz.options?.length !== 3) {
        digest.quiz.options = ['Option A', 'Option B', 'Option C'];
        digest.quiz.correct_index = 0;
      }

      return digest;
    } catch (err: any) {
      console.warn(`[Groq Failover Attempt] Model ${currentModel} error:`, err?.message || err);
    }
  }

  throw new Error(`Groq summarization failed for "${candidate.title}" across models`);
}
