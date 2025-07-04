import { InterviewSession } from "@/components/interview-session";

export default function InterviewPage() {
    return (
        <div className="container mx-auto px-4 py-8">
             <header className="mb-8 text-center">
                <h1 className="text-4xl font-headline font-bold text-primary">Mock Interview</h1>
                <p className="text-muted-foreground mt-2 text-lg">Good luck! Speak clearly and confidently.</p>
            </header>
            <InterviewSession />
        </div>
    )
}