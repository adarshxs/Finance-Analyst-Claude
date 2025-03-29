// app/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { SignedOut, SignedIn, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button"; // Use your Button component
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="container relative flex flex-col items-center justify-center pt-20 pb-12 text-center lg:pt-32 lg:pb-20 min-h-[calc(100vh-3.5rem)]"> {/* Adjust min-height for header */}
      {/* Main heading */}
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
        Unlock Insights with the <span className="text-primary">Financial Analyst</span> AI
      </h1>

      {/* Description */}
      <p className="max-w-3xl text-lg text-muted-foreground sm:text-xl mb-10">
        Upload your financial documents—CSV, PDF, even images—and let our powerful AI, powered by Claude, analyze data, generate interactive charts, and answer your questions.
      </p>

      {/* Call to Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Show Sign In button only if user is logged out */}
        <SignedOut>
          {/*
            This SignInButton from Clerk initiates the sign-in flow.
            Since only Google is enabled in your Clerk dashboard, it should
            either directly start the Google OAuth flow or show a Clerk modal
            with only the Google option.
            redirectUrl specifies where to go *after* successful sign-in.
          */}
          <SignInButton mode="modal" redirectUrl="/finance">
            <Button size="lg" className="gap-2">
              Sign in with Google
              <ArrowRight className="h-5 w-5" />
            </Button>
          </SignInButton>
        </SignedOut>

        {/* Show "Go to App" button only if user is logged in */}
        <SignedIn>
          <Link href="/finance">
            <Button size="lg" variant="outline" className="gap-2">
              Go to App
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </SignedIn>

        {/* Optional: Link to GitHub or other resources */}
        {/* <Link href="YOUR_GITHUB_REPO_URL" target="_blank" rel="noopener noreferrer">
           <Button size="lg" variant="ghost">
             View on GitHub
           </Button>
         </Link> */}
      </div>

      {/* Optional: Add feature highlights or images below */}
      {/* ... */}
    </div>
  );
}