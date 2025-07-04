import { SummaryDisplay } from "@/components/summary-display";

export default function SummaryPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-headline font-bold text-primary">Interview Summary</h1>
                <p className="text-muted-foreground mt-2 text-lg">Here's a breakdown of your performance. Use this feedback to improve for your next interview!</p>
            </header>
            <SummaryDisplay />
        </div>
    )
}