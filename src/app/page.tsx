"use client";

import { useRouter } from "next/navigation";
import { Button } from "@client/components/ui/button";
import { useRole } from "@client/components/providers/role-provider";
import { Users, Briefcase, BarChart3, UserCircle, ShieldCheck } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { setRole } = useRole();

  const handleRoleSelect = (role: "candidate" | "hr") => {
    setRole(role);
    router.push("/dashboard");
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

        {/* Role Selection */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Select your role to continue
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant="outline"
              className="gap-3 h-14 px-8 text-base"
              onClick={() => handleRoleSelect("candidate")}
            >
              <UserCircle className="h-5 w-5" />
              I&apos;m a Candidate
            </Button>
            <Button
              size="lg"
              className="gap-3 h-14 px-8 text-base"
              onClick={() => handleRoleSelect("hr")}
            >
              <ShieldCheck className="h-5 w-5" />
              I&apos;m HR
            </Button>
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
              Recruitment funnel, language proficiency reports & scoring
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
