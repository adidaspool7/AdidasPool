"use client";

import { ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";

/**
 * Read-only summary of a job's parsed requirements. Placed above
 * Match Settings so HR can eyeball "what's the matcher scoring
 * against?" before tuning weights.
 */
export interface ParsedRequirementsCardProps {
  job: { sourceUrl: string | null };
  requirements: {
    fieldsOfWork?: string[];
    seniorityLevel?: string | null;
    minYearsInField?: number | null;
    requiredSkills?: string[];
    preferredSkills?: string[];
    requiredLanguages?: Array<{ language: string; cefr?: string | null }>;
    requiredEducationLevel?: string | null;
  };
}

export function ParsedRequirementsCard({
  job,
  requirements,
}: ParsedRequirementsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Parsed Job Requirements</CardTitle>
            <CardDescription>
              What the matcher is scoring against.
            </CardDescription>
          </div>
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 shrink-0"
            >
              View on adidas Careers <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm grid gap-3 md:grid-cols-2">
        <div>
          <div className="font-medium text-muted-foreground mb-1">
            Fields of Work
          </div>
          <div className="flex flex-wrap gap-1">
            {(requirements.fieldsOfWork ?? []).length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              requirements.fieldsOfWork!.map((f) => (
                <Badge key={f} variant="secondary">
                  {f}
                </Badge>
              ))
            )}
          </div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground mb-1">
            Seniority / Experience
          </div>
          <div>
            {requirements.seniorityLevel ?? "Any"} ·{" "}
            {requirements.minYearsInField != null
              ? `${requirements.minYearsInField}+ yrs in field`
              : "no minimum"}
          </div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground mb-1">
            Required Skills
          </div>
          <div className="flex flex-wrap gap-1">
            {(requirements.requiredSkills ?? []).length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              requirements.requiredSkills!.map((s) => (
                <Badge key={s} className="bg-blue-100 text-blue-800">
                  {s}
                </Badge>
              ))
            )}
          </div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground mb-1">
            Preferred Skills
          </div>
          <div className="flex flex-wrap gap-1">
            {(requirements.preferredSkills ?? []).length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              requirements.preferredSkills!.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))
            )}
          </div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground mb-1">Languages</div>
          <div className="flex flex-wrap gap-1">
            {(requirements.requiredLanguages ?? []).length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              requirements.requiredLanguages!.map((l) => (
                <Badge key={l.language} variant="secondary">
                  {l.language}
                  {l.cefr ? ` ${l.cefr}` : ""}
                </Badge>
              ))
            )}
          </div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground mb-1">Education</div>
          <div>{requirements.requiredEducationLevel ?? "—"}</div>
        </div>
      </CardContent>
    </Card>
  );
}
