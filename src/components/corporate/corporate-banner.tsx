import { Megaphone } from "lucide-react";
import { isMessageActive, useCorporateMessages } from "./corporate-messages";
import { MESSAGE_STYLE_DEFAULT, messageStyleCss, useMessageStyle, type MessageStyle } from "./message-style";

/** One message box; colours come from the CDE message_style choice. */
export function CorporateMessageBox({ text, style }: { text: string; style: MessageStyle }) {
  const css = messageStyleCss(style);
  return <div className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm" style={{ background: css.background, borderColor: css.borderColor, color: css.color }}>
    <Megaphone className="mt-0.5 h-4 w-4 shrink-0" style={{ color: css.symbol }} aria-hidden="true" />
    <p className="leading-5">{text}</p>
  </div>;
}

/** Corporate messages on the main page: visible to every signed-in user, regardless of profile. */
export function CorporateBanner() {
  const { data } = useCorporateMessages();
  const { data: style = MESSAGE_STYLE_DEFAULT } = useMessageStyle();
  const active = (data ?? []).filter((m) => isMessageActive(m));
  if (!active.length) return null;
  return <section aria-label="Mensagens corporativas" className="space-y-2">
    {active.map((m) => <CorporateMessageBox key={m.id} text={m.message} style={style} />)}
  </section>;
}
