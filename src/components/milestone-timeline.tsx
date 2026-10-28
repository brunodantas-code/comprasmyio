import { useState } from "react";
import { ArrowRightLeft, ChevronDown, ChevronUp, CirclePlus, Clock, MessageCircle, MessageCircleQuestion, MessageCircleReply, FilePenLine, Lightbulb } from "lucide-react";

export interface MilestoneEntry {
  id: string;
  created_at: string;
  text: string;
}

function iconFor(text: string) {
  if (text.includes("→")) return ArrowRightLeft;
  if (text.startsWith("Pergunta")) return MessageCircleQuestion;
  if (text.startsWith("Resposta")) return MessageCircleReply;
  if (text.startsWith("Mensagem")) return MessageCircle;
  if (text.startsWith("Observação")) return FilePenLine;
  if (text.startsWith("Solução")) return Lightbulb;
  if (text.includes("aberto")) return CirclePlus;
  return Clock;
}

export function MilestoneTimeline({ entries }: { entries: MilestoneEntry[] }) {
  const sorted = [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return (
    <ol className="relative ml-2 space-y-4 border-l-2 border-primary/20 py-1 pl-8">
      {sorted.map((entry) => {
        const Icon = iconFor(entry.text);
        const isStatusChange = entry.text.includes("→");
        return (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[45px] top-0 flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-background text-primary">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <EntryText text={entry.text} isStatusChange={isStatusChange} />
            <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString("pt-BR")}</p>
          </li>
        );
      })}
    </ol>
  );
}

function collapsedParts(text: string) {
  if (!/^(Observação|Pergunta|Resposta|Título|Solução)/.test(text)) return null;
  const lines = text.split("\n");
  const first = lines[0];
  const colon = first.indexOf(":");
  const title = colon >= 0 ? first.slice(0, colon) : first;
  const author = lines.length > 1 && lines[lines.length - 1].startsWith("por ") ? lines[lines.length - 1] : null;
  const summary = author ? `${title}\n${author}` : title;
  return summary.trim() === text.trim() ? null : summary;
}

function EntryText({ text, isStatusChange }: { text: string; isStatusChange: boolean }) {
  const [open, setOpen] = useState(false);
  const summary = collapsedParts(text);
  const cls = isStatusChange ? "whitespace-pre-wrap break-words text-sm font-medium" : "whitespace-pre-wrap break-words text-sm";
  if (!summary) return <p className={cls}>{text}</p>;
  const Arrow = open ? ChevronUp : ChevronDown;
  return (
    <div className="flex items-start gap-1">
      <p className={`${cls} flex-1`}>{open ? text : summary}</p>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? "Recolher" : "Exibir"} title={open ? "Recolher" : "Exibir"} className="shrink-0 text-primary hover:opacity-80">
        <Arrow className="h-4 w-4" />
      </button>
    </div>
  );
}
