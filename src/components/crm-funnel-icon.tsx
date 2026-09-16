import type { SVGProps } from "react";

export function CrmFunnelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="13" cy="12" r="5" />
      <circle cx="32" cy="9" r="6" />
      <circle cx="51" cy="12" r="5" />
      <path d="M4 26c0-5 4-9 9-9s9 4 9 9" />
      <path d="M20 25c0-6 5-10 12-10s12 4 12 10" />
      <path d="M42 26c0-5 4-9 9-9s9 4 9 9" />
      <path d="M9 33h46L38 49v9l-6 4-6-4v-9L9 33Z" />
    </svg>
  );
}