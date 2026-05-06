export default function ImprovementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Improvement Tracks
        </h1>
        <p className="text-muted-foreground">
          Manage borderline candidates' 2-week micro-learning tracks.
        </p>
      </div>

      <div className="rounded-lg border border-dashed bg-muted/40 p-8 text-center">
        <h2 className="text-lg font-semibold mb-2">Feature in development</h2>
        <p className="text-sm text-muted-foreground">
          The improvement track workflow has not been released yet. Tracks are
          recorded automatically when an assessment is failed and will appear
          here once the management UI is available.
        </p>
      </div>
    </div>
  );
}
