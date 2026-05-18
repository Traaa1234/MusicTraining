import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Track lessons, exercises, and your spaced-repetition queue.
        </p>
      </header>
      <Suspense>
        <AuthForm mode="sign-up" />
      </Suspense>
    </div>
  );
}
