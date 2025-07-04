"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { getQuestions, getResumeAnalysis, saveInterviewSummary, type InterviewData, getVideoPreference } from "@/lib/data-store";
import { interviewAgent, type InterviewAgentOutput } from "@/ai/flows/interview-agent";
import { generateIceBreakerQuestion } from "@/ai/flows/ice-breaker-generator";
import { useToast } from "@/hooks/use-toast";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Loader, Mic, MicOff, ArrowRight, Volume2, ThumbsUp, Lightbulb, BarChart, Smile, Video } from "lucide-react";
import Link from "next/link";

type Feedback = Omit<InterviewAgentOutput, 'nextQuestion' | 'isInterviewOver'>;

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
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [interviewData, setInterviewData] = useState<InterviewData[]>([]);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
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

  useEffect(() => {
    // 1. Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(prev => prev + finalTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        toast({variant: 'destructive', title: 'Speech Recognition Error', description: event.error});
        setIsListening(false);
      }
    } else {
        toast({variant: 'destructive', title: 'Browser Not Supported', description: 'Speech recognition is not supported in this browser.'});
    }

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

    const setupInterview = async () => {
        const storedQuestionsData = getQuestions();
        const storedResumeAnalysis = getResumeAnalysis();
        if (!storedQuestionsData || !storedResumeAnalysis) {
            toast({ variant: "destructive", title: "Missing Preparation Data", description: "Please go to the prepare page first." });
            router.push("/prepare");
            return;
        }

        const langName = storedQuestionsData.language;
        setLanguage(getLanguageCode(langName));
        setLanguageName(langName);
        setJobRole(storedQuestionsData.jobRole);
        setCompany(storedQuestionsData.company);
        setResumeText(`${storedResumeAnalysis.skills.join(', ')}\n\n${storedResumeAnalysis.experienceSummary}`);
        
        const videoIsEnabled = getVideoPreference();

        if (!videoIsEnabled) {
            setHasCameraPermission(false);
            setCurrentQuestion("Tell me about yourself.");
            setIsLoading(false);
            return;
        }

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
                    setIsLoading(false);
                };
            } else {
                setCurrentQuestion("Tell me about yourself.");
                setIsLoading(false);
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
            setIsLoading(false);
        }
    }

    setupInterview();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const speak = (text: string) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      window.speechSynthesis.speak(utterance);
    }
  }

  useEffect(() => {
    if (currentQuestion) {
      speak(currentQuestion);
    }
  }, [currentQuestion, language]);


  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setFeedback(null);
      if (recognitionRef.current) {
        recognitionRef.current.lang = language;
      }
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

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

  const handleSubmitAnswer = async () => {
    if (!transcript.trim()) {
        toast({variant: 'destructive', title: 'No answer recorded', description: 'Please provide an answer before submitting.'});
        return;
    }
    setIsLoading(true);
    setFeedback(null);

    const videoFrameDataUri = captureVideoFrame();

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
        setInterviewFinished(true);
        saveInterviewSummary(newInterviewData);
        setCurrentQuestion(result.nextQuestion);
      } else {
        setCurrentQuestion(result.nextQuestion);
        setTranscript("");
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Agent Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !currentQuestion) {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin mr-2" /> Preparing your interview...</div>;
  }
  
  if(interviewFinished) {
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

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
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
                                        Video analysis is disabled. You can enable it in the preparation flow.
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
                    <div className="flex items-start gap-4">
                        <div className="bg-secondary p-2 rounded-full"><Smile className="text-primary"/></div>
                        <div>
                            <h4 className="font-semibold">Visuals</h4>
                            <p className="text-muted-foreground">{feedback.visualFeedback}</p>
                        </div>
                    </div>
                </CardContent>
                </Card>
            )}
        </div>

        <div className="space-y-4">
            <p className="text-center text-muted-foreground">Language: {languageName}</p>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Interviewer:</CardTitle>
                    <CardDescription className="text-lg text-foreground min-h-[5rem]">
                        {isLoading && !currentQuestion ? <Loader className="animate-spin" /> : currentQuestion}
                    </CardDescription>
                    <Button variant="outline" size="sm" onClick={() => speak(currentQuestion || '')} className="flex items-center gap-2 w-fit" disabled={isLoading}>
                        <Volume2 className="w-4 h-4"/>
                        Repeat Question
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Button onClick={handleToggleListening} size="lg" className={`w-32 ${isListening ? 'bg-red-500 hover:bg-red-600' : ''}`} disabled={isLoading}>
                                {isListening ? <span className="flex items-center"><MicOff className="mr-2"/>Stop</span> : <span className="flex items-center"><Mic className="mr-2"/>Answer</span>}
                            </Button>
                            <p className="text-sm text-muted-foreground">{isListening ? "Listening... Click to stop." : "Click to start answering."}</p>
                        </div>
                        
                        <div className="min-h-[100px] bg-muted/50 p-4 rounded-md border">
                        <p className="text-muted-foreground font-semibold">Your answer:</p>
                        <p>{transcript || "..."}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                {!isListening && transcript && (
                    <Button onClick={handleSubmitAnswer} disabled={isLoading}>
                        {isLoading ? <span className="flex items-center"><Loader className="animate-spin mr-2" />Thinking...</span> : "Submit Answer"}
                    </Button>
                )}
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
