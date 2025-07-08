import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, MessageCircleQuestion, Mic, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <section className="flex flex-col items-center justify-center mb-8">
          <img src="/logo.png" alt="TIME AI Powered Coach Logo" className="h-24 w-30 mb-4" />
        </section>
        <section className="text-center mb-16">
          <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tighter mb-4 text-primary">
            Welcome to TIME AI Powered Coach
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">
            Your personal AI-powered coach to help you ace your next exam or interview. Analyze your resume, generate tailored questions, and practice with a mock interview to get real-time feedback.
          </p>
          <Button asChild size="lg">
            <Link href="/prepare">
              <span className="inline-flex items-center gap-2">Start Your Preparation <ArrowRight /></span>
            </Link>
          </Button>
        </section>

        <section className="grid md:grid-cols-3 gap-8">
          <Card className="hover:shadow-lg transition-shadow duration-300 bg-white/70">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-secondary p-3 rounded-full">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="font-headline text-2xl">Resume Role Mapper</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload your resume to extract key skills and experiences. Our AI matches your profile to target job roles, giving you a clear picture of your strengths.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow duration-300 bg-white/70">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-secondary p-3 rounded-full">
                  <MessageCircleQuestion className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="font-headline text-2xl">Question Generator</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get a list of role- and company-specific interview questions. Our AI generates questions adapted to your resume for a truly personalized practice session.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow duration-300 bg-white/70">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-secondary p-3 rounded-full">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="font-headline text-2xl">Spoken Mock Interviews</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Practice your answers in a realistic, spoken mock interview. Receive instant, AI-driven feedback on your content, tone, and clarity to improve your performance.
              </CardDescription>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
