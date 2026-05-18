import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ReviewSession } from "@/components/training/ReviewSession";
import { Button } from "@/components/ui/button";
import { isBackendConfigured } from "@/lib/backend-config";
import { getDueSrsItems, getSessionUser } from "@/lib/db/queries";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
      {children}
    </div>
  );
}

export default async function ReviewPage() {
  const header = (
    <header className="space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight">
        Spaced Review
      </h1>
      <p className="text-muted-foreground">
        Practise only what you&apos;re about to forget — scheduled by SM-2.
      </p>
    </header>
  );

  let body: React.ReactNode;

  if (!isBackendConfigured) {
    body = (
      <Notice>
        Connect Neon and Auth.js to enable spaced-repetition review.
      </Notice>
    );
  } else if (!(await getSessionUser())) {
    body = (
      <div className="space-y-3 text-center">
        <Notice>Sign in to build and review your repetition queue.</Notice>
        <Button asChild>
          <Link href="/sign-in?next=/train/review">Sign in</Link>
        </Button>
      </div>
    );
  } else {
    const items = await getDueSrsItems();
    body =
      items.length === 0 ? (
        <EmptyState
          title="Nothing due right now"
          description="Practise some exercises and your weak spots will queue up here for review."
          action={
            <Button asChild variant="outline">
              <Link href="/train">Go to training</Link>
            </Button>
          }
        />
      ) : (
        <ReviewSession items={items} />
      );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {header}
      {body}
    </div>
  );
}
