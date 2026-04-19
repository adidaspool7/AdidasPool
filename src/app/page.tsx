"use client";

import { useState } from "react";
import { Users, Briefcase, BarChart3, UserCircle, ShieldCheck } from "lucide-react";
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="mx-auto max-w-3xl text-center space-y-8 px-4">
        {/* Hero */}
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
            adidas Talent Platform
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            adidas{" "}
            <span className="text-primary">HR Management</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Manage recruitment end-to-end with AI-powered CV parsing,
            candidate evaluation, and language proficiency assessment.
          </p>
        </div>

        {/* Role selection */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            Select your role to sign in with Google
          </p>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <button
              onClick={() => handleSignIn("candidate")}
              disabled={loading !== null}
              className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center transition-colors hover:bg-accent hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserCircle className="h-10 w-10 text-emerald-500" />
              <div>
                <p className="font-semibold">I&apos;m a Candidate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Apply for positions and track assessments
                </p>
              </div>
              {loading === "candidate" && (
                <p className="text-xs text-muted-foreground animate-pulse">Redirecting…</p>
              )}
            </button>

            <button
              onClick={() => handleSignIn("hr")}
              disabled={loading !== null}
              className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center transition-colors hover:bg-accent hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="h-10 w-10 text-primary" />
              <div>
                <p className="font-semibold">I&apos;m HR</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage candidates and run evaluations
                </p>
              </div>
              {loading === "hr" && (
                <p className="text-xs text-muted-foreground animate-pulse">Redirecting…</p>
              )}
            </button>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid gap-6 sm:grid-cols-3 pt-8">
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card">
            <Users className="h-8 w-8 text-primary" />
            <h3 className="font-semibold">Talent Pool</h3>
            <p className="text-sm text-muted-foreground text-center">
              Bulk CV upload, AI parsing, structured scoring
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card">
            <Briefcase className="h-8 w-8 text-primary" />
            <h3 className="font-semibold">Job Matching</h3>
            <p className="text-sm text-muted-foreground text-center">
              Smart matching engine with automated candidate ranking
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h3 className="font-semibold">Analytics</h3>
            <p className="text-sm text-muted-foreground text-center">
              Recruitment funnel, language proficiency reports &amp; scoring
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
