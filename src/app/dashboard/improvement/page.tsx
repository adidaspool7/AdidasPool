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

      {/* TODO:
          - Active tracks list (enrolled, in progress, completed)
          - Track detail view (14-day progress)
          - Reassessment trigger
          - Content management
      */}
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Improvement track management will be implemented here.
        </p>
      </div>
    </div>
  );
}
