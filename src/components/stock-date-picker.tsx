import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function StockDatePicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const date = value ? parseISO(value) : undefined;
  return <Popover><PopoverTrigger asChild><Button type="button" variant="outline" aria-label={label} className="w-full justify-start"><CalendarIcon className="size-4" />{date ? format(date, 'dd/MM/yyyy') : 'Selecionar data'}</Button></PopoverTrigger><PopoverContent align="start" className="w-auto p-0"><Calendar mode="single" locale={ptBR} selected={date} onSelect={day => day && onChange(format(day, 'yyyy-MM-dd'))} className="pointer-events-auto p-3" /></PopoverContent></Popover>;
}