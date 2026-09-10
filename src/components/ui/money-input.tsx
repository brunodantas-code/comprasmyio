import { useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";

function formatBRL(num: number): string {
  if (!isFinite(num) || num <= 0) return "";
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRL(text: string): string {
  const cleaned = text.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isFinite(n) ? String(n) : "0";
}

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> & {
  value: string;
  onChange: (v: string) => void;
};

export function MoneyInput({ value, onChange, onFocus, onBlur, className, ...props }: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const num = Number(value) || 0;
  const display = focused ? draft : (num > 0 ? formatBRL(num) : "");

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={display}
      className={className}
      onFocus={(e) => {
        setFocused(true);
        setDraft(num > 0 ? String(value).replace(".", ",") : "");
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d,.]/g, "");
        setDraft(raw);
        onChange(parseBRL(raw));
      }}
      {...props}
    />
  );
}
