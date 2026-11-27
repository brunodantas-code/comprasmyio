import { Fragment } from 'react';
import { ArrowUp, BookOpen, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { CdeNumber } from '@/components/cde/cde-button';
import { CdeMenuIcon } from '@/components/cde/menu-icon';
import { MENU_ITEMS } from '@/components/cde/main-menu-config';
import content from '@/content/manuals/erp.json';

const labels = [...content.labels].sort((a, b) => b.length - a.length);
const expression = new RegExp(`(${labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

function ManualText({ text }: { text: string }) {
  return text.split(expression).map((part, index) => {
    if (!labels.includes(part)) return <Fragment key={index}>{part}</Fragment>;
    const item = MENU_ITEMS.find(item => item.label === part || item.id === 'access' && part === 'Acessos');
    return <strong key={index}>{item && <CdeMenuIcon app="ERP" group="Menu superior" identity={item.id} fallback={item.icon} className="mr-1 inline size-3.5" />}{part}</strong>;
  });
}

export function ErpManualReader() {
  return <main className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6">
    <section className="erp-screen-block">
      <header className="border-b border-border p-4">
        <CardTitle className="flex items-center gap-2">ERP myio <LayoutGrid className="size-5" /></CardTitle>
        <CardDescription>Manual do Usuário · {content.subtitle}</CardDescription>
        <p className="mt-2 text-xs text-muted-foreground">V1 · {content.date}</p>
      </header>
      <div className="p-4 sm:p-6">
        <section aria-labelledby="manual-objective" className="max-w-4xl space-y-4 pb-6">
          <h1 id="manual-objective" className="cde-title">Objetivo</h1>
          {content.objetivo.map(text => <p key={text} className="leading-7"><ManualText text={text} /></p>)}
          <h2 className="cde-title">Para quem</h2><p className="leading-7">{content.para_quem}</p>
          <h2 className="cde-title">Como usar</h2><p className="leading-7"><ManualText text={content.como_usar} /></p>
        </section>
        <nav id="manual-summary" aria-label="Sumário do manual ERP" className="scroll-mt-36 border-y border-border py-6">
          <h2 className="cde-title mb-4 flex items-center gap-2"><BookOpen className="size-5" />Sumário</h2>
          <ol className="grid gap-2 md:grid-cols-2">{content.sections.map((section, i) => <li key={section.title}>
            <a href={`#manual-chapter-${i + 1}`} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
              <CdeNumber screen="components/erp-manual-reader.tsx">{i + 1}</CdeNumber><span className="text-sm">{section.title}</span>
            </a>
          </li>)}</ol>
        </nav>
        <div className="max-w-4xl">{content.sections.map((section, i) => <section key={section.title} id={`manual-chapter-${i + 1}`} className="scroll-mt-36 border-b border-border py-6">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="cde-title">{i + 1}. {section.title}</h2>
            <Button asChild variant="ghost" size="icon"><a href="#manual-summary" aria-label="Voltar ao Sumário" title="Sumário"><ArrowUp /></a></Button>
          </div>
          <div className="space-y-4">{section.blocks.map((block, j) => {
            if (block.kind === 'steps' && block.steps) return <ol key={j} className="list-decimal space-y-3 pl-6 leading-7">{block.steps.map((step, k) => <li key={k}><ManualText text={step} /></li>)}</ol>;
            if (block.kind === 'table' && block.rows && block.headers) return <div key={j} className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{block.headers.map(header => <th key={header} className="border-b border-border p-3 font-normal text-muted-foreground">{header}</th>)}</tr></thead><tbody>{block.rows.map((row, k) => <tr key={k}>{row.map((cell, l) => <td key={l} className="border-b border-border p-3 align-top leading-6"><ManualText text={cell} /></td>)}</tr>)}</tbody></table></div>;
            return block.text ? <p key={j} className={block.kind === 'note' ? 'border-l-2 border-primary bg-accent px-4 py-3 text-sm leading-6' : 'leading-7'}><ManualText text={block.text} /></p> : null;
          })}</div>
        </section>)}</div>
      </div>
    </section>
  </main>;
}