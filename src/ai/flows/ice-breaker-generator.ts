'use server';
/**
 * @fileOverview Generates an ice-breaker question for an interview based on a video frame.
 *
 * - generateIceBreakerQuestion - A function that generates an ice-breaker question.
 * - GenerateIceBreakerQuestionInput - The input type for the generateIceBreakerQuestion function.
 * - GenerateIceBreakerQuestionOutput - The return type for the generateIceBreakerQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateIceBreakerQuestionInputSchema = z.object({
  candidateName: z.string().describe("The candidate's full name."),
  videoFrameDataUri: z.string().describe(
    "A single video frame captured at the start of the interview, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  language: z.string().describe('The language for the question.'),
});
export type GenerateIceBreakerQuestionInput = z.infer<typeof GenerateIceBreakerQuestionInputSchema>;

const GenerateIceBreakerQuestionOutputSchema = z.object({
  question: z.string().describe('A single, friendly, and formal ice-breaker question.'),
});
export type GenerateIceBreakerQuestionOutput = z.infer<typeof GenerateIceBreakerQuestionOutputSchema>;

export async function generateIceBreakerQuestion(input: GenerateIceBreakerQuestionInput): Promise<GenerateIceBreakerQuestionOutput> {
  return generateIceBreakerQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateIceBreakerQuestionPrompt',
  input: {schema: GenerateIceBreakerQuestionInputSchema},
  output: {schema: GenerateIceBreakerQuestionOutputSchema},
  prompt: `You are Tina, a friendly and professional AI interview coach for the "CareerSpark AI" app. Your tone should be encouraging and supportive.

Your task is to start the mock interview with a personalized, welcoming message in a single response.

The interview is in {{{language}}}. All your output must be in {{{language}}}.

1.  **Start with a greeting:** Address the candidate by name: "Hello {{{candidateName}}}, I am Tina, welcome to the CareerSpark AI interview prep."
2.  **Add an ice-breaker:** Based on the provided video frame, make a brief, positive observation about the candidate's environment, attire, or apparent confidence.
3.  **End with a starting question:** Conclude by asking if they are ready to begin.

Combine these into one smooth, conversational message.

Examples:
- "Hello {{{candidateName}}}, I am Tina, welcome to the CareerSpark AI interview prep. That's a professional-looking background you have there. I see you're all set. Are you ready to begin?"
- "Hello {{{candidateName}}}, I am Tina, welcome to the CareerSpark AI interview prep. You seem ready and confident for our session today. Shall we get started?"

Do not be overly personal or intrusive. Focus on positive and professional observations.

Candidate's video frame:
{{media url=videoFrameDataUri}}
`,
});

const generateIceBreakerQuestionFlow = ai.defineFlow(
  {
    name: 'generateIceBreakerQuestionFlow',
    inputSchema: GenerateIceBreakerQuestionInputSchema,
    outputSchema: GenerateIceBreakerQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
