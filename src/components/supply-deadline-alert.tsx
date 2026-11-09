import { AlertTriangle, Bell } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SupplyDeadlineAlert({ message, warning = false }: { message: string; warning?: boolean }) {
  const Icon = warning ? Bell : AlertTriangle;
  return <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild><span tabIndex={0} aria-label={message} className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-destructive"><Icon className="h-4 w-4" /></span></TooltipTrigger><TooltipContent className="max-w-64 border border-border bg-muted text-foreground">{message}</TooltipContent></Tooltip></TooltipProvider>;
}