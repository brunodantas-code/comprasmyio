import { useState, type ReactNode } from "react";
import { CdeCategoryHeader } from "./cde-category-header";
import { CdeProjectBudget } from "./cde-project-budget";
import { CdeProjectAppearance } from "./cde-project-appearance";

export function CdeProjectCustomizations({ number, handle }: { number: number; handle?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <section className="cde-category-sections">
    <CdeCategoryHeader number={number} handle={handle} title="Customizações do Projects" hint="Orçamento, cores e numeração" open={open} onToggle={() => setOpen(!open)} />
    <div hidden={!open} className="space-y-0">
      <div className="cde-shortcut-sections"><CdeProjectBudget number={number} embedded /></div>
      <div className="cde-shortcut-sections"><CdeProjectAppearance number={number} embedded /></div>
    </div>
  </section>;
}