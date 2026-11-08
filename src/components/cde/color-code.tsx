import { useEffect, useState } from "react";

/** Resolve uma cor (inclusive var(--x)) para o código HEX exibido no CDE. */
export function useColorCode(color?: string) {
  const [code, setCode] = useState("");
  useEffect(() => {
    if (!color) return setCode("");
    const el = document.createElement("span");
    el.style.color = color; document.body.appendChild(el);
    const m = getComputedStyle(el).color.match(/[\d.]+/g); el.remove();
    if (!m) return setCode("");
    const [r, g, b, a] = m.map(Number);
    setCode(a === 0 ? "" : "#" + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("").toUpperCase());
  }, [color]);
  return code;
}

export function ColorCode({ color, className = "" }: { color?: string; className?: string }) {
  const code = useColorCode(color);
  return code ? <span className={`text-[0.6rem] leading-3 text-muted-foreground/70 ${className}`}>{code}</span> : null;
}
