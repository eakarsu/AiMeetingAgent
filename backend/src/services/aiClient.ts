import OpenAI from 'openai';

/**
 * Get the configured AI client + model name.
 * Routes through OpenRouter when OPENROUTER_API_KEY is set, else falls back to OpenAI.
 */
export const getAIClient = () => {
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

  if (process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.includes('your-')) {
    return {
      client: new OpenAI({
        baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'AI Meeting Agent',
        },
      }),
      model,
    };
  }

  return {
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' }),
    model: 'gpt-4o-mini',
  };
};

/**
 * Robust 3-strategy JSON parser used by all AI endpoints.
 *  1. Try direct parse
 *  2. Strip markdown fences and parse
 *  3. Substring from first '{' to last '}' and parse
 */
export function parseAIJson<T = any>(text: string, fallback: T = null as any): T {
  try {
    return JSON.parse(text);
  } catch {}

  const stripped = text
    .replace(/```(?:json)?\n?/g, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {}

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }
  return fallback;
}
