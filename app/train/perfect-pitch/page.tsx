import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PerfectPitchPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <Target className="mx-auto size-10 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Perfect Pitch
        </h1>
        <p className="text-muted-foreground">
          Single-note identification is planned for v1.5.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/train">
          <ArrowLeft className="size-4" />
          Back to training
        </Link>
      </Button>
    </div>
  );
}
