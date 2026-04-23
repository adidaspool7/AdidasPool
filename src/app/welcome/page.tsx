"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ── Testimonial data (placeholder — swap with real stories later) ── */
const testimonials = [
  {
    image: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=400&fit=crop",
    quote:
      "Moving to Porto was the best career decision I ever made. The lifestyle, the people, the surf after work — it's unreal.",
    name: "Lucas M.",
    country: "Brazil",
    flag: "🇧🇷",
  },
  {
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
    quote:
      "I traded the London rain for 300 days of sun and a cost of living that lets me actually enjoy life.",
    name: "Sarah K.",
    country: "United Kingdom",
    flag: "🇬🇧",
  },
  {
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    quote:
      "adidas GBS Porto gave me the international career I wanted — and pastéis de nata every morning.",
    name: "Tobias W.",
    country: "Germany",
    flag: "🇩🇪",
  },
];

/* ── Country flags for the scrolling carousel ── */
const flags = [
  "🇧🇷", "🇩🇪", "🇫🇷", "🇬🇧", "🇮🇹", "🇪🇸", "🇵🇹", "🇳🇱", "🇵🇱", "🇷🇴",
  "🇬🇷", "🇹🇷", "🇮🇳", "🇺🇸", "🇲🇽", "🇨🇴", "🇦🇷", "🇯🇵", "🇰🇷", "🇿🇦",
  "🇨🇿", "🇭🇺", "🇸🇪", "🇳🇴", "🇩🇰", "🇫🇮", "🇧🇪", "🇦🇹", "🇨🇭", "🇮🇪",
  "🇷🇸", "🇭🇷", "🇧🇬", "🇸🇰", "🇱🇹", "🇱🇻", "🇪🇪", "🇺🇦", "🇵🇭", "🇮🇩",
];

/* ── Chatbot tooltip ── */
function ChatbotIcon() {
  return (
    <div className="group fixed top-6 right-6 z-50 flex items-center gap-3">
      <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-black shadow-lg backdrop-blur-sm opacity-0 translate-y-[-4px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none font-adihaus-regular">
        Your personal Porto assistant
      </div>
      <a
        href="https://onboarding-aibot.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-all hover:bg-white/30 hover:scale-110"
        aria-label="Chat assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </a>
    </div>
  );
}

/* ── Adidas Performance logo (image) ── */
function AdidasLogo({ className }: { className?: string }) {
  return (
    <img
      src="/adidas-logo.svg"
      alt="adidas"
      className={className}
      draggable={false}
    />
  );
}

/* ── Three vertical stripes on the right edge ── */
function ThreeStripes() {
  return (
    <div
      className="pointer-events-none fixed right-0 top-0 z-20 flex h-full gap-[14px] pr-[40px]"
      aria-hidden
    >
      {[0.14, 0.10, 0.06].map((opacity, i) => (
        <div
          key={i}
          className="h-full w-[35px]"
          style={{
            background: `linear-gradient(to bottom, rgba(255,255,255,${opacity * 0.3}) 0%, rgba(255,255,255,${opacity}) 15%, rgba(255,255,255,${opacity}) 85%, rgba(255,255,255,${opacity * 0.3}) 100%)`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Stats bar ── */
function StatsBar() {
  return (
    <div className="font-adihaus-bold flex flex-wrap items-center justify-center gap-4 text-sm tracking-wider text-white/90 sm:gap-8 md:text-base">
      <span>€30K+ avg salary</span>
      <span className="hidden sm:inline text-white/40">|</span>
      <span>300 sunny days</span>
      <span className="hidden sm:inline text-white/40">|</span>
      <span>€500/month studio</span>
    </div>
  );
}

/* ── Flag Carousel ── */
function FlagCarousel() {
  /* Duplicate the array for seamless infinite scroll */
  const doubled = [...flags, ...flags];

  return (
    <div className="relative w-full overflow-hidden py-4">
      <div className="welcome-flag-scroll flex w-max gap-6 text-4xl">
        {doubled.map((flag, i) => (
          <span key={i} className="inline-block" aria-hidden>
            {flag}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Testimonials carousel ── */
function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(
      () => setCurrent((c) => (c + 1) % testimonials.length),
      6000
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const t = testimonials[current];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-10">
        {/* Photo */}
        <div className="h-48 w-48 flex-shrink-0 overflow-hidden rounded-2xl shadow-2xl">
          <img
            src={t.image}
            alt={t.name}
            className="h-full w-full object-cover transition-opacity duration-700"
          />
        </div>
        {/* Quote */}
        <div className="max-w-md text-center sm:text-left">
          <p className="font-adineue-bold text-lg uppercase tracking-wide text-white">
            &ldquo;{t.quote}&rdquo;
          </p>
          <p className="font-adihaus-bold mt-4 text-sm text-white/70">
            — {t.name}, {t.country} {t.flag}
          </p>
        </div>
      </div>

      {/* Dots */}
      <div className="flex gap-2">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              i === current ? "bg-white scale-125" : "bg-white/40"
            }`}
            aria-label={`Testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function WelcomePage() {
  return (
    <div className="welcome-page relative min-h-screen text-white">
      {/* ── Background video ── */}
      <video
        className="fixed inset-0 h-full w-full object-cover"
        src="/hero-video.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 bg-black/40" />

      {/* ── Three vertical stripes (right edge) ── */}
      <ThreeStripes />

      {/* ── Chatbot icon ── */}
      <ChatbotIcon />

      {/* ── Content (scrolls over the video) ── */}
      <div className="relative z-10">
        {/* ─── HERO SECTION ─── */}
        <section className="flex min-h-screen flex-col justify-between px-6 pb-12 pt-8 sm:px-12 lg:px-20">
          {/* Top bar */}
          <header className="flex items-center justify-between">
            <AdidasLogo className="h-10 w-auto text-white" />
            <span className="font-adihaus-bold text-lg uppercase tracking-[0.3em]">
              adidas GBS Porto
            </span>
            {/* Spacer for the chatbot icon */}
            <div className="w-12" />
          </header>

          {/* Hero copy */}
          <div className="my-auto max-w-3xl space-y-8 pt-12">
            <h1 className="welcome-heading font-adineue-bold text-5xl uppercase leading-[1.05] tracking-tight sm:text-7xl lg:text-8xl">
              Launch your
              <br />
              career where
              <br />
              others take
              <br />
              vacation.
            </h1>

            <p className="font-adihaus-bold max-w-xl text-sm leading-relaxed tracking-wide text-white/80 sm:text-base">
              Join adidas GBS in Porto — where work meets Atlantic waves,
              European salaries meet Mediterranean prices, and your Monday
              morning starts with pastéis de nata.
            </p>

            {/* CTA button — inverts on hover */}
            <Link
              href="/"
              className="welcome-cta font-adihaus-bold inline-block rounded-full border-2 border-white bg-transparent px-10 py-4 text-sm tracking-widest text-white transition-all duration-300 hover:bg-white hover:text-black"
            >
              See opportunities
            </Link>
          </div>

          {/* Stats + tagline at bottom */}
          <div className="space-y-4">
            <StatsBar />
            <p className="font-adihaus-regular text-center text-xs tracking-wide text-white/60 sm:text-sm">
              No relocation stress. No lonely start. Just your skills, our
              opportunities, and a city that feels like summer break — but pays
              like a career.
            </p>
          </div>
        </section>

        {/* ─── SOCIAL PROOF SECTION ─── */}
        <section className="relative bg-black/70 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl space-y-10 px-6 py-20 text-center sm:px-12">
            <h2 className="font-adineue-bold text-2xl uppercase tracking-wide sm:text-3xl">
              Join 2,000+ young professionals from 40+ countries
            </h2>

            {/* Flag carousel */}
            <FlagCarousel />

            {/* Testimonials */}
            <TestimonialCarousel />
          </div>
        </section>
      </div>
    </div>
  );
}
