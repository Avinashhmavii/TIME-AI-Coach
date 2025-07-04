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
  prompt: `You are an AI interview coach starting a mock interview.
Your task is to generate a single, friendly, and formal ice-breaker question based on a video frame of the candidate.

The question should be in {{{language}}}.

Use the video frame to make an observation about the candidate's environment, attire, or apparent confidence.
Keep the question short, welcoming, and professional. It should lead smoothly into the interview.

Examples:
- "That's a professional-looking background you have there. I see you're all set. Are you ready to begin?"
- "You seem ready and confident for our session today. Shall we get started?"
- "I see you're well-prepared. That's a sharp attire. Shall we dive into the first question?"

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
