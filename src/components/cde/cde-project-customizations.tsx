import { useState, type ReactNode } from "react";
import { CdeCategoryHeader } from "./cde-category-header";
import { CdeProjectBudget } from "./cde-project-budget";
import { CdeProjectAppearance } from "./cde-project-appearance";
import { CdeSection } from "./cde-section";
import { CdeButton } from "./cde-button";

export function CdeProjectCustomizations({ number, handle, embedded = false, title = "Customizações do Projects" }: { number: number; handle?: ReactNode; embedded?: boolean; title?: string }) {
  const [open, setOpen] = useState(false);
  return <section className="cde-category-sections">
    {embedded ? <CdeSection title={title} hint="Orçamento, cores e numeração" marker={handle} actions={<CdeButton group="toggle" screen="components/cde/cde-project-customizations.tsx" aria-label={`${open ? "Recolher" : "Exibir"} ${title}`} title={`${open ? "Recolher" : "Exibir"} ${title}`} aria-expanded={open} onClick={() => setOpen(!open)} />}>
      {null}
    </CdeSection> : <CdeCategoryHeader number={number} handle={handle} title={title} hint="Orçamento, cores e numeração" open={open} onToggle={() => setOpen(!open)} />}
    <div hidden={!open} className="space-y-0">
      <div className="cde-shortcut-sections"><CdeProjectBudget number={number} embedded /></div>
      <div className="cde-shortcut-sections"><CdeProjectAppearance number={number} embedded /></div>
    </div>
  </section>;
}