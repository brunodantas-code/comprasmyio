import { cn } from "@/lib/utils";

/** Célula em mitose (divisão): membrana estrangulada ao centro e dois núcleos. */
export function MytosisIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cn("h-6 w-6", className)} aria-hidden="true">
      <path d="M12 7.2C10.4 4.6 2.5 4.4 2.5 12s7.9 7.4 9.5 4.8c1.6 2.6 9.5 2.8 9.5-4.8S13.6 4.6 12 7.2Z" />
      <circle cx="7.3" cy="12" r="2" />
      <circle cx="16.7" cy="12" r="2" />
      <path d="M12 9.3v1.1M12 13.6v1.1" />
    </svg>
  );
}
