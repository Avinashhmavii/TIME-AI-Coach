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
  videoFrameDataUri: z.string().optional().describe(
    "A single video frame captured when the user finishes their answer, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Use this to analyze visual presentation."
  ),
});
export type InterviewAgentInput = z.infer<typeof InterviewAgentInputSchema>;

const InterviewAgentOutputSchema = z.object({
  contentFeedback: z.string().describe('Feedback on the content of the response.'),
  toneFeedback: z.string().describe('Feedback on the tone of the response.'),
  clarityFeedback: z.string().describe('Feedback on the clarity of the response.'),
  visualFeedback: z.string().describe('Feedback on the visual presentation, like body language and confidence, based on the video frame.'),
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
  prompt: `You are CareerSpark, a friendly and professional AI interview coach. Your tone should be encouraging and supportive. Conduct a mock interview that feels like a natural, flowing conversation, not a rigid Q&A session.

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

{{#if videoFrameDataUri}}
Here is a video frame of the candidate as they answered:
{{media url=videoFrameDataUri}}
{{/if}}

Your tasks are:
1.  **Analyze and Give Feedback:**
    -   Provide concise, constructive feedback on the **content**, **tone**, and **clarity** of the candidate's latest answer.
    {{#if videoFrameDataUri}}
    -   Based on the video frame, also provide feedback on their **visual presentation** (e.g., body language, eye contact, confidence).
    {{else}}
    -   For visual feedback, state that no video was provided.
    {{/if}}
2.  **Ask a Follow-up Question:**
    -   Based on their answer, their resume, and the entire conversation so far, generate a single, relevant follow-up question.
    -   Make the conversation feel fluid. If their answer was short, probe for more detail. If they mentioned a specific project, ask a question about it.
    -   Use conversational transitions, like "That's helpful, thank you. It leads me to my next question..." or "I appreciate you sharing that. On that topic, can you tell me about a time when...".
    -   Do not repeat questions.
3.  **Conclude Naturally:**
    -   After 4-5 meaningful exchanges, if you have a good sense of the candidate's skills, it's time to conclude.
    -   Set \`isInterviewOver\` to true.
    -   For \`nextQuestion\`, provide a friendly closing remark like, "That was very insightful. Thanks for walking me through your experience. That's all the questions I have for now."

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
