"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getInterviewSummary, type InterviewData } from "@/lib/data-store";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ThumbsUp, Lightbulb, BarChart, ArrowLeft, Smile, Star } from "lucide-react";
import { saveAs } from "file-saver";

export function SummaryDisplay() {
  const [summary, setSummary] = useState<InterviewData[] | null>(null);

  useEffect(() => {
    const data = getInterviewSummary();
    setSummary(data);
  }, []);

  const handleDownload = () => {
    if (!summary) return;
    const formatted = summary.map((item, idx) => ({
      number: idx + 1,
      question: item.question,
      answer: item.answer,
      feedback: item.feedback
    }));
    const blob = new Blob([
      JSON.stringify(formatted, null, 2)
    ], { type: 'application/json' });
    const date = new Date().toISOString().slice(0,10);
    saveAs(blob, `interview-feedback-${date}.json`);
  };

  if (!summary) {
    return (
      <Card className="max-w-2xl mx-auto text-center">
        <CardHeader>
          <CardTitle className="font-headline">No Summary Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            It looks like you haven't completed an interview yet. Go to the prepare page to get started.
          </p>
          <Button asChild>
            <Link href="/prepare">
                <span className="inline-flex items-center gap-2">
                    <ArrowLeft/>
                    Back to Preparation
                </span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall score
  let overallScore = null;
  if (summary.length > 0 && summary[0].feedback?.scoring) {
    let total = 0;
    let count = 0;
    summary.forEach(item => {
      const s = item.feedback.scoring;
      if (s) {
        total += s.ideas.score + s.organization.score + s.accuracy.score + s.voice.score + s.grammar.score + s.stopwords.score;
        count += 6;
      }
    });
    overallScore = count > 0 ? (total / count) : null;
  }

  return (
    <Card className="max-w-4xl mx-auto">
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Detailed Feedback</CardTitle>
            <CardDescription>Review your answers and the AI-powered feedback for each question.</CardDescription>
            <Button className="mt-4" onClick={handleDownload} variant="outline">
              Download Full Feedback
            </Button>
            {overallScore !== null && (
              <div className="mt-6 flex items-center gap-3 bg-primary/10 rounded-lg p-4 border border-primary/20">
                <Star className="text-yellow-500 w-7 h-7" />
                <div>
                  <div className="text-lg font-bold">Overall Interview Score: <span className="text-primary">{overallScore.toFixed(1)}/10</span></div>
                  <div className="text-sm text-muted-foreground">This is the average of all category scores across all your answers.</div>
                </div>
              </div>
            )}
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
                {summary.map((item, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                        <AccordionTrigger className="text-left hover:no-underline">
                           <span className="font-semibold mr-2">{index + 1}.</span> {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-6 pt-4">
                            <div>
                                <h4 className="font-bold mb-2">Your Answer:</h4>
                                <p className="p-4 bg-muted/50 rounded-md text-muted-foreground">{item.answer}</p>
                            </div>
                            <div>
                               <h4 className="font-bold mb-4">AI Feedback:</h4>
                               <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-secondary p-2 rounded-full"><ThumbsUp className="text-primary"/></div>
                                        <div>
                                            <h5 className="font-semibold">Content</h5>
                                            <p className="text-muted-foreground">{item.feedback.contentFeedback}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="bg-secondary p-2 rounded-full"><Lightbulb className="text-primary"/></div>
                                        <div>
                                            <h5 className="font-semibold">Clarity</h5>
                                            <p className="text-muted-foreground">{item.feedback.clarityFeedback}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="bg-secondary p-2 rounded-full"><BarChart className="text-primary"/></div>
                                        <div>
                                            <h5 className="font-semibold">Tone</h5>
                                            <p className="text-muted-foreground">{item.feedback.toneFeedback}</p>
                                        </div>
                                    </div>
                                    {item.feedback.visualFeedback && (
                                    <div className="flex items-start gap-4">
                                        <div className="bg-secondary p-2 rounded-full"><Smile className="text-primary"/></div>
                                        <div>
                                            <h5 className="font-semibold">Visuals</h5>
                                            <p className="text-muted-foreground">{item.feedback.visualFeedback}</p>
                                        </div>
                                    </div>
                                    )}
                                    {/* Scoring Section */}
                                    {item.feedback.scoring && (
                                      <div className="mt-6">
                                        <h5 className="font-semibold mb-2">Scoring Breakdown</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                          {Object.entries(item.feedback.scoring).map(([cat, val]) => (
                                            <div key={cat} className="flex flex-col border rounded-md p-2 bg-muted/30">
                                              <span className="font-bold capitalize">{cat}:</span>
                                              <span className="text-primary font-semibold">{val.score}/10</span>
                                              <span className="text-xs text-muted-foreground">{val.justification}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                               </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </CardContent>
    </Card>
  );
}
