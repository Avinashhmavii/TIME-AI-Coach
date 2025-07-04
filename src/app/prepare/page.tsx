import { PrepareFlow } from "@/components/prepare-flow";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function PreparePage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-8">
                <h1 className="text-4xl font-headline font-bold text-primary">Interview Preparation</h1>
                <p className="text-muted-foreground mt-2 text-lg">Follow the steps below to get ready for your mock interview.</p>
            </header>
            <PrepareFlow />
        </div>
    )
}