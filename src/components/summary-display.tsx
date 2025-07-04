"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getInterviewSummary, type InterviewData } from "@/lib/data-store";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ThumbsUp, Lightbulb, BarChart, ArrowLeft, Smile } from "lucide-react";

export function SummaryDisplay() {
  const [summary, setSummary] = useState<InterviewData[] | null>(null);

  useEffect(() => {
    const data = getInterviewSummary();
    setSummary(data);
  }, []);

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

  return (
    <Card className="max-w-4xl mx-auto">
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Detailed Feedback</CardTitle>
            <CardDescription>Review your answers and the AI-powered feedback for each question.</CardDescription>
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
