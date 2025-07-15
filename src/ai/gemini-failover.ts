import { googleAI } from '@genkit-ai/googleai';

const keys = [
  process.env.GEMINI_API_KEY_1!,
  process.env.GEMINI_API_KEY_2!,
];

export async function callGeminiWithFailover(model: string, input: any) {
  let lastError;
  for (const key of keys) {
    try {
      const provider = googleAI({ apiKey: key });
      const result = await provider.call(model, input);
      // If result has an output property, return that
      if (result && (result as any).output !== undefined) return (result as any).output;
      // Otherwise, return the result directly
      return result;
    } catch (err: any) {
      if (err.status === 429 || err.status === 503) {
        lastError = err;
        continue; // Try next key
      }
      throw err; // Other errors: throw immediately
    }
  }
  throw lastError || new Error('All Gemini API keys failed');
} 