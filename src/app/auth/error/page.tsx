export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive text-lg font-bold mx-auto">
          !
        </div>
        <h1 className="text-xl font-bold">Authentication failed</h1>
        <p className="text-sm text-muted-foreground">
          Something went wrong during sign-in. Please try again.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to sign-in
        </a>
      </div>
    </div>
  );
}
