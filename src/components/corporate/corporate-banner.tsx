import { Megaphone } from "lucide-react";
import { isMessageActive, useCorporateMessages } from "./corporate-messages";

/** Corporate messages on the main page: visible to every signed-in user, regardless of profile. */
export function CorporateBanner() {
  const { data } = useCorporateMessages();
  const active = (data ?? []).filter((m) => isMessageActive(m));
  if (!active.length) return null;
  return <section aria-label="Mensagens corporativas" className="space-y-2">
    {active.map((m) => <div key={m.id} className="flex items-start gap-3 rounded-xl border border-primary/40 bg-[var(--myio-green-tint)] px-4 py-3 text-sm text-foreground">
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="leading-5">{m.message}</p>
    </div>)}
  </section>;
}
