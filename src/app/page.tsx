"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Briefcase, BarChart3, UserCircle, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CookieConsent } from "@client/components/ui/cookie-consent";

/**
 * Public landing page.
 * Authenticated users are redirected to /dashboard by middleware.
 * Role selection triggers Google OAuth directly — role is passed via redirect URL.
 */
export default function HomePage() {
  const [loading, setLoading] = useState<"candidate" | "hr" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // When the user navigates to the Google OAuth page and then presses the
  // browser Back button, this page is restored from the back-forward cache
  // (bfcache) with the previous React state — leaving `loading` set and both
  // role buttons disabled until a manual refresh. Reset it on pageshow so the
  // buttons become clickable again.
  useEffect(() => {
    const handlePageShow = () => setLoading(null);
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

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
    <>
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-neutral-950 text-white">
      {/* Subtle depth gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%)]"
      />
      {/* Subtle three-stripes motif on the right edge (adidas brand hint) */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 hidden h-full gap-3 pr-10 md:flex"
      >
        {[0.08, 0.055, 0.03].map((o, i) => (
          <div
            key={i}
            className="h-full w-[36px]"
            style={{ background: `rgba(255,255,255,${o})` }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-3xl space-y-10 px-4 text-center">
        {/* Hero */}
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2">
            <img src="/adidas-logo.svg" alt="adidas" className="h-10 w-auto" />
          </div>
          <h1 className="font-adineue-bold text-5xl uppercase leading-[1.02] tracking-tight text-white sm:text-7xl">
            TalentHub
          </h1>
          <p className="font-adihaus-bold text-xs uppercase tracking-[0.25em] text-neutral-500">
            An Integrated HR Platform for Candidate Lifecycle Management
          </p>
          <p className="font-adihaus-regular mx-auto max-w-2xl text-base text-neutral-400 sm:text-lg">
            A structured talent pool, automated CV parsing, job-anchored
            candidate matching, an HR communication and campaign layer, and an
            AI-driven language and skill assessment module.
          </p>
        </div>

        {/* Role selection */}
        <div className="space-y-4">
          <p className="font-adihaus-bold text-xs uppercase tracking-[0.25em] text-neutral-500">
            Select your role to sign in with Google
          </p>

          {error && (
            <p className="font-adihaus-regular rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="mx-auto grid max-w-md grid-cols-2 gap-4">
            <button
              onClick={() => handleSignIn("candidate")}
              disabled={loading !== null}
              className="group flex flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserCircle className="h-10 w-10 text-white transition-transform group-hover:scale-110" />
              <div>
                <p className="font-adihaus-bold text-sm uppercase tracking-wide">
                  I&apos;m a Candidate
                </p>
                <p className="font-adihaus-regular mt-1 text-xs text-neutral-500">
                  Apply for positions and track assessments
                </p>
              </div>
              {loading === "candidate" && (
                <p className="font-adihaus-regular animate-pulse text-xs text-neutral-400">
                  Redirecting…
                </p>
              )}
            </button>

            <button
              onClick={() => handleSignIn("hr")}
              disabled={loading !== null}
              className="group flex flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck className="h-10 w-10 text-white transition-transform group-hover:scale-110" />
              <div>
                <p className="font-adihaus-bold text-sm uppercase tracking-wide">
                  I&apos;m HR
                </p>
                <p className="font-adihaus-regular mt-1 text-xs text-neutral-500">
                  Manage candidates and run evaluations
                </p>
              </div>
              {loading === "hr" && (
                <p className="font-adihaus-regular animate-pulse text-xs text-neutral-400">
                  Redirecting…
                </p>
              )}
            </button>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid gap-4 border-t border-neutral-800 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <Users className="h-5 w-5 shrink-0 text-neutral-300" />
            <div className="text-left">
              <h3 className="font-adihaus-bold text-sm uppercase tracking-wide">
                Talent Pool
              </h3>
              <p className="font-adihaus-regular text-xs text-neutral-500">
                AI parsing &amp; structured scoring
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2">
            <Briefcase className="h-5 w-5 shrink-0 text-neutral-300" />
            <div className="text-left">
              <h3 className="font-adihaus-bold text-sm uppercase tracking-wide">
                Job Matching
              </h3>
              <p className="font-adihaus-regular text-xs text-neutral-500">
                Automated candidate ranking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2">
            <Sparkles className="h-5 w-5 shrink-0 text-neutral-300" />
            <div className="text-left">
              <h3 className="font-adihaus-bold text-sm uppercase tracking-wide">
                AI Interviewer
              </h3>
              <p className="font-adihaus-regular text-xs text-neutral-500">
                Skill &amp; language validation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2">
            <BarChart3 className="h-5 w-5 shrink-0 text-neutral-300" />
            <div className="text-left">
              <h3 className="font-adihaus-bold text-sm uppercase tracking-wide">
                Analytics
              </h3>
              <p className="font-adihaus-regular text-xs text-neutral-500">
                Funnel insights &amp; reports
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Footer */}
    <footer className="w-full border-t border-neutral-800 bg-black px-4 py-4 text-center text-xs text-neutral-500 space-y-1">
      <p>
        Academic project &mdash; BlendEd / BIP &times; adidas &mdash; 2026
      </p>
      <p>
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-white transition-colors"
        >
          Privacy Policy &amp; Cookie Settings
        </Link>
      </p>
    </footer>

    <CookieConsent />
    </>
  );
}
