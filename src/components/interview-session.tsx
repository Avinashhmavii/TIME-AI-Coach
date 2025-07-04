"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { getQuestions, saveInterviewSummary, type InterviewData } from "@/lib/data-store";
import { getRealTimeFeedback, type GetRealTimeFeedbackOutput } from "@/ai/flows/real-time-feedback";
import { useToast } from "@/hooks/use-toast";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Loader, Mic, MicOff, ArrowRight, Volume2, ThumbsUp, Lightbulb, BarChart } from "lucide-react";
import { Progress } from "./ui/progress";
import Link from "next/link";


export function InterviewSession() {
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<GetRealTimeFeedbackOutput | null>(null);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [interviewData, setInterviewData] = useState<InterviewData[]>([]);

  const router = useRouter();
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const storedQuestions = getQuestions();
    if (storedQuestions && storedQuestions.questions.length > 0) {
      setQuestions(storedQuestions.questions);
    } else {
      toast({
        variant: "destructive",
        title: "No questions found",
        description: "Please go to the prepare page to generate questions first.",
      });
      router.push("/prepare");
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

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

  }, [router, toast]);
  
  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  }

  useEffect(() => {
    if (questions.length > 0) {
      speakQuestion(questions[currentQuestionIndex]);
    }
  }, [currentQuestionIndex, questions]);


  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (transcript.trim()) {
        getFeedback();
      }
    } else {
      setTranscript("");
      setFeedback(null);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const getFeedback = async () => {
    setIsLoadingFeedback(true);
    try {
      const currentAnswer = transcript.trim();
      const result = await getRealTimeFeedback({ transcript: currentAnswer });
      setFeedback(result);
      setInterviewData(prev => [...prev, {
        question: questions[currentQuestionIndex],
        answer: currentAnswer,
        feedback: result
      }]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Feedback Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTranscript("");
      setFeedback(null);
      setIsListening(false);
    } else {
      setInterviewFinished(true);
      saveInterviewSummary(interviewData);
    }
  };

  if (questions.length === 0) {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin" /></div>;
  }
  
  const progressValue = ((currentQuestionIndex + 1) / questions.length) * 100;

  if(interviewFinished) {
    return (
      <Card className="max-w-2xl mx-auto text-center">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Interview Complete!</CardTitle>
          <CardDescription>You've successfully completed the mock interview. Well done!</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6">You can now view your detailed performance summary.</p>
          <Button asChild size="lg">
            <Link href="/summary"><span className="inline-flex items-center gap-2">View Summary <ArrowRight /></span></Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
        <Progress value={progressValue} className="mb-4" />
        <p className="text-center text-muted-foreground mb-8">Question {currentQuestionIndex + 1} of {questions.length}</p>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl mb-4">{questions[currentQuestionIndex]}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => speakQuestion(questions[currentQuestionIndex])} className="flex items-center gap-2">
            <Volume2 className="w-4 h-4"/>
            Read Question Aloud
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button onClick={handleToggleListening} size="lg" className={`w-32 ${isListening ? 'bg-red-500 hover:bg-red-600' : ''}`}>
                {isListening ? <><MicOff className="mr-2"/>Stop</> : <><Mic className="mr-2"/>Answer</>}
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
          {!feedback && !isLoadingFeedback && (
             <Button onClick={getFeedback} disabled={!transcript.trim() || isListening}>Get Feedback</Button>
          )}
        </CardFooter>
      </Card>

      {isLoadingFeedback && (
        <div className="text-center py-8 flex items-center justify-center gap-2 text-primary">
          <Loader className="animate-spin" />
          <span className="font-semibold">Analyzing your answer...</span>
        </div>
      )}

      {feedback && (
        <Card className="mt-8">
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
          </CardContent>
          <CardFooter>
            <Button onClick={handleNextQuestion}>
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
              <ArrowRight className="ml-2"/>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
