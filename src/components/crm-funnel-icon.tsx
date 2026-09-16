import type { SVGProps } from "react";

export function CrmFunnelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="32" cy="14" r="8" />
      <circle cx="15" cy="18" r="6" />
      <circle cx="49" cy="18" r="6" />
      <path d="M7 31c0-6 4-10 9-10 3 0 6 2 8 5M57 31c0-6-4-10-9-10-3 0-6 2-8 5" />
      <path d="M17 27c2-5 7-8 15-8s13 3 15 8" />
      <path d="M12 29h40L38 45v10l-6 4-6-4V45L12 29Z" />
    </svg>
  );
}