import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — adidas Talent Intelligence Platform",
};

/**
 * Privacy / Cookie policy page.
 * Linked from the cookie-consent banner on the landing page.
 * Publicly accessible — no auth required.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b bg-card px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign-in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-12">
        {/* Heading */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-adihaus-bold text-3xl uppercase tracking-tight">
              Privacy Policy
            </h1>
          </div>
          <p className="font-adihaus-regular text-sm text-muted-foreground">
            Last updated: May 2026 &mdash; adidas Talent Intelligence &amp;
            Language Verification Platform (academic project)
          </p>
        </div>

        <Section title="1. Who we are">
          <P>
            This platform is part of the{" "}
            <strong>BlendEd / BIP project</strong>, developed in
            collaboration with adidas by a multidisciplinary team
            including developers, designers, researchers, and academic
            supervisors. The technical development was led by{" "}
            <strong>Fernando Ribeiro</strong> and{" "}
            <strong>Stratos</strong>. It demonstrates end-to-end
            AI-powered recruitment tooling and is{" "}
            <strong>not</strong> an official adidas product.
          </P>
          <P>
            <strong>Data controller:</strong> Fernando Ribeiro (project
            owner) — questions?{" "}
            <a
              href="mailto:fr.soul@gmail.com"
              className="underline underline-offset-2 hover:text-foreground"
            >
              fr.soul@gmail.com
            </a>
          </P>
          <P>
            This platform is intended for users aged{" "}
            <strong>18 or over</strong>. We do not knowingly collect
            personal data from minors. If you believe a minor has
            registered, please contact the data controller immediately.
          </P>
        </Section>

        <Section title="2. What personal data we collect">
          <P>
            When you sign in with Google we receive:
          </P>
          <Ul>
            <li>Your Google account email address</li>
            <li>Your display name</li>
            <li>Your Google profile photo URL</li>
          </Ul>
          <P>
            If you upload a CV as a candidate, the document is stored
            securely and its content is extracted by an AI service to
            populate your profile (work experience, education, languages,
            and skills). The raw file is kept in encrypted cloud storage.
          </P>
          <P>
            If you participate in an AI interview, your typed or spoken
            responses are sent to a language-model service for evaluation.
            The transcript and the evaluation result are stored and linked
            to your candidate profile.
          </P>
        </Section>

        <Section title="3. Why we collect it">
          <Ul>
            <li>
              <strong>Authentication</strong> — to verify your identity and
              determine whether you access the platform as a candidate or as
              an HR reviewer.
            </li>
            <li>
              <strong>Recruitment workflow</strong> — to match your profile
              against open positions, schedule assessments, and track the
              status of your application.
            </li>
            <li>
              <strong>Platform improvement</strong> — anonymised aggregate
              analytics are used to understand how features are used. No
              individual tracking profiles are built.
            </li>
          </Ul>
          <P>
            Legal basis (GDPR Art. 6): <em>Legitimate interest</em> for
            authentication and recruitment operations; <em>Consent</em> for
            optional analytics cookies (accepted via the cookie banner).
          </P>
          <P>
            <strong>Automated profiling (GDPR Art. 22):</strong> The
            platform uses AI models to parse CVs, compute match scores,
            and rank candidate profiles against job requirements. This
            automated scoring{" "}
            <em>assists</em> HR reviewers but does not constitute a
            final automated hiring decision — a human reviewer always
            makes the ultimate determination. You may request a manual
            review of any AI-generated score by contacting the data
            controller.
          </P>
        </Section>

        <Section title="4. Cookies and local storage">
          <P>
            We use the following cookies and browser storage entries:
          </P>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="font-adihaus-bold py-2 pr-4 uppercase tracking-wide text-xs">
                  Name
                </th>
                <th className="font-adihaus-bold py-2 pr-4 uppercase tracking-wide text-xs">
                  Type
                </th>
                <th className="font-adihaus-bold py-2 uppercase tracking-wide text-xs">
                  Purpose
                </th>
              </tr>
            </thead>
            <tbody className="font-adihaus-regular divide-y text-muted-foreground">
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">sb-*</td>
                <td className="py-2 pr-4">Session cookie</td>
                <td className="py-2">
                  Supabase auth session — strictly necessary. Expires when
                  the browser session ends (or after 1 week of inactivity).
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">pending_role</td>
                <td className="py-2 pr-4">Short-lived cookie</td>
                <td className="py-2">
                  Stores the selected role (candidate / HR) for 10 minutes
                  during the Google OAuth redirect. Deleted after sign-in.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">
                  adidas_cookie_consent
                </td>
                <td className="py-2 pr-4">localStorage</td>
                <td className="py-2">
                  Records whether you have accepted or declined the cookie
                  banner so we do not show it on every visit.
                </td>
              </tr>
            </tbody>
          </table>
          <P>
            We do <strong>not</strong> use advertising, tracking, or
            third-party analytics cookies.
          </P>
        </Section>

        <Section title="5. How long we keep your data">
          <Ul>
            <li>
              <strong>Auth account:</strong> kept for as long as your Google
              account is linked to this platform. You can revoke access at
              any time from your Google account security settings.
            </li>
            <li>
              <strong>CV files:</strong> stored for the duration of the
              academic project. Files will be deleted when the project
              concludes.
            </li>
            <li>
              <strong>Interview transcripts:</strong> retained for up to 12
              months after the session, then permanently deleted.
            </li>
            <li>
              <strong>Application records:</strong> retained for 24 months
              after the last activity, in line with standard HR data
              retention practice.
            </li>
          </Ul>
        </Section>

        <Section title="6. Who we share your data with">
          <P>
            We use the following third-party sub-processors. Data is shared
            only to the extent required to operate the platform:
          </P>
          <Ul>
            <li>
              <strong>Supabase</strong> (EU region) — authentication,
              database, and file storage.
            </li>
            <li>
              <strong>Groq / OpenAI</strong> — CV text and interview
              transcript analysis. Requests are processed under their
              enterprise data-processing agreements; data is not used to
              train their models.
            </li>
            <li>
              <strong>Vercel</strong> — hosting and edge network.
            </li>
            <li>
              <strong>Resend</strong> — transactional email delivery (e.g.
              outreach campaigns).
            </li>
          </Ul>
          <P>
            We do not sell personal data to any third party.
          </P>
        </Section>
        <Section title="7. International data transfers">
          <P>
            Some sub-processors listed in section 6 are based outside
            the European Economic Area (EEA). Specifically, Groq,
            OpenAI, Vercel, and Resend are US-based companies. Transfers
            to these processors are covered by Standard Contractual
            Clauses (SCCs) approved by the European Commission, or
            equivalent transfer mechanisms under GDPR Chapter V.
          </P>
          <P>
            Supabase stores data in an EU region; no EEA transfer occurs
            for database and file storage operations.
          </P>
        </Section>
        <Section title="8. Your rights (GDPR)">
          <P>
            Under the General Data Protection Regulation you have the right
            to:
          </P>
          <Ul>
            <li>
              <strong>Access</strong> the personal data we hold about you.
            </li>
            <li>
              <strong>Rectify</strong> inaccurate data (you can edit your
              profile from the candidate dashboard).
            </li>
            <li>
              <strong>Erase</strong>{" "}your data (&ldquo;right to be
              forgotten&rdquo;) — contact the data controller and your
              account and all associated data will be deleted within 30
              days.
            </li>
            <li>
              <strong>Restrict</strong> processing in certain circumstances.
            </li>
            <li>
              <strong>Data portability</strong> — you can export your
              candidate profile as a CSV from the platform settings.
            </li>
            <li>
              <strong>Object</strong> to processing based on legitimate
              interest.
            </li>
            <li>
              <strong>Not be subject to automated decisions</strong>{" "}
              with significant effects (Art. 22) — you may request human
              review of any AI-generated match or assessment score.
            </li>
            <li>
              <strong>Withdraw consent</strong> at any time (e.g. by
              clearing the <code>adidas_cookie_consent</code>{" "}key in your
              browser&apos;s local storage).
            </li>
          </Ul>
          <P>
            To exercise any of these rights, email the data controller at{" "}
            <a
              href="mailto:fr.soul@gmail.com"
              className="underline underline-offset-2 hover:text-foreground"
            >
              fr.soul@gmail.com
            </a>
            . You also have the right to lodge a complaint with your
            national data protection authority.
          </P>
        </Section>

        <Section title="9. Security">
          <P>
            All data in transit is encrypted with TLS 1.3. Data at rest is
            encrypted by Supabase (AES-256). Access to the database is
            limited to server-side processes using a service-role key that
            is never exposed to the browser. Row-level security policies are
            applied where appropriate.
          </P>          <P>
            In the event of a personal data breach, we will notify the
            relevant supervisory authority within 72 hours where required
            by GDPR Art. 33. Where the breach is likely to result in a
            high risk to individuals, affected users will be informed
            without undue delay (GDPR Art. 34).
          </P>        </Section>

        <Section title="10. Changes to this policy">
          <P>
            We may update this policy as the platform evolves. Material
            changes will be announced via a notice on the sign-in page. The
            &ldquo;Last updated&rdquo; date at the top of this page always
            reflects the latest revision.
          </P>
        </Section>

        <div className="border-t pt-6 text-center">
          <Link
            href="/"
            className="font-adihaus-regular text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            ← Return to sign-in
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ── Small prose helpers ─────────────────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-adihaus-bold text-lg uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-adihaus-regular text-sm leading-relaxed text-foreground/80">
      {children}
    </p>
  );
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="font-adihaus-regular ml-4 list-disc space-y-1 text-sm leading-relaxed text-foreground/80">
      {children}
    </ul>
  );
}
