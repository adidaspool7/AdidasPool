"use client";

/**
 * Job Matching — landing page (HR only).
 *
 * Lists every job as a card. Picking a job sends HR to the dedicated
 * Fit-for-this-job ranking page (`/dashboard/jobs/[id]/match-candidates`).
 *
 * This page is intentionally job-centric: no candidate data is fetched
 * here. The Candidates page is the asset/talent-pool view; this is the
 * funnel/Fit view.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Skeleton } from "@client/components/ui/skeleton";
import { Badge } from "@client/components/ui/badge";
import { MultiSelectCombobox } from "@client/components/ui/multi-select-combobox";
import { formatCountryLabel } from "@client/lib/constants";
import { Search, Target, MapPin, Building2, ArrowRight } from "lucide-react";

interface JobOption {
  id: string;
  title: string;
  department: string | null;
  country: string | null;
}

export default function JobMatchingLandingPage() {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  // Multi-select filters — empty array means "no filter".
  const [countries_, setCountries] = useState<string[]>([]);
  const [departments_, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/jobs/picker")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data: { jobs: JobOption[] }) => {
        if (cancelled) return;
        setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load jobs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { countries, departments } = useMemo(() => {
    const cset = new Set<string>();
    const dset = new Set<string>();
    for (const j of jobs) {
      if (j.country) cset.add(j.country);
      if (j.department) dset.add(j.department);
    }
    return {
      countries: Array.from(cset).sort(),
      departments: Array.from(dset).sort(),
    };
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (countries_.length > 0 && (!j.country || !countries_.includes(j.country))) return false;
      if (departments_.length > 0 && (!j.department || !departments_.includes(j.department))) return false;
      if (q) {
        const hay = `${j.title} ${j.department ?? ""} ${j.country ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, search, countries_, departments_]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Job Matching</h1>
          <p className="text-sm text-muted-foreground">
            Pick a job to see ranked candidates by Fit-for-this-position.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, department or country…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <MultiSelectCombobox
            options={countries.map((c) => ({ value: c, label: formatCountryLabel(c) }))}
            selected={countries_}
            onChange={setCountries}
            placeholder="All locations"
            searchPlaceholder="Search country…"
            emptyMessage="No country found."
            widthClassName="w-full md:w-[220px]"
          />

          <MultiSelectCombobox
            options={departments.map((d) => ({ value: d, label: d }))}
            selected={departments_}
            onChange={setDepartments}
            placeholder="All departments"
            searchPlaceholder="Search department…"
            emptyMessage="No department found."
            widthClassName="w-full md:w-[240px]"
          />
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-rose-600">
            {error}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {jobs.length === 0
              ? "No jobs yet. Create one in Job Openings."
              : "No jobs match the current filters."}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {jobs.length} job{jobs.length === 1 ? "" : "s"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((j) => (
              <Link
                key={j.id}
                href={`/dashboard/jobs/${j.id}/match-candidates`}
                className="group"
              >
                <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/40">
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                        {j.title}
                      </h3>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2 text-xs">
                      {j.department && (
                        <Badge variant="outline" className="gap-1 font-normal">
                          <Building2 className="h-3 w-3" />
                          {j.department}
                        </Badge>
                      )}
                      {j.country && (
                        <Badge variant="outline" className="gap-1 font-normal">
                          <MapPin className="h-3 w-3" />
                          {j.country}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
