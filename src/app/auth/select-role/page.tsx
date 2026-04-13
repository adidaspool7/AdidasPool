"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserCircle, ShieldCheck } from "lucide-react";

export default function SelectRolePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRoleSelect = async (role: "candidate" | "hr") => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      data: { role },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Force a hard navigation so the middleware re-evaluates with updated metadata.
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold mx-auto">
            TI
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome</h1>
          <p className="text-sm text-muted-foreground">
            Select your role to set up your account
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive text-center">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleRoleSelect("candidate")}
            disabled={loading}
            className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center transition-colors hover:bg-accent hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserCircle className="h-10 w-10 text-emerald-500" />
            <div>
              <p className="font-semibold">Candidate</p>
              <p className="text-xs text-muted-foreground mt-1">
                Apply for positions and track assessments
              </p>
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect("hr")}
            disabled={loading}
            className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center transition-colors hover:bg-accent hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShieldCheck className="h-10 w-10 text-primary" />
            <div>
              <p className="font-semibold">HR Manager</p>
              <p className="text-xs text-muted-foreground mt-1">
                Manage candidates and run evaluations
              </p>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          This selection is permanent and tied to your Google account.
          Contact an admin if you need it changed.
        </p>
      </div>
    </div>
  );
}
