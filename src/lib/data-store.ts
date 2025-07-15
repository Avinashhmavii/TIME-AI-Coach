'use client';

import type { InterviewAgentOutput } from '@/ai/flows/interview-agent';
import type { AnalyzeResumeOutput } from '@/ai/flows/resume-analyzer';
import type { GenerateRoleSpecificQuestionsOutput } from '@/ai/flows/interview-question-generator';

const RESUME_ANALYSIS_KEY = 'timeAIPoweredCoach_resumeAnalysis';
const QUESTIONS_KEY = 'timeAIPoweredCoach_questions';
const INTERVIEW_SUMMARY_KEY = 'timeAIPoweredCoach_interviewSummary';
const VIDEO_PREFERENCE_KEY = 'timeAIPoweredCoach_videoPreference';
const INTERVIEW_MODE_KEY = 'timeAIPoweredCoach_interviewMode';

export type InterviewMode = 'voice' | 'text';

export type InterviewData = {
  question: string;
  answer: string;
  feedback: {
    contentFeedback: string;
    toneFeedback: string;
    clarityFeedback: string;
    visualFeedback: string;
    scoring?: {
      ideas: { score: number; justification: string };
      organization: { score: number; justification: string };
      accuracy: { score: number; justification: string };
      voice: { score: number; justification: string };
      grammar: { score: number; justification: string };
      stopwords: { score: number; justification: string };
    };
  };
};

export type QuestionsData = GenerateRoleSpecificQuestionsOutput & {
  language: string;
  jobRole: string;
  company: string;
};

// Interview Mode
export const saveInterviewMode = (mode: InterviewMode) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(INTERVIEW_MODE_KEY, mode);
    }
};

export const getInterviewMode = (): InterviewMode | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(INTERVIEW_MODE_KEY);
    return data as InterviewMode | null;
};

// Video Preference
export const saveVideoPreference = (enabled: boolean) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(VIDEO_PREFERENCE_KEY, JSON.stringify(enabled));
    }
};

export const getVideoPreference = (): boolean => {
    if (typeof window === 'undefined') return false;
    const data = localStorage.getItem(VIDEO_PREFERENCE_KEY);
    // Defaults to false if not set
    return data ? JSON.parse(data) : false;
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
        localStorage.removeItem(VIDEO_PREFERENCE_KEY);
        localStorage.removeItem(INTERVIEW_MODE_KEY);
        // We keep the summary so user can review it later
    }
}
