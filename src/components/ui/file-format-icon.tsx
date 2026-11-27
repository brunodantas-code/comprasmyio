import type { SVGProps } from 'react';

/** Format identity is independent of the CDE button appearance. */
export function FileFormatIcon({ format, ...props }: SVGProps<SVGSVGElement> & { format: 'pdf' | 'excel' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" data-file-format={format} {...props}>
    <path d="M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8z" />
    <path d="M14 2v6h6" />
    {format === 'pdf' ? <text x="12" y="17" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7">PDF</text> : <><path d="M14 11h4v8h-4M14 15h4" /><path d="m7 11 5 8m0-8-5 8" strokeWidth="2" /></>}
  </svg>;
}