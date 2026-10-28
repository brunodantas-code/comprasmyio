import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
  /** Extra text shown under the label and also searched (e.g. code, e-mail). */
  hint?: string;
  /** Extra hidden search terms. */
  keywords?: string;
  group?: string;
};

export const normalizeSearch = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** 0 = starts with, 1 = a word starts with, 2 = contains, -1 = no match. */
export function scoreOption(option: SearchableOption, query: string): number {
  const q = normalizeSearch(query);
  if (!q) return 0;
  const label = normalizeSearch(option.label);
  const extra = normalizeSearch(`${option.hint ?? ""} ${option.keywords ?? ""}`);
  if (label.startsWith(q)) return 0;
  if (label.split(/[\s\-—·/(),.]+/).some((w) => w.startsWith(q))) return 1;
  if (label.includes(q)) return 2;
  if (extra.includes(q)) return 3;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => `${label} ${extra}`.includes(w))) return 4;
  return -1;
}

export function filterOptions(options: SearchableOption[], query: string) {
  return options
    .map((option, index) => ({ option, index, score: scoreOption(option, query) }))
    .filter((r) => r.score >= 0)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((r) => r.option);
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  "aria-label"?: string;
  renderSelected?: (option: SearchableOption) => React.ReactNode;
};

export function SearchableSelect({ value, onChange, options, placeholder = "Digite para buscar...", emptyText = "Nenhum resultado", disabled, clearable = true, className, renderSelected, ...rest }: Props) {
  const selected = options.find((o) => o.value === value) ?? null;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const results = React.useMemo(() => filterOptions(options, typing ? query : ""), [options, query, typing]);

  React.useEffect(() => { setActive(0); }, [query, open]);
  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => { setOpen(false); setTyping(false); setQuery(""); };
  const pick = (option: SearchableOption) => { onChange(option.value); close(); inputRef.current?.blur(); };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); if (!open) setOpen(true); else setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (event.key === "Enter") { if (open && results[active]) { event.preventDefault(); pick(results[active]); } }
    else if (event.key === "Escape") { if (open) { event.preventDefault(); event.stopPropagation(); close(); } }
    else if (event.key === "Tab") close();
  };

  const showText = typing ? query : selected ? selected.label : "";
  let lastGroup: string | undefined;

  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <PopoverAnchor asChild>
        <div className={cn("relative flex h-9 w-full items-center rounded-md border border-input bg-transparent text-sm shadow-sm ring-offset-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary", disabled && "cursor-not-allowed opacity-50", className)}>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-label={rest["aria-label"]}
            disabled={disabled}
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            placeholder={selected && !typing ? undefined : placeholder}
            value={showText}
            onFocus={(e) => { setOpen(true); e.currentTarget.select(); }}
            onClick={() => setOpen(true)}
            onChange={(e) => { setTyping(true); setQuery(e.target.value); setOpen(true); }}
            onKeyDown={onKeyDown}
          />
          {selected && !typing && renderSelected && (
            <span className="pointer-events-none absolute inset-y-0 left-3 right-16 flex items-center truncate bg-background">{renderSelected(selected)}</span>
          )}
          {clearable && value && !disabled && (
            <button type="button" aria-label="Limpar" className="px-1 text-muted-foreground hover:text-foreground" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(""); setQuery(""); setTyping(false); inputRef.current?.focus(); }}>
              <X className="h-4 w-4" />
            </button>
          )}
          <button type="button" tabIndex={-1} aria-label="Abrir lista" disabled={disabled} className="px-2 text-muted-foreground" onMouseDown={(e) => e.preventDefault()} onClick={() => { if (open) close(); else { setOpen(true); inputRef.current?.focus(); } }}>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => { if (e.target instanceof Node && inputRef.current?.parentElement?.contains(e.target)) e.preventDefault(); }}
      >
        <div ref={listRef} role="listbox" className="max-h-80 overflow-y-auto overscroll-contain [scrollbar-width:thin]" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
          {results.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
          ) : results.map((option, index) => {
            const header = option.group && option.group !== lastGroup ? option.group : null;
            lastGroup = option.group;
            return (
              <React.Fragment key={option.value}>
                {header && !typing && <div className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">{header}</div>}
                <div
                  role="option"
                  data-index={index}
                  aria-selected={index === active}
                  className={cn("cursor-pointer rounded-sm px-2 py-1.5", index === active && "bg-dropdown-highlight text-dropdown-highlight-foreground", option.value === value && "font-medium")}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(option)}
                >
                  <div className="truncate">{option.label}</div>
                  {option.hint && <div className="truncate text-xs text-muted-foreground">{option.hint}</div>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
