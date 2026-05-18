// Shared empty-state block with a single consistent line-art illustration.
import type { ReactNode } from "react";

function EmptyIllustration() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="size-16 text-muted-foreground/45"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="32" cy="32" r="27" strokeDasharray="3 6" />
      <circle cx="25" cy="41" r="6.5" fill="currentColor" stroke="none" />
      <path d="M31.5 41 V21" />
      <path d="M31.5 21 q9 1.5 9 11" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <EmptyIllustration />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
