import { ArrowRightLeft, CirclePlus, Clock, MessageCircle, MessageCircleQuestion, MessageCircleReply, FilePenLine, Lightbulb } from "lucide-react";

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
            <p className={isStatusChange ? "whitespace-pre-wrap break-words text-sm font-medium" : "whitespace-pre-wrap break-words text-sm"}>{entry.text}</p>
            <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString("pt-BR")}</p>
          </li>
        );
      })}
    </ol>
  );
}
