'use server';

/**
 * @fileOverview Generates interview questions based on a job role, company, and resume.
 *
 * - generateRoleSpecificQuestions - A function that generates interview questions.
 * - GenerateRoleSpecificQuestionsInput - The input type for the generateRoleSpecificQuestions function.
 * - GenerateRoleSpecificQuestionsOutput - The return type for the generateRoleSpecificQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import questions from '../interview_questions.json';

const GenerateRoleSpecificQuestionsInputSchema = z.object({
  resumeText: z.string().describe("The text content of the user's resume."),
  jobRole: z.string().describe('The job role for which the interview questions are being generated.'),
  company: z.string().describe('The company for which the interview questions are being generated.'),
  language: z.string().describe('The language for the interview questions.'),
});
export type GenerateRoleSpecificQuestionsInput = z.infer<typeof GenerateRoleSpecificQuestionsInputSchema>;

const GenerateRoleSpecificQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('An array of interview questions tailored to the job role, company, and resume.'),
});
export type GenerateRoleSpecificQuestionsOutput = z.infer<typeof GenerateRoleSpecificQuestionsOutputSchema>;

export async function generateRoleSpecificQuestions(input: GenerateRoleSpecificQuestionsInput): Promise<GenerateRoleSpecificQuestionsOutput> {
  return generateRoleSpecificQuestionsFlow(input);
}

const EXAMPLE_QUESTIONS_SAMPLE = questions.slice(0, 10); // Take a small sample for prompt context

const prompt = ai.definePrompt({
  name: 'generateRoleSpecificQuestionsPrompt',
  input: {schema: GenerateRoleSpecificQuestionsInputSchema},
  output: {schema: GenerateRoleSpecificQuestionsOutputSchema},
  prompt: `You are an expert interview question generator.

You will generate a set of interview questions tailored to the job role, company, and resume provided.
The questions should be in the following language: {{{language}}}.

Job Role: {{{jobRole}}}
Company: {{{company}}}
Resume:
{{{resumeText}}}

Here are some example interview questions for reference (do not copy, just use for style and type):
${EXAMPLE_QUESTIONS_SAMPLE.map(q => `- [${q.category}/${q.subcategory}/${q.subsection}] ${q.question}`).join('\n')}

Generate a list of relevant interview questions in {{{language}}}:
`,
});

const generateRoleSpecificQuestionsFlow = ai.defineFlow(
  {
    name: 'generateRoleSpecificQuestionsFlow',
    inputSchema: GenerateRoleSpecificQuestionsInputSchema,
    outputSchema: GenerateRoleSpecificQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
