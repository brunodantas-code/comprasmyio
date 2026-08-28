import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** "light" = texto claro (fundo escuro), "dark" = texto escuro (fundo claro) */
  tone?: "light" | "dark";
};

/**
 * Logotipo Myio: "my" na cor do texto + "io" em verde, em Nunito bold.
 */
export function MyioLogo({ className, tone = "dark" }: Props) {
  return (
    <span
      className={cn(
        "select-none font-extrabold leading-none tracking-tight",
        tone === "light" ? "text-white" : "text-foreground",
        className,
      )}
    >
      my<span className="text-[var(--myio-green)]">io</span>{" "}
      <span className={tone === "light" ? "text-white" : "text-foreground"}>
        Supply
      </span>
    </span>
  );
}
