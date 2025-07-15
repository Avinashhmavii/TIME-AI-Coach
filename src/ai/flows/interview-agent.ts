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
import { callGeminiWithFailover } from '@/ai/gemini-failover';

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
  // Add scoring section
  scoring: z.object({
    ideas: z.object({ score: z.number(), justification: z.string() }),
    organization: z.object({ score: z.number(), justification: z.string() }),
    accuracy: z.object({ score: z.number(), justification: z.string() }),
    voice: z.object({ score: z.number(), justification: z.string() }),
    grammar: z.object({ score: z.number(), justification: z.string() }),
    stopwords: z.object({ score: z.number(), justification: z.string() })
  }).describe('Scoring for the answer in six categories, each with a score (1-10) and a one-line justification.'),
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
  prompt: `You are TIME AI Powered Coach, a friendly and professional AI interview coach. Your tone should be encouraging and supportive. Conduct a mock interview that feels like a natural, flowing conversation, not a rigid Q&A session.

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
1.  **Check for End Command:** First, analyze the candidate's latest answer. If it contains a clear request to stop, like "end the interview", "stop this interview", or "I am done", you must conclude the session. Set 'isInterviewOver' to true, provide a polite closing remark in 'nextQuestion', and do not provide feedback for this final response.

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

    -   **Scoring:**
        Evaluate the candidate's answer to the question below based on these exact six categories. Use a GENEROUS and REALISTIC scoring scale where:
        - 8-10/10: Excellent to outstanding performance
        - 6-7/10: Good to very good performance  
        - 4-5/10: Average to satisfactory performance
        - 1-3/10: Below average to poor performance

        1. Ideas: The answer should focus on one clear idea, maintained throughout without tangents. Score generously if the candidate demonstrates clear thinking and relevant ideas.
        2. Organization: Ideas should flow logically and cohesively. Score generously if the answer has a logical structure, even if not perfect.
        3. Accuracy: The answer should fully address all parts of the question. Score generously if the candidate addresses the main points of the question.
        4. Voice: The answer should be unique and not generic. Score generously if the candidate shows personality or specific examples.
        5. Grammar Usage and Sentence Fluency: The answer should use correct grammar and sentence structure. Score generously - minor grammar issues should not heavily penalize good content.
        6. Stop words: Minimize filler words (e.g., uhh, ahh, ummm). Score generously - only heavily penalize excessive filler words.

        IMPORTANT: Be GENEROUS in your scoring. A well-structured, relevant answer should score 7-9/10. Only give very low scores (1-3/10) for truly poor or irrelevant answers.

        Provide a score (1-10, 1 lowest, 10 highest) for each category with a one-line justification.
        Respond in this format:
        scoring: {
          ideas: { score: X, justification: "..." },
          organization: { score: X, justification: "..." },
          accuracy: { score: X, justification: "..." },
          voice: { score: X, justification: "..." },
          grammar: { score: X, justification: "..." },
          stopwords: { score: X, justification: "..." }
        }

3.  **Ask a Follow-up Question (if not ending):**
    -   **If 'conversationHistory' is empty:** This is the first interaction after the ice-breaker. For the 'nextQuestion', ask the user to choose an area of focus. Example: "Thanks for sharing that. To make this session as helpful as possible, what area would you like to focus on? We can practice subject-specific questions, aptitude-based questions, personality/HR-type questions, or simulate a full mock interview for your selected exam: {{{jobRole}}}." Do not ask a real interview question yet.
    -   **If 'conversationHistory' is NOT empty:**
        -   First, check if the candidate's last answer was a choice of category (e.g., "Let's do behavioral questions"). If so, acknowledge it and ask the first relevant question from that category, tailored to their resume and the {{{jobRole}}}.
        -   Otherwise, ask a relevant follow-up question based on their last answer.
        -   If a follow-up isn't obvious, generate a NEW, standard interview question relevant to the {{{jobRole}}}, the user's resume, and their previously stated category preference.
        -   Use conversational transitions. Do not repeat questions.

4.  **Conclude Naturally:**
    -   After 4-5 meaningful exchanges, if you have a good sense of the candidate's skills, it's time to conclude.
    -   Set 'isInterviewOver' to true.
    -   For 'nextQuestion', provide a friendly closing remark like, "That was very insightful. Thanks for walking me through your experience. That's all the questions I have for now."

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
    return await callGeminiWithFailover('googleai/gemini-2.0-flash', input);
  }
);
