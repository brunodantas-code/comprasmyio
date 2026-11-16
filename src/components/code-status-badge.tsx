import { Badge } from "@/components/ui/badge";

const looks: Record<string, string> = {
  concluido: "border-transparent bg-code-completed text-code-completed-foreground",
  aberto: "border-transparent bg-destructive text-destructive-foreground",
  atendido: "border-transparent bg-code-attended text-code-attended-foreground",
  em_atendimento: "border-transparent bg-muted text-foreground",
};

export function CodeStatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge variant="outline" className={`whitespace-nowrap text-xs font-normal ${looks[status] ?? "bg-muted text-foreground"}`} title={status === "atendido" ? "Atendente informou a solução; aguarda confirmação do Solicitante." : undefined}>{label}</Badge>;
}