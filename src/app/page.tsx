"use client";

import { useState } from "react";
import { Users, Briefcase, BarChart3, UserCircle, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Public landing page.
 * Authenticated users are redirected to /dashboard by middleware.
 * Role selection triggers Google OAuth directly — role is passed via redirect URL.
 */
export default function HomePage() {
  const [loading, setLoading] = useState<"candidate" | "hr" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (role: "candidate" | "hr") => {
    setLoading(role);
    setError(null);

    // Store role in a cookie so the callback can read it even if
    // Supabase strips query params from the redirect URL.
    document.cookie = `pending_role=${role};path=/;max-age=600;samesite=lax`;

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(null);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted">
      {/* Subtle three-stripes motif on the right edge (adidas brand hint) */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 hidden h-full gap-3 pr-10 md:flex"
      >
        {[0.05, 0.035, 0.02].map((o, i) => (
          <div
            key={i}
            className="h-full w-[18px]"
            style={{ background: `rgba(0,0,0,${o})` }}
          />
        ))}
      </div>

      <div className="mx-auto max-w-3xl space-y-10 px-4 text-center">
        {/* Hero */}
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black p-2">
              <img src="/adidas-logo.svg" alt="adidas" className="h-full w-full" />
            </div>
          </div>
          <h1 className="font-adineue-bold text-4xl uppercase leading-[1.05] tracking-tight sm:text-6xl">
            adidas HR
            <br />
            Talent Intelligence
            <br />
            Platform
          </h1>
          <p className="font-adihaus-regular mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            Manage recruitment end-to-end with AI-powered CV parsing,
            candidate evaluation, smart job matching, and AI-driven interviews.
          </p>
        </div>

        {/* Role selection */}
        <div className="space-y-4">
          <p className="font-adihaus-bold text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Select your role to sign in with Google
          </p>

          {error && (
            <p className="font-adihaus-regular rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mx-auto grid max-w-md grid-cols-2 gap-4">
            <button
              onClick={() => handleSignIn("candidate")}
              disabled={loading !== null}
              className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-accent hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserCircle className="h-10 w-10 text-emerald-500 transition-transform group-hover:scale-110" />
              <div>
                <p className="font-adihaus-bold text-sm uppercase tracking-wide">
                  I&apos;m a Candidate
                </p>
                <p className="font-adihaus-regular mt-1 text-xs text-muted-foreground">
                  Apply for positions and track assessments
                </p>
              </div>
              {loading === "candidate" && (
                <p className="font-adihaus-regular animate-pulse text-xs text-muted-foreground">
                  Redirecting…
                </p>
              )}
            </button>

            <button
              onClick={() => handleSignIn("hr")}
              disabled={loading !== null}
              className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-accent hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck className="h-10 w-10 text-primary transition-transform group-hover:scale-110" />
              <div>
                <p className="font-adihaus-bold text-sm uppercase tracking-wide">
                  I&apos;m HR
                </p>
                <p className="font-adihaus-regular mt-1 text-xs text-muted-foreground">
                  Manage candidates and run evaluations
                </p>
              </div>
              {loading === "hr" && (
                <p className="font-adihaus-regular animate-pulse text-xs text-muted-foreground">
                  Redirecting…
                </p>
              )}
            </button>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <Users className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-left">
              <h3 className="font-adihaus-bold text-sm uppercase tracking-wide">
                Talent Pool
              </h3>
              <p className="font-adihaus-regular text-xs text-muted-foreground">
                AI parsing &amp; structured scoring
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2">
            <Briefcase className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-left">
              <h3 className="font-adihaus-bold text-sm uppercase tracking-wide">
                Job Matching
              </h3>
              <p className="font-adihaus-regular text-xs text-muted-foreground">
                Automated candidate ranking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-left">
              <h3 className="font-adihaus-bold text-sm uppercase tracking-wide">
                AI Interviewer
              </h3>
              <p className="font-adihaus-regular text-xs text-muted-foreground">
                Skill &amp; language validation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2">
            <BarChart3 className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-left">
              <h3 className="font-adihaus-bold text-sm uppercase tracking-wide">
                Analytics
              </h3>
              <p className="font-adihaus-regular text-xs text-muted-foreground">
                Funnel insights &amp; reports
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
