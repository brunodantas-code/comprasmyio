import { createContext } from "react";

/** Stable category identity, independent of its editable title and visual order. */
export const CdeCategoryNameContext = createContext<{
  number: string;
  title: string;
  onSave: (title: string) => Promise<boolean>;
} | null>(null);