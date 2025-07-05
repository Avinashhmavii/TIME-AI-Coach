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
  contentFeedback: z.string().describe('Feedback on the content of the response, including how it aligns with the resume.'),
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
1.  **Check for End Command:** First, analyze the candidate's latest answer. If it contains a clear request to stop, like "end the interview", "stop this interview", or "I am done", you must conclude the session. Set \`isInterviewOver\` to true, provide a polite closing remark in \`nextQuestion\`, and do not provide feedback for this final response.
2.  **Analyze and Give Feedback (if not ending):**
    -   **Content Feedback:** Critically evaluate the substance of the answer. **Crucially, compare the candidate's claims against their resume.**
        - If their answer aligns well with their resume, acknowledge that.
        - If they provide information that seems inconsistent with their resume (e.g., claiming 10 years of experience when the resume shows 5), use the feedback to note the discrepancy and use your follow-up question to probe gently.
        - Your feedback should be concise and constructive.
    -   **Tone Feedback:** Comment on the tone of the response (e.g., confident, hesitant, professional).
    -   **Clarity Feedback:** Comment on how clear and easy to understand the response was.
    {{#if videoFrameDataUri}}
    -   **Visual Presentation Feedback:** Based on the video frame, also provide feedback on their visual presentation (e.g., body language, eye contact, confidence).
    {{else}}
    -   For visual feedback, state that no video was provided.
    {{/if}}
3.  **Ask a Follow-up Question (if not ending):**
    -   Your next question must be a logical continuation of the conversation. It should be directly influenced by their last answer and your analysis of it.
    -   **If you identified an inconsistency** with the resume, your follow-up question should be a polite probe for more information. For example: "Thanks for sharing that. My understanding from your resume was slightly different, could you help me connect the dots on that experience?"
    -   If their answer was strong, ask a question that delves deeper into a project or skill they mentioned.
    -   Use conversational transitions, like "That's helpful, thank you. It leads me to my next question..." or "I appreciate you sharing that. On that topic, can you tell me about a time when...".
    -   Do not repeat questions.
4.  **Conclude Naturally:**
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
