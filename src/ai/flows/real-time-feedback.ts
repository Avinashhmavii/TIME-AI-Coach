'use server';

/**
 * @fileOverview A real-time interview feedback AI agent.
 *
 * - getRealTimeFeedback - A function that provides real-time feedback during a mock interview.
 * - GetRealTimeFeedbackInput - The input type for the getRealTimeFeedback function.
 * - GetRealTimeFeedbackOutput - The return type for the getRealTimeFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetRealTimeFeedbackInputSchema = z.object({
  transcript: z
    .string()
    .describe('The transcript of the user input during the mock interview.'),
  language: z.string().describe('The language of the transcript and for the feedback.'),
});
export type GetRealTimeFeedbackInput = z.infer<typeof GetRealTimeFeedbackInputSchema>;

const GetRealTimeFeedbackOutputSchema = z.object({
  contentFeedback: z.string().describe('Feedback on the content of the response.'),
  toneFeedback: z.string().describe('Feedback on the tone of the response.'),
  clarityFeedback: z.string().describe('Feedback on the clarity of the response.'),
});
export type GetRealTimeFeedbackOutput = z.infer<typeof GetRealTimeFeedbackOutputSchema>;

export async function getRealTimeFeedback(input: GetRealTimeFeedbackInput): Promise<GetRealTimeFeedbackOutput> {
  return getRealTimeFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getRealTimeFeedbackPrompt',
  input: {schema: GetRealTimeFeedbackInputSchema},
  output: {schema: GetRealTimeFeedbackOutputSchema},
  prompt: `You are an AI-powered interview coach providing real-time feedback during a mock interview.

  Analyze the following transcript and provide feedback on the content, tone, and clarity of the response.
  The transcript is in {{{language}}}. Provide the feedback in {{{language}}} as well.

  Transcript: {{{transcript}}}

  Content Feedback:
  Tone Feedback:
  Clarity Feedback:`,
});

const getRealTimeFeedbackFlow = ai.defineFlow(
  {
    name: 'getRealTimeFeedbackFlow',
    inputSchema: GetRealTimeFeedbackInputSchema,
    outputSchema: GetRealTimeFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
