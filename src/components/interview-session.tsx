
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { getQuestions, getResumeAnalysis, saveInterviewSummary, type InterviewData, getVideoPreference, getInterviewMode, type InterviewMode } from "@/lib/data-store";
import { interviewAgent, type InterviewAgentOutput } from "@/ai/flows/interview-agent";
import { generateIceBreakerQuestion } from "@/ai/flows/ice-breaker-generator";
import { useToast } from "@/hooks/use-toast";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Loader, Mic, ArrowRight, Volume2, ThumbsUp, Lightbulb, BarChart, Smile, Video, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";

type Feedback = Omit<InterviewAgentOutput, 'nextQuestion' | 'isInterviewOver'>;
type ConversationState = 'loading' | 'speaking' | 'listening' | 'thinking' | 'finished' | 'idle';

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

export function InterviewSession() {
  const [interviewMode, setInterviewMode] = useState<InterviewMode | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [interviewData, setInterviewData] = useState<InterviewData[]>([]);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>('loading');
  
  const conversationStateRef = useRef(conversationState);
  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  // Data for the AI agent
  const [language, setLanguage] = useState("en-US");
  const [languageName, setLanguageName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [company, setCompany] = useState("");
  const [resumeText, setResumeText] = useState("");

  const router = useRouter();
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialQuestionGenerated = useRef(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const captureVideoFrame = (): string | undefined => {
      if (!hasCameraPermission || !videoRef.current || !canvasRef.current) {
          return undefined;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg');
      }
      return undefined;
  }

  const handleSubmit = async () => {
    if (!transcript.trim() || conversationStateRef.current === 'thinking') {
        return;
    }

    if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
    
    // Change state to 'thinking' BEFORE stopping recognition.
    // This prevents the 'onend' handler from incorrectly restarting it.
    setConversationState('thinking');
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }

    const videoFrameDataUri = (interviewMode === 'voice' && hasCameraPermission) ? captureVideoFrame() : undefined;

    try {
      const currentAnswer = transcript.trim();
      
      const result = await interviewAgent({
        jobRole,
        company,
        resumeText,
        language: languageName,
        conversationHistory: interviewData.map(d => ({question: d.question, answer: d.answer})),
        currentTranscript: currentAnswer,
        videoFrameDataUri
      });
      
      const newFeedback: Feedback = {
        contentFeedback: result.contentFeedback,
        toneFeedback: result.toneFeedback,
        clarityFeedback: result.clarityFeedback,
        visualFeedback: result.visualFeedback
      };
      
      setFeedback(newFeedback);
      
      const newInterviewData = [...interviewData, {
        question: currentQuestion!,
        answer: currentAnswer,
        feedback: newFeedback
      }];
      setInterviewData(newInterviewData);

      if (result.isInterviewOver) {
        setConversationState('finished');
        saveInterviewSummary(newInterviewData);
        setCurrentQuestion(result.nextQuestion);
        if (interviewMode === 'voice' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(result.nextQuestion);
            utterance.lang = language;
            window.speechSynthesis.speak(utterance);
        }
      } else {
        setTranscript("");
        setCurrentQuestion(result.nextQuestion); // This will trigger the useEffect to speak
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

  const startSubmissionTimer = () => {
      if (interviewMode !== 'voice') return;
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = setTimeout(() => {
          handleSubmit();
      }, 2000); // 2 seconds of silence
  }

  useEffect(() => {
    const mode = getInterviewMode();
    if (!mode) {
        toast({ variant: "destructive", title: "Missing Interview Mode", description: "Please go to the prepare page and select an interview type." });
        router.push("/prepare");
        return;
    }
    setInterviewMode(mode);

    if (mode === 'voice') {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          
          recognitionRef.current.onresult = (event) => {
            let finalTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if(event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                }
            }
            setTranscript(prev => prev + finalTranscript);
            startSubmissionTimer();
          };
    
          recognitionRef.current.onerror = (event) => {
            toast({variant: 'destructive', title: 'Speech Recognition Error', description: event.error});
            setConversationState('idle');
          }

          recognitionRef.current.onend = () => {
            // If recognition stops and we're supposed to be listening, restart it.
            // This handles cases where the browser might automatically stop recognition after a long pause.
            if (conversationStateRef.current === 'listening') {
              console.log('Speech recognition service disconnected, attempting to restart.');
              recognitionRef.current?.start();
            }
          };

        } else {
            toast({variant: 'destructive', title: 'Browser Not Supported', description: 'Speech recognition is not supported in this browser.'});
        }
    }

    const setupInterview = async (interviewMode: InterviewMode) => {
        const storedQuestionsData = getQuestions();
        const storedResumeAnalysis = getResumeAnalysis();
        if (!storedQuestionsData || !storedResumeAnalysis) {
            toast({ variant: "destructive", title: "Missing Preparation Data", description: "Please go to the prepare page first." });
            router.push("/prepare");
            return;
        }

        const langName = storedQuestionsData.language;
        const langCode = getLanguageCode(langName);
        setLanguage(langCode);
        if(recognitionRef.current) recognitionRef.current.lang = langCode;
        setLanguageName(langName);
        setJobRole(storedQuestionsData.jobRole);
        setCompany(storedQuestionsData.company);
        setResumeText(`${storedResumeAnalysis.skills.join(', ')}\n\n${storedResumeAnalysis.experienceSummary}`);
        
        if (interviewMode === 'text') {
            setHasCameraPermission(false);
            setCurrentQuestion("Tell me about yourself.");
            setConversationState('idle');
            return;
        }

        const videoIsEnabled = getVideoPreference();
        if (!videoIsEnabled) {
            setHasCameraPermission(false);
            setCurrentQuestion("Tell me about yourself.");
            // No return here, we still want to speak the first question
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.oncanplay = async () => {
                        if (initialQuestionGenerated.current) return;
                        initialQuestionGenerated.current = true;
                        
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        const videoFrameDataUri = captureVideoFrame();
                        if (videoFrameDataUri) {
                            try {
                                const result = await generateIceBreakerQuestion({ videoFrameDataUri, language: langName });
                                setCurrentQuestion(result.question);
                            } catch (aiError) {
                                console.error("Ice breaker generation failed:", aiError);
                                setCurrentQuestion("Tell me about yourself.");
                            }
                        } else {
                            setCurrentQuestion("Tell me about yourself.");
                        }
                    };
                } else {
                    setCurrentQuestion("Tell me about yourself.");
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Video analysis will be disabled. The interview will start with a generic question.',
                });
                setCurrentQuestion("Tell me about yourself.");
            }
        }

        if (!currentQuestion && !initialQuestionGenerated.current) {
            setCurrentQuestion("Tell me about yourself.");
        }
    }

    setupInterview(mode);

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const speak = (text: string) => {
    if (interviewMode !== 'voice' || !text) return;
    if ('speechSynthesis' in window) {
      setConversationState('speaking');
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.onend = () => {
        if (conversationStateRef.current !== 'finished') {
            setConversationState('listening');
            if (recognitionRef.current) {
                setFeedback(null);
                setTranscript("");
                recognitionRef.current.start();
            }
        }
      }
      window.speechSynthesis.speak(utterance);
    }
  }

  useEffect(() => {
    if (currentQuestion && (conversationState === 'loading' || conversationState === 'thinking')) {
      if (interviewMode === 'voice') {
        speak(currentQuestion);
      } else {
        setConversationState('idle');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);


  if (conversationState === 'loading' && !currentQuestion) {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin mr-2" /> Preparing your interview...</div>;
  }
  
  if(conversationState === 'finished') {
    return (
      <Card className="max-w-2xl mx-auto text-center">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Interview Complete!</CardTitle>
          <CardDescription>{currentQuestion}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6">You've successfully completed the mock interview. Well done! You can now view your detailed performance summary.</p>
          <Button asChild size="lg">
            <Link href="/summary">
              <span className="inline-flex items-center gap-2">View Summary <ArrowRight /></span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const renderInputs = () => {
    if (interviewMode === 'voice') {
        return (
            <Textarea
                placeholder="Your spoken answer will appear here. You can edit it if needed."
                value={transcript}
                onChange={(e) => {
                    setTranscript(e.target.value);
                    startSubmissionTimer();
                }}
                className="min-h-[150px] text-base"
                disabled={conversationState !== 'listening'}
            />
        )
    }
    if (interviewMode === 'text') {
        return (
            <div className="space-y-4">
                <Textarea
                    placeholder="Type your answer here."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="min-h-[150px] text-base"
                    disabled={conversationState === 'thinking'}
                />
                <Button onClick={handleSubmit} disabled={conversationState === 'thinking' || !transcript.trim()} className="w-full">
                    {conversationState === 'thinking' ? <span className="flex items-center justify-center"><Loader className="animate-spin mr-2" />Thinking...</span> : "Submit Answer"}
                </Button>
            </div>
        )
    }
    return null;
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
            {interviewMode === 'voice' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><Video /> Video Feed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-muted rounded-md overflow-hidden relative">
                            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                            <canvas ref={canvasRef} className="hidden" />
                            {hasCameraPermission === false && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <Alert variant="destructive" className="w-4/5">
                                        <AlertTitle>Video Disabled</AlertTitle>
                                        <AlertDescription>
                                            Camera is disabled or access was denied.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                            {hasCameraPermission === null && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader className="animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {feedback && (
                <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Your Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-secondary p-2 rounded-full"><ThumbsUp className="text-primary"/></div>
                        <div>
                            <h4 className="font-semibold">Content</h4>
                            <p className="text-muted-foreground">{feedback.contentFeedback}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="bg-secondary p-2 rounded-full"><Lightbulb className="text-primary"/></div>
                        <div>
                            <h4 className="font-semibold">Clarity</h4>
                            <p className="text-muted-foreground">{feedback.clarityFeedback}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="bg-secondary p-2 rounded-full"><BarChart className="text-primary"/></div>
                        <div>
                            <h4 className="font-semibold">Tone</h4>
                            <p className="text-muted-foreground">{feedback.toneFeedback}</p>
                        </div>
                    </div>
                    {feedback.visualFeedback && (
                        <div className="flex items-start gap-4">
                            <div className="bg-secondary p-2 rounded-full"><Smile className="text-primary"/></div>
                            <div>
                                <h4 className="font-semibold">Visuals</h4>
                                <p className="text-muted-foreground">{feedback.visualFeedback}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
                </Card>
            )}
        </div>

        <div className="space-y-4 sticky top-8">
            <p className="text-center text-muted-foreground">Language: {languageName}</p>
             <Card className={cn(
                "transition-all duration-300",
                conversationState === 'listening' && 'border-primary ring-2 ring-primary/50',
                conversationState === 'thinking' && 'border-amber-400 ring-2 ring-amber-400/50',
                conversationState === 'speaking' && 'border-blue-400 ring-2 ring-blue-400/50'
            )}>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2 min-h-[2rem]">
                        {interviewMode === 'voice' && conversationState === 'speaking' && <><Volume2 className="text-primary" /><span>Interviewer speaking...</span></>}
                        {interviewMode === 'voice' && conversationState === 'listening' && <><Mic className="text-red-500 animate-pulse" /><span>Listening...</span></>}
                        {interviewMode === 'voice' && conversationState === 'thinking' && <><BrainCircuit className="text-primary animate-pulse" /><span>Analyzing...</span></>}
                        {interviewMode === 'text' || ['idle', 'loading', 'finished'].includes(conversationState) && <span>Interviewer:</span>}
                    </CardTitle>
                    <CardDescription className="text-lg text-foreground min-h-[5rem]">
                        {conversationState === 'loading' ? <Loader className="animate-spin" /> : currentQuestion}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {renderInputs()}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
