'use client';

import type { GetRealTimeFeedbackOutput } from '@/ai/flows/real-time-feedback';
import type { AnalyzeResumeOutput } from '@/ai/flows/resume-analyzer';
import type { GenerateRoleSpecificQuestionsOutput } from '@/ai/flows/interview-question-generator';

const RESUME_ANALYSIS_KEY = 'careerSpark_resumeAnalysis';
const QUESTIONS_KEY = 'careerSpark_questions';
const INTERVIEW_SUMMARY_KEY = 'careerSpark_interviewSummary';

export type InterviewData = {
  question: string;
  answer: string;
  feedback: GetRealTimeFeedbackOutput;
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
export const saveQuestions = (data: GenerateRoleSpecificQuestionsOutput) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(data));
    }
};

export const getQuestions = (): GenerateRoleSpecificQuestionsOutput | null => {
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
