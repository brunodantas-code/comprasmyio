import { cn } from "@/lib/utils";

/** Nuvem com código </> — ambiente de desenvolvimento colaborativo. */
export function CdeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cn("h-6 w-6", className)} aria-hidden="true">
      <path d="M7 18.5H6.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 17.5 8a4.75 4.75 0 0 1 .5 9.47V18.5" />
      <path d="m9.5 12.5-2 2 2 2M14.5 12.5l2 2-2 2M12.8 11.8l-1.6 5.4" />
    </svg>
  );
}
