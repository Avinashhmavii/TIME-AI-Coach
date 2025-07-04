'use server';

/**
 * @fileOverview A conversational interview agent that provides feedback and generates follow-up questions.
 *
 * - interviewAgent - A function that drives the mock interview conversation.
 * - InterviewAgentInput - The input type for the interviewAgent function.
 * - InterviewAgentOutput - The return type for the interviewAgent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterviewHistorySchema = z.object({
    question: z.string(),
    answer: z.string(),
});

const InterviewAgentInputSchema = z.object({
  jobRole: z.string().describe('The job role the user is interviewing for.'),
  company: z.string().describe('The company the user is interviewing for.'),
  resumeText: z.string().describe("The user's resume text."),
  language: z.string().describe('The language for the interview and feedback.'),
  conversationHistory: z.array(InterviewHistorySchema).describe('The history of questions and answers so far.'),
  currentTranscript: z.string().describe("The user's latest answer to the most recent question."),
});
export type InterviewAgentInput = z.infer<typeof InterviewAgentInputSchema>;

const InterviewAgentOutputSchema = z.object({
  contentFeedback: z.string().describe('Feedback on the content of the response.'),
  toneFeedback: z.string().describe('Feedback on the tone of the response.'),
  clarityFeedback: z.string().describe('Feedback on the clarity of the response.'),
  nextQuestion: z.string().describe('The next interview question to ask. If the interview is over, this should be a concluding remark.'),
  isInterviewOver: z.boolean().describe('Set to true if this is the final remark and the interview should conclude.'),
});
export type InterviewAgentOutput = z.infer<typeof InterviewAgentOutputSchema>;

export async function interviewAgent(input: InterviewAgentInput): Promise<InterviewAgentOutput> {
  return interviewAgentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interviewAgentPrompt',
  input: {schema: InterviewAgentInputSchema},
  output: {schema: InterviewAgentOutputSchema},
  prompt: `You are an AI-powered interview coach conducting a natural, conversational mock interview. Your goal is to help the user practice.

The user is interviewing for the role of {{{jobRole}}} at {{{company}}}.
Their resume is as follows:
---
{{{resumeText}}}
---

The interview is in {{{language}}}. All your feedback and questions must be in {{{language}}}.

Here is the conversation history so far:
{{#each conversationHistory}}
Interviewer: {{{this.question}}}
Candidate: {{{this.answer}}}
{{/each}}

Here is the candidate's latest answer:
Candidate: {{{currentTranscript}}}

Your tasks are:
1.  **Analyze the candidate's latest answer.** Provide concise, constructive feedback on its content, tone, and clarity.
2.  **Generate the next question.** Based on the job, the resume, and the entire conversation, ask a relevant follow-up question. The conversation should feel fluid and logical. Do not repeat questions.
3.  **Decide when to end.** After 4-5 thoughtful questions, if you have a good sense of the candidate's skills, you can conclude the interview. Set 'isInterviewOver' to true and provide a friendly closing remark in 'nextQuestion' (e.g., "Thanks, that's all the questions I have for now. You did a great job.").

Provide your response in the required structured format.
`,
});

const interviewAgentFlow = ai.defineFlow(
  {
    name: 'interviewAgentFlow',
    inputSchema: InterviewAgentInputSchema,
    outputSchema: InterviewAgentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
