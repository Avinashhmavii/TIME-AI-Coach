'use client';

import type { InterviewAgentOutput } from '@/ai/flows/interview-agent';
import type { AnalyzeResumeOutput } from '@/ai/flows/resume-analyzer';
import type { GenerateRoleSpecificQuestionsOutput } from '@/ai/flows/interview-question-generator';

const RESUME_ANALYSIS_KEY = 'careerSpark_resumeAnalysis';
const QUESTIONS_KEY = 'careerSpark_questions';
const INTERVIEW_SUMMARY_KEY = 'careerSpark_interviewSummary';

export type InterviewData = {
  question: string;
  answer: string;
  feedback: Omit<InterviewAgentOutput, 'nextQuestion' | 'isInterviewOver'>;
};

export type QuestionsData = GenerateRoleSpecificQuestionsOutput & {
  language: string;
  jobRole: string;
  company: string;
};

// Resume Analysis
export const saveResumeAnalysis = (data: AnalyzeResumeOutput) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(RESUME_ANALYSIS_KEY, JSON.stringify(data));
  }
};

export const getResumeAnalysis = (): AnalyzeResumeOutput | null => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(RESUME_ANALYSIS_KEY);
  return data ? JSON.parse(data) : null;
};

// Questions
export const saveQuestions = (data: GenerateRoleSpecificQuestionsOutput, language: string, jobRole: string, company: string) => {
    if (typeof window !== 'undefined') {
      const questionsData: QuestionsData = { ...data, language, jobRole, company };
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questionsData));
    }
};

export const getQuestions = (): QuestionsData | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(QUESTIONS_KEY);
    return data ? JSON.parse(data) : null;
};

// Interview Summary
export const saveInterviewSummary = (data: InterviewData[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(INTERVIEW_SUMMARY_KEY, JSON.stringify(data));
    }
};

export const getInterviewSummary = (): InterviewData[] | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(INTERVIEW_SUMMARY_KEY);
    return data ? JSON.parse(data) : null;
};

export const clearData = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(RESUME_ANALYSIS_KEY);
        localStorage.removeItem(QUESTIONS_KEY);
        // We keep the summary so user can review it later
    }
}
