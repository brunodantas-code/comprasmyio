import type { CSSProperties } from "react";
import { CreditCard, Check, Utensils, Car, ParkingCircle, Route, Wrench, Cable, Briefcase, Cpu, AppWindow, Ellipsis, type LucideIcon } from "lucide-react";
export const categoryIcons: Record<string, LucideIcon> = { Utensils, Car, ParkingCircle, Route, Wrench, Cable, Briefcase, Cpu, AppWindow, Ellipsis };
export function SpendIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span className={`relative inline-flex ${className ?? ""}`} style={style}><CreditCard className="h-full w-full" /><Check className="absolute -bottom-0.5 -right-0.5 h-[35%] w-[35%]" /></span>;
}