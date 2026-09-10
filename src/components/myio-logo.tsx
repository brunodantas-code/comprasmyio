import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** "light" = texto claro (fundo escuro), "dark" = texto escuro (fundo claro) */
  tone?: "light" | "dark";
};

/**
 * Logotipo Myio no padrão do site produto.myio.com.br:
 * "my" em fonte bold + "i" (pílula vertical com knob de slider) e "o" (anel)
 * desenhados como SVG em verde, alinhados à linha de base do texto.
 */
export function MyioLogo({ className, tone = "dark" }: Props) {
  return (
    <span
      className={cn(
        "select-none whitespace-nowrap font-extrabold leading-none tracking-tight",
        tone === "light" ? "text-white" : "text-foreground",
        className,
      )}
      style={{ fontFamily: '"Nunito", ui-sans-serif, system-ui, sans-serif' }}
    >
      my
      <svg
        viewBox="0 0 60 40"
        aria-hidden="true"
        focusable="false"
        style={{
          display: "inline-block",
          height: "0.5em",
          width: "auto",
          marginLeft: "0.02em",
          verticalAlign: "baseline",
        }}
      >
        {/* "i": pílula vertical arredondada (um pouco menor que o "o") */}
        <rect x="2" y="3" width="11" height="34" rx="5.5" fill="var(--myio-green)" />
        {/* knob do slider (mais claro, dentro do topo da pílula) */}
        <circle cx="7.5" cy="8" r="4" fill="oklch(0.9 0.13 155)" />
        {/* "o": anel de traço grosso, diâmetro externo = altura do viewBox */}
        <circle cx="40" cy="20" r="16.5" fill="none" stroke="var(--myio-green)" strokeWidth="7" />
      </svg>
      <span className={cn("ml-1.5 font-normal", tone === "light" ? "text-white" : "text-foreground")}>
        Supply
      </span>
    </span>
  );
}
