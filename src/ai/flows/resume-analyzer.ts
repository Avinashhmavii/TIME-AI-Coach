'use server';

/**
 * @fileOverview Analyzes a resume to identify key skills and experiences.
 *
 * - analyzeResume - A function that handles the resume analysis process.
 * - AnalyzeResumeInput - The input type for the analyzeResume function.
 * - AnalyzeResumeOutput - The return type for the analyzeResume function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeResumeInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The resume as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeResumeInput = z.infer<typeof AnalyzeResumeInputSchema>;

const AnalyzeResumeOutputSchema = z.object({
  isResume: z.boolean().describe('Whether the provided document appears to be a resume.'),
  skills: z.array(z.string()).describe('A list of key skills identified in the resume. Returns an empty array if the document is not a resume.'),
  experienceSummary: z.string().describe("A summary of the candidate's relevant experience. Returns an empty string if the document is not a resume.")
});
export type AnalyzeResumeOutput = z.infer<typeof AnalyzeResumeOutputSchema>;

export async function analyzeResume(input: AnalyzeResumeInput): Promise<AnalyzeResumeOutput> {
  return analyzeResumeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeResumePrompt',
  input: {schema: AnalyzeResumeInputSchema},
  output: {schema: AnalyzeResumeOutputSchema},
  prompt: `You are an expert career advisor specializing in resume analysis.

Your first task is to determine if the provided document is a resume. Look for common resume sections like "Experience", "Education", "Skills", and contact information.
If the document is a resume, set 'isResume' to true. Then, analyze it to extract the key skills and provide a concise summary of the candidate's experience.
If the document does not appear to be a resume, set 'isResume' to false and return an empty array for skills and an empty string for the experience summary.

Document for analysis:
{{media url=resumeDataUri}}

Provide your analysis in the required structured format.`,
});

const analyzeResumeFlow = ai.defineFlow(
  {
    name: 'analyzeResumeFlow',
    inputSchema: AnalyzeResumeInputSchema,
    outputSchema: AnalyzeResumeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
