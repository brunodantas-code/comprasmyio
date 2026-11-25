import type { CSSProperties } from "react";
import { Utensils, Car, ParkingCircle, Route, Fuel, Wrench, Cable, Briefcase, Cpu, AppWindow, Ellipsis, type LucideIcon } from "lucide-react";
export const categoryIcons: Record<string, LucideIcon> = { Utensils, Car, ParkingCircle, Route, Fuel, Wrench, Cable, Briefcase, Cpu, AppWindow, Ellipsis };
export function SpendIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true"><rect x={2} y={5} width={20} height={14} rx={2} /><path d="M2 10h20" /><path d="m10 14.5 1.6 1.6 2.8-3.1" strokeWidth={1.6} /></svg>;
}
export { Wallet as AdvanceIcon } from "lucide-react";
