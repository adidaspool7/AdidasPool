/**
 * Candidate Assessment Portal
 * 
 * This page is accessed via magic link (no login required).
 * URL: /assess/[token]
 * 
 * The candidate receives a unique, time-limited link to take their assessment.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";

export default async function AssessmentPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // TODO: 
  // 1. Validate magic token against database
  // 2. Check if token is expired
  // 3. Load assessment details (type, language, instructions)
  // 4. Render appropriate assessment interface:
  //    - Listening + written response
  //    - Speaking task (audio recording)
  //    - Reading aloud
  // 5. Handle submission

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            TI
          </div>
          <CardTitle className="text-2xl">Language Assessment</CardTitle>
          <p className="text-muted-foreground">
            Welcome! You have been invited to complete a language assessment.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-background p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Assessment token: <code className="text-xs">{token}</code>
            </p>
            <p className="mt-4 text-muted-foreground">
              The assessment interface will be implemented here. It will include
              audio recording, text input, and timed sections based on the
              assessment template.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
