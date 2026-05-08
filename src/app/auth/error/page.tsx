type SearchParams = Promise<{
  reason?: string;
  registered?: string;
  attempted?: string;
}>;

const ROLE_LABEL: Record<string, string> = {
  hr: "HR",
  candidate: "Candidate",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { reason, registered, attempted } = await searchParams;

  const isMismatch = reason === "role_mismatch";
  const registeredLabel =
    registered && ROLE_LABEL[registered] ? ROLE_LABEL[registered] : null;
  const attemptedLabel =
    attempted && ROLE_LABEL[attempted] ? ROLE_LABEL[attempted] : null;

  const title = isMismatch
    ? "Wrong role for this account"
    : "Authentication failed";

  const description = isMismatch
    ? `This email is already registered${
        registeredLabel ? ` as ${registeredLabel}` : ""
      }. ${
        attemptedLabel ? `You tried to sign in as ${attemptedLabel}. ` : ""
      }An account can only be used with the role it was first registered with.`
    : "Something went wrong during sign-in. Please try again.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive text-lg font-bold mx-auto">
          !
        </div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        {isMismatch && registeredLabel ? (
          <p className="text-sm text-muted-foreground">
            Please return to the sign-in page and continue as{" "}
            <span className="font-medium text-foreground">
              {registeredLabel}
            </span>
            .
          </p>
        ) : null}
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
