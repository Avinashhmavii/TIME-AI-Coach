# CareerSpark AI

CareerSpark AI is your personal AI-powered interview coach. It helps you analyze your resume, generate tailored interview questions, and practice with realistic mock interviews—complete with instant, actionable feedback.

## Features

- **Resume Role Mapper**: Upload your resume to extract key skills and experiences. Our AI matches your profile to target job roles, giving you a clear picture of your strengths.
- **Question Generator**: Get a list of role- and company-specific interview questions. Questions are adapted to your resume for a truly personalized practice session.
- **Spoken Mock Interviews**: Practice your answers in a realistic, spoken mock interview. Receive instant, AI-driven feedback on your content, tone, and clarity to improve your performance.
- **Real-time Interview Feedback**: Get instant feedback on your answers, including content, tone, clarity, and (optionally) visual presentation if you enable your camera.
- **Performance Analytics**: Review your interview history and see analytics on your strengths and areas for improvement.
- **Multilingual Support**: Practice interviews in English, Hindi, or Hinglish.
- **Adaptive Interview Simulation**: The AI agent adapts the conversation flow to your responses and preferences.

## Tech Stack
- **Next.js 15** (React)
- **Tailwind CSS** for styling
- **Genkit** and **Google AI** for LLM-powered features
- **Speech Recognition** and **WebRTC** for spoken interviews
- **TypeScript** throughout

## Getting Started

### Local Development
1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Run the app:**
   ```sh
   npm run dev
   ```
   The app will be available at [http://localhost:9002](http://localhost:9002).

### Docker
1. **Build the Docker image:**
   ```sh
   docker build -t careerspark-ai .
   ```
2. **Run the container:**
   ```sh
   docker run -p 9002:9002 careerspark-ai
   ```

### Docker Compose
1. **Start with Docker Compose:**
   ```sh
   docker-compose up --build
   ```
   The app will be available at [http://localhost:9002](http://localhost:9002).

## Project Structure
- `src/app/` — Next.js app routes and pages
- `src/components/` — UI components
- `src/ai/` — AI flows and Genkit integration
- `src/lib/` — Utility libraries (job roles, companies, data store, etc.)

## Customization
- **Job Roles & Companies**: Easily extend the list of supported job roles and companies in `src/lib/job-roles.ts` and `src/lib/companies.ts`.
- **Styling**: Modify `tailwind.config.ts` and `globals.css` for custom themes.

## License
This project is for educational and demonstration purposes.
