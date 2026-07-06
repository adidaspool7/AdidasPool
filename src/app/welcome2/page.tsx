"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ══════════════════════════════════════════════════════════════════════
   /welcome2 — Hero page V2 (designer refresh)

   Work-in-progress rebuild of /welcome against the new designer PDF
   (heropage/HeroPageV2.pdf). The original /welcome is left untouched as
   the production reference. Fonts are unchanged (Adineue Pro / Adihaus
   DIN), only adapted in size/weight/spacing to the new layout.
   ══════════════════════════════════════════════════════════════════════ */

/* ── Country flags for the scrolling carousel ── */
const flags = [
  "🇧🇷", "🇩🇪", "🇫🇷", "🇬🇧", "🇮🇹", "🇪🇸", "🇵🇹", "🇳🇱", "🇵🇱", "🇷🇴",
  "🇬🇷", "🇹🇷", "🇮🇳", "🇺🇸", "🇲🇽", "🇨🇴", "🇦🇷", "🇯🇵", "🇰🇷", "🇿🇦",
  "🇨🇿", "🇭🇺", "🇸🇪", "🇳🇴", "🇩🇰", "🇫🇮", "🇧🇪", "🇦🇹", "🇨🇭", "🇮🇪",
  "🇷🇸", "🇭🇷", "🇧🇬", "🇸🇰", "🇱🇹", "🇱🇻", "🇪🇪", "🇺🇦", "🇵🇭", "🇮🇩",
];

/* ── Student Ambassador Program content (from HeroPageV2.pdf) ── */
const missions = [
  {
    n: "01",
    title: "Campus Storytelling",
    body: "Create authentic TikTok and Reels content showcasing Life at the Hub, sustainability efforts, and career opportunities at adidas.",
  },
  {
    n: "02",
    title: "Social Catalyst",
    body: "Organize Coffee Chats and informal meetups within your university, Junior Enterprises, or ESN networks to connect students with our HR team.",
  },
  {
    n: "03",
    title: "The Hub Connection",
    body: "Lead guided visits to our Porto Hub, letting your peers see what happens behind the scenes of a global leader.",
  },
  {
    n: "04",
    title: "Culture Lead",
    body: "Represent adidas at the Running Club and local sports and lifestyle activations across Porto.",
  },
  {
    n: "05",
    title: "Strategic Insights",
    body: "Participate in Pulse Check roundtables with adidas leadership, telling us what Gen Z talent actually values in a workplace. Your voice shapes how we recruit.",
  },
];

const perks = [
  {
    eyebrow: "Mentorship",
    title: "Hub Buddy",
    body: "Be paired with a current adidas professional for 1:1 career guidance throughout the program.",
  },
  {
    eyebrow: "Exclusive Gear",
    title: "Creator Kit",
    body: "Receive exclusive adidas technical gear and apparel to represent the brand on campus.",
  },
  {
    eyebrow: "Learning",
    title: "Skill-Up Workshops",
    body: "Access to workshops and accredited learning badges to build real, market-relevant competencies.",
  },
  {
    eyebrow: "Events",
    title: "VIP Access",
    body: "Invitations to exclusive brand events and community sports activations in and around Porto.",
  },
  {
    eyebrow: "Credentials",
    title: "Certificate of Excellence",
    body: "An official certificate from adidas to strengthen your professional portfolio and résumé.",
  },
  {
    eyebrow: "Flexibility",
    title: "3–5 hrs / week",
    body: "No rigid hours. The program fits around your academic schedule, your studies always come first.",
  },
];

const criteria = [
  {
    title: "Academic Status",
    body: "Enrolled at a university, preferably 2nd year or above.",
  },
  {
    title: "The Connector Profile",
    body: "Active in Junior Enterprises, Student Unions, or the Erasmus Student Network.",
  },
  {
    title: "Digital Fluency",
    body: "A natural ability to create engaging social content and a confident voice.",
  },
  {
    title: "Language",
    body: "Proficiency in Portuguese and English, our global language.",
  },
  {
    title: "Mindset",
    body: "Curious, proactive, and passionate about sports culture.",
  },
];

const processSteps = [
  {
    n: "01",
    title: "Application & CV",
    body: "Tell us who you are and what makes you an Ambassador.",
  },
  {
    n: "02",
    title: "Video Pitch",
    body: "A short video prompt to showcase your communication style.",
  },
  {
    n: "03",
    title: "Hub Interview",
    body: "A conversation with our team about your campus network and ideas.",
  },
  {
    n: "04",
    title: "Selection Day",
    body: "A final selection day at the Porto Hub to kick off your journey.",
  },
];

const CHATBOT_URL = "https://onboarding-aibot.vercel.app";

/* ── Chatbot icon (top-right): adidas logo inside a speech bubble ── */
function ChatbotIcon() {
  return (
    <div className="group fixed top-5 right-6 z-50 flex items-center gap-3 sm:top-6">
      <div className="pointer-events-none rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-black shadow-lg backdrop-blur-sm opacity-0 translate-y-[-4px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 font-adihaus-regular">
        Your personal Porto assistant
      </div>
      <a
        href={CHATBOT_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat assistant"
        className="relative flex h-12 w-12 items-center justify-center rounded-[50%_50%_50%_10%] bg-white shadow-lg transition-all hover:bg-neutral-100 hover:scale-110"
      >
        <img
          src="/adidas-logo.svg"
          alt=""
          className="h-4 w-auto [filter:brightness(0)]"
          draggable={false}
        />
      </a>
    </div>
  );
}

/* ── Adidas Performance logo (image) ── */
function AdidasLogo({ className }: { className?: string }) {
  return (
    <img src="/adidas-logo.svg" alt="adidas" className={className} draggable={false} />
  );
}

/* ── Three vertical stripes on the right edge ── */
function ThreeStripes() {
  return (
    <div
      className="pointer-events-none fixed right-0 top-0 z-20 flex h-full gap-[14px] pr-[40px]"
      aria-hidden
    >
      {[0.14, 0.1, 0.06].map((opacity, i) => (
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

/* ── Offset "double-outline" CTA button (adidas style) ── */
function OffsetButton({
  href,
  children,
  external = false,
  uppercase = false,
  large = false,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  uppercase?: boolean;
  large?: boolean;
  className?: string;
}) {
  const inner = (
    <span
      className={`relative block bg-white text-center text-black transition-colors duration-300 group-hover:bg-neutral-200 ${
        large ? "px-14 py-6" : "px-9 py-4"
      } ${
        uppercase
          ? "font-adihaus-bold text-sm uppercase tracking-widest"
          : `font-adihaus-bold tracking-wide ${large ? "text-xl sm:text-2xl" : "text-lg"}`
      }`}
    >
      {children}
    </span>
  );
  return (
    <span className={`group relative inline-block ${className}`}>
      <span
        aria-hidden
        className="absolute inset-0 translate-x-[6px] translate-y-[6px] border-2 border-white"
      />
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="relative block">
          {inner}
        </a>
      ) : (
        <Link href={href} className="relative block">
          {inner}
        </Link>
      )}
    </span>
  );
}

/* ── Full-width chatbot CTA bar ── */
function ChatbotBar() {
  return (
    <div className="mx-auto max-w-4xl px-6">
      <OffsetButton href={CHATBOT_URL} external uppercase className="w-full">
        <span className="block w-full">More questions? Ask our chatbot!</span>
      </OffsetButton>
    </div>
  );
}

/* ── Grey eyebrow label ── */
function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-adihaus-bold text-sm uppercase tracking-[0.2em] text-white/40 sm:text-base ${className}`}>
      {children}
    </p>
  );
}

/* ── Stats bar ── */
function StatsBar() {
  return (
    <div className="font-adihaus-bold flex flex-wrap items-center justify-center gap-4 text-xl tracking-wide text-white sm:gap-8 sm:text-2xl md:text-3xl">
      <span>€X avg salary</span>
      <span className="hidden text-white/30 sm:inline">|</span>
      <span>300 sunny days</span>
      <span className="hidden text-white/30 sm:inline">|</span>
      <span>€X/month studio</span>
    </div>
  );
}

/* ── Flag Carousel ── */
function FlagCarousel() {
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

/* ── Testimonial placeholders (3 empty profiles, matches /welcome) ── */
const testimonials = [
  { image: "https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?w=500&h=500&fit=crop" },
  { image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop" },
  { image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=500&h=500&fit=crop" },
];

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
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-12">
        <div className="h-56 w-56 flex-shrink-0 overflow-hidden rounded-none shadow-2xl">
          <img
            src={t.image}
            alt=""
            className="h-full w-full object-cover transition-opacity duration-700"
          />
        </div>
        <div className="max-w-md text-center sm:text-left">
          <p className="font-adineue-bold text-2xl uppercase leading-tight tracking-wide text-white sm:text-3xl">
            Comment of person who migrated here
          </p>
          <p className="font-adihaus-regular mt-6 text-base uppercase tracking-wide text-white/90">
            — Name, origin country
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2.5 w-2.5 rounded-none transition-all ${
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
export default function Welcome2Page() {
  return (
    <div className="welcome-page relative min-h-screen text-white">
      {/* ── Background video (hero only; solid black takes over below) ── */}
      <video
        className="fixed inset-0 h-full w-full object-cover"
        src="/hero-video.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
      <div className="fixed inset-0 bg-black/40" />

      <ThreeStripes />
      <ChatbotIcon />

      {/* ── Content ── */}
      <div className="relative z-10">
        {/* ─── HERO SECTION ─── */}
        <section className="relative flex min-h-screen flex-col px-6 pb-12 pt-6 sm:px-12 lg:px-20">
          {/* Top scrim so the header always reads over the video */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent"
          />

          <header className="relative z-10 flex items-center justify-between">
            <AdidasLogo className="h-9 w-auto sm:h-10" />
            <span className="font-adihaus-bold text-base uppercase tracking-[0.3em] sm:text-lg">
              adidas GBS Porto
            </span>
            <div className="w-12" />
          </header>

          <div className="my-auto grid items-end gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-2xl space-y-7">
              <h1 className="welcome-heading font-adineue-bold text-4xl uppercase leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
                Launch your
                <br />
                career where
                <br />
                others take
                <br />
                vacation.
              </h1>

              <p className="font-adihaus-regular max-w-md text-base leading-relaxed text-white/85 sm:text-lg">
                Join adidas GBS in Porto — where work meets Atlantic waves,
                European salaries meet Mediterranean prices, and your Monday
                morning starts with pastéis de nata.
              </p>
            </div>

            <div className="lg:justify-self-end lg:pb-1 lg:pr-24">
              <OffsetButton href="/" large>
                See opportunities
              </OffsetButton>
            </div>
          </div>

          <div className="space-y-3">
            <StatsBar />
            <p className="font-adihaus-regular text-center text-xs tracking-wide text-white/55 sm:text-sm">
              No relocation stress. No lonely start. Just your skills, our
              opportunities, and a city that feels like summer break — but pays
              like a career.
            </p>
          </div>
        </section>

        {/* ─── SOCIAL PROOF SECTION ─── */}
        <section className="relative bg-black/80 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl space-y-12 px-6 py-20 text-center sm:px-12">
            <FlagCarousel />
            <TestimonialCarousel />
          </div>
        </section>

        {/* ─── CHATBOT CTA BAR ─── */}
        <section className="relative bg-black py-12">
          <ChatbotBar />
        </section>

        {/* ═══════════════ STUDENT AMBASSADOR PROGRAM ═══════════════ */}
        <div className="relative bg-black">
          {/* Intro */}
          <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-12">
            <Eyebrow className="text-center">Student Ambassador Program</Eyebrow>
            <h2 className="font-adineue-bold mt-8 max-w-3xl text-4xl uppercase leading-[1.05] tracking-tight sm:text-6xl">
              You won&rsquo;t just wear
              <br />
              the brand.
              <br />
              You&rsquo;ll build it.
            </h2>
            <p className="font-adihaus-regular mt-8 max-w-2xl text-lg leading-relaxed text-white/90">
              We aren&rsquo;t looking for promoters. We&rsquo;re looking for
              Creators, social connectors who serve as a human bridge between
              adidas Porto and the next generation of talent. A high-impact,
              flexible partnership built around your development and your career.
            </p>
          </section>

          {/* Your mission */}
          <section className="mx-auto max-w-6xl px-6 pb-20 sm:px-12">
            <Eyebrow className="text-center">Your Mission</Eyebrow>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {missions.map((m) => (
                <div
                  key={m.n}
                  className={`rounded-none border border-white/15 bg-white/[0.02] p-8 transition-colors hover:border-white/40 hover:bg-white/[0.04] ${
                    m.n === "05" ? "md:col-span-2" : ""
                  }`}
                >
                  <p className="font-adihaus-bold text-sm tracking-wide text-white/40">{m.n}</p>
                  <h3 className="font-adihaus-bold mt-6 text-lg uppercase tracking-wide">
                    {m.title}
                  </h3>
                  <p className="font-adihaus-regular mt-4 text-base leading-relaxed text-white/90">
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Why should you apply */}
          <section className="mx-auto max-w-6xl px-6 pb-20 sm:px-12">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <h2 className="font-adineue-bold max-w-lg text-4xl uppercase leading-[1.05] tracking-tight sm:text-6xl">
                Why should
                <br />
                you apply?
              </h2>
              <p className="font-adihaus-regular max-w-xs text-right text-base leading-relaxed text-white/40">
                We&rsquo;ve modeled our rewards after the best in the industry to
                ensure your time is valued.
              </p>
            </div>

            <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {perks.map((p) => (
                <div
                  key={p.title}
                  className="lg:border-l lg:border-white/15 lg:pl-8 lg:[&:nth-child(3n+1)]:border-l-0 lg:[&:nth-child(3n+1)]:pl-0"
                >
                  <Eyebrow>{p.eyebrow}</Eyebrow>
                  <h3 className="font-adihaus-bold mt-4 text-base uppercase tracking-wide">
                    {p.title}
                  </h3>
                  <p className="font-adihaus-regular mt-4 text-base leading-relaxed text-white/90">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Who are we looking for + application process */}
          <section className="mx-auto max-w-6xl px-6 pb-20 sm:px-12">
            <div className="grid gap-16 lg:grid-cols-2">
              {/* Left — criteria */}
              <div>
                <h2 className="font-adineue-bold text-4xl uppercase leading-[1.05] tracking-tight sm:text-5xl">
                  Who are we
                  <br />
                  looking for?
                </h2>
                <div className="mt-12 space-y-8">
                  {criteria.map((c) => (
                    <div key={c.title} className="border-t border-white/15 pt-6">
                      <h3 className="font-adihaus-bold text-base uppercase tracking-wide">
                        {c.title}
                      </h3>
                      <p className="font-adihaus-regular mt-3 text-base leading-relaxed text-white/90">
                        {c.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — timeline */}
              <div>
                <h2 className="font-adineue-bold text-4xl uppercase leading-[1.05] tracking-tight sm:text-5xl">
                  The
                  <br />
                  application
                  <br />
                  process
                </h2>
                <ol className="mt-12 space-y-0">
                  {processSteps.map((s, i) => (
                    <li key={s.n} className="relative flex gap-6 pb-10 last:pb-0">
                      {/* connector line */}
                      {i < processSteps.length - 1 && (
                        <span
                          aria-hidden
                          className="absolute left-[19px] top-10 h-full w-px bg-white/20"
                        />
                      )}
                      <span className="font-adihaus-bold relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center border border-white/40 bg-black text-sm">
                        {s.n}
                      </span>
                      <div>
                        <h3 className="font-adihaus-bold text-base uppercase tracking-wide">
                          {s.title}
                        </h3>
                        <p className="font-adihaus-regular mt-3 text-base leading-relaxed text-white/90">
                          {s.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          {/* Ready to lead the change */}
          <section className="mx-auto max-w-6xl px-6 pb-20 sm:px-12">
            <div className="flex flex-col items-start gap-10 md:flex-row md:items-center md:justify-between">
              <h2 className="font-adineue-bold text-4xl uppercase leading-[1.05] tracking-tight sm:text-6xl">
                Ready to lead
                <br />
                the change?
              </h2>
              <OffsetButton href="/" large>
                Apply now
              </OffsetButton>
            </div>
          </section>

          {/* Chatbot CTA bar (footer) */}
          <section className="bg-black pb-24">
            <ChatbotBar />
          </section>
        </div>
      </div>
    </div>
  );
}
