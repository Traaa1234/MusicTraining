import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to sync your progress and review.
        </p>
      </header>
      <Suspense>
        <AuthForm mode="sign-in" />
      </Suspense>
    </div>
  );
}
