"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { analyzeResume, type AnalyzeResumeOutput } from "@/ai/flows/resume-analyzer";
import { generateRoleSpecificQuestions, type GenerateRoleSpecificQuestionsOutput } from "@/ai/flows/interview-question-generator";
import { validateInput } from "@/ai/flows/input-validator";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { saveQuestions, saveResumeAnalysis, saveVideoPreference, saveInterviewMode } from "@/lib/data-store";
import { ArrowRight, CheckCircle, FileText, Loader, Mic, Sparkles, Camera, Keyboard } from "lucide-react";
import Link from "next/link";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Combobox } from "./ui/combobox";
import { jobRoles } from "@/lib/job-roles";
import { companies } from "@/lib/companies";

// Step 1: Resume Upload
const resumeSchema = z.object({
  resume: z.custom<FileList>().refine((files) => files?.length > 0, "A resume file is required."),
});
type ResumeFormValues = z.infer<typeof resumeSchema>;

// Step 2: Exam Details
const examTypes = [
  { value: 'mba', label: 'MBA Entrance Exams' },
  { value: 'engineering', label: 'Engineering and Science' },
  { value: 'government', label: 'Government/Bank/SSC Exam' },
  { value: 'law', label: 'Law and IPM' },
  { value: 'medical', label: 'Medical' },
  { value: 'international', label: 'International Exams' },
  { value: 'foundation', label: 'Foundation/School Level' },
];

const examRoles: Record<string, { value: string; label: string }[]> = {
  mba: [
    { value: 'cat', label: 'CAT Aspirant' },
    { value: 'xat', label: 'XAT Aspirant' },
    { value: 'cmat', label: 'CMAT Aspirant' },
    { value: 'gmat', label: 'GMAT Aspirant' },
    { value: 'mat', label: 'MAT Aspirant' },
    { value: 'mms-cet', label: 'MAH-MBA/MMS-CET Aspirant' },
  ],
  engineering: [
    { value: 'jee', label: 'JEE Aspirant' },
    { value: 'gate', label: 'GATE Aspirant' },
  ],
  government: [
    { value: 'bank', label: 'Bank PO/Clerk Aspirant' },
    { value: 'ssc', label: 'SSC CGL Aspirant' },
    { value: 'crt', label: 'Campus Recruitment Training (CRT) Aspirant' },
  ],
  law: [
    { value: 'clat', label: 'CLAT Aspirant' },
    { value: 'ipm', label: 'IPM (IIM) Aspirant' },
  ],
  medical: [
    { value: 'neet', label: 'NEET Aspirant' },
  ],
  international: [
    { value: 'gre', label: 'GRE Aspirant' },
    { value: 'gmat-international', label: 'GMAT Aspirant (International)' },
  ],
  foundation: [
    { value: 'iit-foundation', label: 'IIT Foundation Aspirant' },
  ],
};

const jobDetailsSchema = z.object({
  examType: z.string().min(1, 'Exam type is required.'),
  examRole: z.string().min(1, 'Specific Role/Exam is required.'),
  language: z.string({ required_error: 'Please select a language.' }),
});
type JobDetailsFormValues = z.infer<typeof jobDetailsSchema>;

export function PrepareFlow() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<AnalyzeResumeOutput | null>(null);
  const [questions, setQuestions] = useState<GenerateRoleSpecificQuestionsOutput | null>(null);

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isCameraTestOpen, setIsCameraTestOpen] = useState(false);
  const videoTestRef = useRef<HTMLVideoElement>(null);
  
  const { toast } = useToast();

  const resumeForm = useForm<ResumeFormValues>({
    resolver: zodResolver(resumeSchema),
  });

  const jobDetailsForm = useForm<JobDetailsFormValues>({
    resolver: zodResolver(jobDetailsSchema),
    defaultValues: {
      examType: '',
      examRole: '',
      language: 'English',
    },
  });

  const watchedExamType = jobDetailsForm.watch('examType');

  const handleStopCamera = () => {
    if (videoTestRef.current?.srcObject) {
      const stream = videoTestRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoTestRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    // Cleanup stream on component unmount
    return () => {
      handleStopCamera();
    };
  }, []);

  const handleTestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoTestRef.current) {
        videoTestRef.current.srcObject = stream;
      }
    } catch (err) {
        toast({
            variant: "destructive",
            title: "Camera Access Denied",
            description: "Please enable camera permissions in your browser settings.",
        });
        setIsCameraTestOpen(false);
    }
  };

  const handleCameraTestOpenChange = (open: boolean) => {
    if (open) {
        handleTestCamera();
    } else {
        handleStopCamera();
    }
    setIsCameraTestOpen(open);
  };

  const handleResumeSubmit: SubmitHandler<ResumeFormValues> = async (data) => {
    setIsLoading(true);
    const file = data.resume[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const resumeDataUri = e.target?.result as string;
        if (!resumeDataUri) {
          throw new Error("Could not read file.");
        }
        const analysis = await analyzeResume({ resumeDataUri });
        
        if (!analysis.isResume) {
          toast({
            variant: "destructive",
            title: "Invalid File",
            description: "The uploaded file does not appear to be a resume. Please upload a valid resume.",
          });
          resumeForm.reset();
          return;
        }
        
        setResumeAnalysis(analysis);
        saveResumeAnalysis(analysis);
        setStep(2);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error Analyzing Resume",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
        setIsLoading(false);
        toast({ variant: "destructive", title: "Error", description: "Failed to read the file."})
    }
    reader.readAsDataURL(file);
  };
  
  const handleJobDetailsSubmit: SubmitHandler<JobDetailsFormValues> = async (data) => {
    if (!resumeAnalysis) {
        toast({ variant: 'destructive', title: 'Error', description: 'Resume analysis is not available.' });
        return;
    }
    setIsLoading(true);
    jobDetailsForm.clearErrors();

    try {
        // Validate inputs for inappropriate content
        const [examTypeValidation, examRoleValidation] = await Promise.all([
            validateInput({ text: data.examType }),
            validateInput({ text: data.examRole }),
        ]);

        let hasError = false;
        if (!examTypeValidation.isValid) {
            jobDetailsForm.setError("examType", { type: "manual", message: examTypeValidation.reason || "This exam type is not allowed." });
            hasError = true;
        }

        if (!examRoleValidation.isValid) {
            jobDetailsForm.setError("examRole", { type: "manual", message: examRoleValidation.reason || "This role/exam is not allowed." });
            hasError = true;
        }

        if (hasError) {
            return; // Finally block will handle isLoading
        }

        const generatedQuestions = await generateRoleSpecificQuestions({
            jobRole: data.examRole,
            company: data.examType,
            language: data.language,
            resumeText: `${resumeAnalysis.skills.join(', ')}\n\n${resumeAnalysis.experienceSummary}`
        });
        setQuestions(generatedQuestions);
        saveQuestions(generatedQuestions, data.language, data.examRole, data.examType);
        setStep(3);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error During Preparation",
            description: error instanceof Error ? error.message : "An unknown error occurred. Please try again.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><FileText /> Step 1: Upload Your Resume</CardTitle>
              <CardDescription>Let's start by analyzing your resume to tailor the experience.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...resumeForm}>
                <form onSubmit={resumeForm.handleSubmit(handleResumeSubmit)} className="space-y-6">
                  <FormField
                    control={resumeForm.control}
                    name="resume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resume File</FormLabel>
                        <FormControl>
                          <Input 
                            type="file" 
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => field.onChange(e.target.files)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader className="animate-spin" /> : 'Analyze Resume'}
                    <ArrowRight className="ml-2" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><CheckCircle className="text-green-500" />Resume Analysis Complete</CardTitle>
                    <CardDescription>Here's what our AI found. Now, tell us about the exam you're preparing for.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Key Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {resumeAnalysis?.skills.map((skill, i) => <Badge key={i} variant="secondary">{skill}</Badge>)}
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-2">Experience Summary</h3>
                        <Textarea readOnly value={resumeAnalysis?.experienceSummary} className="h-48 bg-muted/50" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Sparkles /> Step 2: Exam Details</CardTitle>
                    <CardDescription>Select your exam type and specific exam to generate tailored questions.</CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...jobDetailsForm}>
                    <form onSubmit={jobDetailsForm.handleSubmit(handleJobDetailsSubmit)} className="space-y-6">
                       <div className="grid sm:grid-cols-2 gap-4">
                            <FormField
                                control={jobDetailsForm.control}
                                name="examType"
                                render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Exam Type</FormLabel>
                                    <FormControl>
                                        <Combobox
                                            options={examTypes}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Select exam type..."
                                            searchPlaceholder="Search exam types..."
                                            emptyPlaceholder="No exam type found."
                                            creatable={false}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={jobDetailsForm.control}
                                name="examRole"
                                render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Specific Role/Exam</FormLabel>
                                    <FormControl>
                                        <Combobox
                                            options={watchedExamType ? examRoles[watchedExamType] || [] : []}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Select role/exam..."
                                            searchPlaceholder="Search roles/exams..."
                                            emptyPlaceholder="No role/exam found."
                                            creatable={false}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                       </div>
                      <FormField
                        control={jobDetailsForm.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Interview Language</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="English">English</SelectItem>
                                <SelectItem value="Hindi">Hindi</SelectItem>
                                <SelectItem value="Hinglish">Hinglish</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                     <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader className="animate-spin" /> : 'Generate Questions'}
                        <ArrowRight className="ml-2" />
                    </Button>
                    </form>
                </Form>
                </CardContent>
            </Card>
          </div>
        );
      case 3:
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><CheckCircle className="text-green-500"/>Ready for your interview!</CardTitle>
                    <CardDescription>Your personalized interview is ready. Choose your preferred interview format below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4 rounded-md border p-4">
                        <h4 className="font-semibold">Optional: Camera Setup (For Voice Interview)</h4>
                        <div className="flex items-center space-x-2">
                            <Switch id="video-enabled" checked={videoEnabled} onCheckedChange={setVideoEnabled} />
                            <Label htmlFor="video-enabled">Enable Video for Enhanced Feedback</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            This allows our AI to provide feedback on your body language and visual presentation. Your video is not stored.
                        </p>
                        <Dialog open={isCameraTestOpen} onOpenChange={handleCameraTestOpenChange}>
                            <DialogTrigger asChild>
                                <Button variant="outline" disabled={!videoEnabled}><Camera className="mr-2 h-4 w-4"/>Test Camera</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                <DialogTitle>Camera Test</DialogTitle>
                                </DialogHeader>
                                <div className="aspect-video bg-muted rounded-md overflow-hidden">
                                <video ref={videoTestRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button asChild size="lg" onClick={() => {
                            saveVideoPreference(videoEnabled);
                            saveInterviewMode('voice');
                        }}>
                            <Link href="/interview">
                                <span className="inline-flex items-center gap-2">
                                    Start Voice Interview
                                    <Mic />
                                </span>
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" onClick={() => {
                            saveVideoPreference(false);
                            saveInterviewMode('text');
                        }}>
                             <Link href="/interview">
                                <span className="inline-flex items-center gap-2">
                                    Start Text Interview
                                    <Keyboard />
                                </span>
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
      default:
        return null;
    }
  };

  return <div>{renderStep()}</div>;
}
