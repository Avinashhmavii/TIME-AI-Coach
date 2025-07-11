"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { getQuestions, getResumeAnalysis, saveInterviewSummary, type InterviewData, getVideoPreference, getInterviewMode, type InterviewMode } from "@/lib/data-store";
import { interviewAgent, type InterviewAgentOutput } from "@/ai/flows/interview-agent";
import { generateIceBreakerQuestion } from "@/ai/flows/ice-breaker-generator";
import { useToast } from "@/hooks/use-toast";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Loader, Mic, ArrowRight, Volume2, ThumbsUp, Lightbulb, BarChart, Smile, Video, BrainCircuit, Sparkles, MicOff, PhoneOff, VolumeX, VideoOff } from "lucide-react";
import Link from "next/link";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";

type Feedback = Omit<InterviewAgentOutput, 'nextQuestion' | 'isInterviewOver'>;
type ConversationState = 'loading' | 'speaking' | 'listening' | 'thinking' | 'finished' | 'idle';
type ConversationEntry = {
  speaker: 'ai' | 'user';
  text: string;
};

const languageCodeMap: Record<string, string> = {
  "English": "en-US",
  "Spanish": "es-ES",
  "French": "fr-FR",
  "German": "de-DE",
  "Hindi": "hi-IN",
  "Hinglish": "en-IN",
};

const getLanguageCode = (languageName: string) => {
  return languageCodeMap[languageName] || "en-US";
}

// TypeScript: Add types for SpeechRecognition for browser compatibility
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function InterviewSession() {
  const [interviewMode, setInterviewMode] = useState<InterviewMode | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [transcript, setTranscript] = useState("");
  const [interviewData, setInterviewData] = useState<InterviewData[]>([]);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>('loading');
  
  const [conversationLog, setConversationLog] = useState<ConversationEntry[]>([]);
  const [time, setTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  const conversationStateRef = useRef(conversationState);
  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);
  
  const transcriptRef = useRef("");
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);


  // Data for the AI agent
  const [language, setLanguage] = useState("en-US");
  const [languageName, setLanguageName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [company, setCompany] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [candidateName, setCandidateName] = useState("");

  const router = useRouter();
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const shouldBeListening = useRef(false); // Ref to manage intentional listening state

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.parentElement!.scrollTo({ top: scrollAreaRef.current.parentElement!.scrollHeight, behavior: 'smooth' });
    }
  }, [conversationLog]);

  useEffect(() => {
      if (conversationState !== 'loading' && conversationState !== 'finished') {
          const timerId = setInterval(() => {
              setTime(t => t + 1);
          }, 1000);
          return () => clearInterval(timerId);
      }
  }, [conversationState]);

  useEffect(() => {
    // This effect is the single source of truth for starting/stopping speech recognition
    const recognition = recognitionRef.current;
    if (!recognition || interviewMode !== 'voice') return;
    
    const startRecognition = () => {
      try {
        recognition.start();
      } catch (e) {
        // It might already be started if onend fired unexpectedly. This is a safe way to handle it.
        if (e instanceof DOMException && e.name === 'InvalidStateError') {
          console.log('Recognition already started.');
        } else {
          console.error('Could not start recognition:', e);
        }
      }
    };

    if (conversationState === 'listening' && !isMuted) {
      shouldBeListening.current = true;
      startRecognition();
    } else {
      shouldBeListening.current = false;
      recognition.stop();
    }
  }, [conversationState, isMuted, interviewMode]);


  const captureVideoFrame = (): string | undefined => {
      if (!videoRef.current || !canvasRef.current || !videoRef.current.srcObject) {
          console.error("Video or canvas ref not available for frame capture.");
          return undefined;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.error("Video has no dimensions, cannot capture frame.");
          return undefined;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg');
      }
      return undefined;
  }
  
  const endInterview = () => {
    setConversationState('finished');
    saveInterviewSummary(interviewData);
    router.push('/summary');
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  const handleSubmit = async () => {
    const currentAnswer = transcriptRef.current.trim();
    if (!currentAnswer || conversationStateRef.current === 'thinking') {
        return;
    }
    
    setConversationState('thinking');
    
    const videoFrameDataUri = (interviewMode === 'voice' && hasCameraPermission) ? captureVideoFrame() : undefined;

    try {
      setConversationLog(prev => [...prev, { speaker: 'user', text: currentAnswer }]);
      
      const result = await interviewAgent({
        jobRole,
        company,
        resumeText,
        language: languageName,
        conversationHistory: [
          ...interviewData.map(d => ({question: d.question, answer: d.answer})),
          { question: currentQuestion, answer: currentAnswer }
        ],
        currentTranscript: currentAnswer,
        videoFrameDataUri
      });
      
      const newFeedback: Feedback = {
        contentFeedback: result.contentFeedback,
        toneFeedback: result.toneFeedback,
        clarityFeedback: result.clarityFeedback,
        visualFeedback: result.visualFeedback
      };
      
      const newInterviewData = [...interviewData, {
        question: currentQuestion!,
        answer: currentAnswer,
        feedback: newFeedback
      }];
      setInterviewData(newInterviewData);

      setConversationLog(prev => [...prev, { speaker: 'ai', text: result.nextQuestion }]);

      if (result.isInterviewOver) {
        saveInterviewSummary(newInterviewData);
        setCurrentQuestion(result.nextQuestion);
        setConversationState('finished');
        // Give the user a moment to see the final message before redirecting
        setTimeout(() => {
            router.push('/summary');
        }, 4000);
      } else {
        setTranscript("");
        setCurrentQuestion(result.nextQuestion);
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Agent Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
      setConversationState(interviewMode === 'voice' ? 'listening' : 'idle');
    }
  };

  useEffect(() => {
    // This effect runs once to set up the whole session.
    const setupInterview = async () => {
        // 1. Get core data. Abort if missing.
        const mode = getInterviewMode();
        const storedQuestionsData = getQuestions();
        const storedResumeAnalysis = getResumeAnalysis();
        const videoIsEnabled = getVideoPreference();

        if (!mode || !storedQuestionsData || !storedResumeAnalysis) {
            toast({ variant: "destructive", title: "Missing Preparation Data", description: "Please go to the prepare page first." });
            router.push("/prepare");
            return;
        }

        // 2. Set up component state from stored data.
        setInterviewMode(mode);
        const { candidateName, skills, experienceSummary } = storedResumeAnalysis;
        const { language, jobRole, company } = storedQuestionsData;
        const langCode = getLanguageCode(language);
        setCandidateName(candidateName);
        setResumeText(`${skills.join(', ')}\n\n${experienceSummary}`);
        setLanguage(langCode);
        setLanguageName(language);
        setJobRole(jobRole);
        setCompany(company);

        // 3. Set up speech recognition if in voice mode.
        if (mode === 'voice') {
            const SpeechRecognitionClass: any = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognitionClass) {
              recognitionRef.current = new SpeechRecognitionClass();
              const recognition = recognitionRef.current;
              recognition.continuous = true;
              recognition.interimResults = true;
              recognition.lang = langCode;
              
              recognition.onresult = (event: any) => {
                let finalTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if(event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                if (finalTranscript) {
                    setTranscript(prev => prev + finalTranscript);
                }
              };
        
              recognition.onerror = (event: any) => {
                toast({variant: 'destructive', title: 'Speech Recognition Error', description: event.error});
                if (event.error !== 'network' && event.error !== 'no-speech') {
                    setConversationState('idle');
                }
              }
    
              recognition.onend = () => {
                if (shouldBeListening.current) {
                  console.log('Speech recognition service disconnected, attempting to restart.');
                  try { recognition.start(); } catch(e) { console.error("Could not restart recognition", e)}
                }
              };
    
            } else {
                toast({variant: 'destructive', title: 'Browser Not Supported', description: 'Speech recognition is not supported in this browser.'});
            }
        }
        
        // 4. Get the initial question.
        const defaultGreeting = `Hello ${candidateName}, I am Tina, welcome to the TIME AI Powered Coach interview prep. To make this session as helpful as possible, what area would you like to focus on? We can practice subject-specific questions, aptitude-based questions, personality/HR-type questions, or simulate a full mock interview for your selected exam.`;

        if (mode !== 'voice' || !videoIsEnabled) {
            setHasCameraPermission(false);
            setCurrentQuestion(defaultGreeting);
            return;
        }

        // We are in voice mode with video enabled. Try to get permissions.
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setHasCameraPermission(true);

            // Now that we have permission and the stream, get the icebreaker.
            await new Promise(resolve => {
                if (videoRef.current) videoRef.current.onloadedmetadata = () => resolve(true);
            });
            await new Promise(resolve => setTimeout(resolve, 1500));

            const videoFrameDataUri = captureVideoFrame();
            if (!videoFrameDataUri) {
                throw new Error("Could not capture video frame.");
            }

            const result = await generateIceBreakerQuestion({
                candidateName,
                videoFrameDataUri,
                language,
            });
            setCurrentQuestion(result.question);

        } catch (error) {
            console.error('Error getting camera or icebreaker:', error);
            setHasCameraPermission(false);
            toast({
                variant: 'destructive',
                title: 'Camera Error',
                description: 'Could not access camera. Video analysis is disabled.',
            });
            setCurrentQuestion(defaultGreeting);
        }
    };

    setupInterview();

    return () => {
      shouldBeListening.current = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const speak = async (text: string) => {
    if (!text) return;

    setConversationLog((prev: ConversationEntry[]) => {
        if(prev[prev.length - 1]?.speaker === 'ai' && prev[prev.length - 1]?.text === text) return prev;
        return [...prev, { speaker: 'ai', text }];
    });

    const isVoiceMode = getInterviewMode() === 'voice';
    if (!isVoiceMode || isSpeakerMuted) {
        const nextState = conversationStateRef.current === 'finished' ? 'finished' : (isVoiceMode ? 'listening' : 'idle');
        setConversationState(nextState);
        return;
    }

    setConversationState('speaking');
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });
      if (!response.ok) throw new Error('TTS request failed');
      const { audioUrl } = await response.json();
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        if (conversationStateRef.current !== 'finished') {
          setConversationState('listening');
        }
      };
      audio.onerror = () => {
        if (conversationStateRef.current !== 'finished') {
          setConversationState(interviewMode === 'voice' ? 'listening' : 'idle');
        }
      };
      audio.play();
    } catch (error) {
      setConversationState(interviewMode === 'voice' ? 'listening' : 'idle');
    }
  }

  useEffect(() => {
    if (currentQuestion && (conversationState === 'loading' || conversationState === 'thinking' || conversationState === 'finished')) {
      speak(currentQuestion);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);


  const handleManualSubmit = () => {
    handleSubmit();
  }

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-3 h-screen p-4 md:p-8 gap-8">
       {conversationState === 'loading' && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex justify-center items-center z-[100]">
          <div className="flex items-center text-lg font-semibold text-primary">
            <Loader className="animate-spin mr-3 h-6 w-6" /> 
            Preparing your interview...
          </div>
        </div>
      )}

      {/* Left Panel */}
      <div className="md:col-span-1 bg-white/70 rounded-2xl shadow-lg p-6 flex flex-col text-center">
        <div className="flex-1 flex flex-col justify-center">
            {interviewMode === 'voice' && getVideoPreference() ? (
            <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden shadow-inner flex items-center justify-center relative">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {hasCameraPermission === null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80">
                    <Loader className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    <p className="text-sm font-semibold">Starting camera...</p>
                </div>
                )}
                {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80">
                    <VideoOff className="w-12 h-12 mx-auto mb-2" />
                    <p className="font-semibold">Camera is off or denied</p>
                    <p className="text-sm">Video analysis is disabled.</p>
                </div>
                )}
            </div>
            ) : (
            <Avatar className="w-24 h-24 mx-auto border-4 border-gray-100">
                <AvatarImage src={`https://logo.clearbit.com/${company.toLowerCase().replace(/\s/g, '')}.com`} alt={company} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="w-10 h-10" />
                </AvatarFallback>
            </Avatar>
            )}
            <h1 className="text-2xl font-bold font-headline mt-4">{jobRole}</h1>
            <div className="flex items-center justify-center gap-2 mt-1 text-muted-foreground">
                <Avatar className="w-5 h-5">
                    <AvatarImage src={`https://logo.clearbit.com/${company.toLowerCase().replace(/\s/g, '')}.com`} alt={company} />
                    <AvatarFallback>{company.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span>{company}</span>
            </div>
        </div>

        <div className="space-y-4 my-6">
            <div className="w-full h-12 flex items-center justify-center">
                {conversationState === 'listening' ? (
                     <div className="w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
                ) : (
                    <div className="w-full h-px bg-white/40"></div>
                )}
            </div>
          <p className="text-lg font-mono text-muted-foreground">{formatTime(time)}</p>
        </div>

        <div className="flex justify-center items-center gap-4">
            {interviewMode === 'voice' ? (
                <>
                <Button size="icon" variant="ghost" className="rounded-full w-16 h-16 bg-gray-100 hover:bg-gray-200" onClick={() => setIsMuted(prev => !prev)}>
                    {isMuted ? <MicOff className="w-6 h-6"/> : <Mic className="w-6 h-6"/>}
                    <span className="sr-only">Mute</span>
                </Button>
                <Button size="lg" variant="destructive" className="rounded-full h-16 px-8" onClick={endInterview} disabled={conversationState === 'finished'}>
                    <PhoneOff className="w-6 h-6 mr-2"/> End Call
                </Button>
                <Button size="icon" variant="ghost" className="rounded-full w-16 h-16 bg-gray-100 hover:bg-gray-200" onClick={() => setIsSpeakerMuted(prev => !prev)}>
                    {isSpeakerMuted ? <VolumeX className="w-6 h-6"/> : <Volume2 className="w-6 h-6"/>}
                    <span className="sr-only">Speaker</span>
                </Button>
                </>
            ) : (
                <Button size="lg" className="w-full" onClick={endInterview} disabled={conversationState === 'finished'}>
                    End Interview
                </Button>
            )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="md:col-span-2 bg-white/70 rounded-2xl shadow-lg p-6 flex flex-col overflow-hidden">
        <h2 className="text-2xl font-headline mb-4 border-b pb-2 flex-shrink-0">Interview Transcript</h2>
        <ScrollArea className="flex-grow pr-4 -mr-4">
            <div className="space-y-6" ref={scrollAreaRef}>
                {conversationLog.map((entry, index) => (
                    <div key={index} className={cn("flex items-start gap-3", entry.speaker === 'user' ? 'justify-end' : '')}>
                        {entry.speaker === 'ai' && (
                             <Avatar className="w-8 h-8 border">
                                 <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">AI</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn(
                            "rounded-lg px-4 py-3 max-w-[80%] text-sm md:text-base",
                             entry.speaker === 'ai' ? 'bg-white/60 text-gray-800 rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'
                        )}>
                            {entry.text}
                        </div>
                         {entry.speaker === 'user' && (
                             <Avatar className="w-8 h-8 border">
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                 {conversationState === 'thinking' && (
                    <div className="flex items-start gap-3">
                        <Avatar className="w-8 h-8 border">
                             <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">AI</AvatarFallback>
                        </Avatar>
                         <div className="rounded-lg px-4 py-3 bg-white/60">
                            <Loader className="w-5 h-5 animate-spin text-primary"/>
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
        {(interviewMode === 'text' || interviewMode === 'voice') && conversationState !== 'finished' && (
            <div className="mt-4 flex items-center gap-2 flex-shrink-0">
                <Textarea 
                    placeholder={interviewMode === 'voice' 
                        ? (isMuted ? "Mic is muted. You can type your answer." : "Listening...") 
                        : "Type your answer..."}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && interviewMode === 'text') {
                            e.preventDefault();
                            handleManualSubmit();
                        }
                    }}
                    className="flex-grow"
                    disabled={conversationState === 'thinking'}
                />
                 <Button onClick={handleManualSubmit} disabled={!transcript.trim() || conversationState === 'thinking'}>
                    {conversationState === 'thinking' ? <Loader className="w-4 h-4 animate-spin"/> : <ArrowRight className="w-4 h-4"/>}
                    <span className="sr-only">Submit</span>
                </Button>
            </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
