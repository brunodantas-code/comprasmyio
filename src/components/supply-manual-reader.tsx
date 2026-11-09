import { CdeNumber } from "@/components/cde/cde-button";
import { Fragment } from 'react';
import { BookOpen, ClipboardList, ShoppingCart, Boxes, FolderKanban, Users, ArrowUp, Tag, Building2, Landmark, Briefcase, Bell, Layers3, Plus, ShieldCheck, CheckCircle2, ScrollText, DatabaseBackup } from 'lucide-react';
import content from '@/content/supply-manual.json';
import { Button } from '@/components/ui/button';

const icons: Record<string, typeof BookOpen> = { ClipboardList, ShoppingCart, Boxes, FolderKanban, Users, Tag, Building2, Landmark, Briefcase, Bell, Layers3, Plus, ShieldCheck, CheckCircle2, ScrollText, DatabaseBackup };
const labels = [...new Set(content.labels)].sort((a, b) => b.length - a.length);
const expression = new RegExp(`(${labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|→)`, 'g');

function ManualText({ text }: { text: string }) {
  return text.split(/(<b>.*?<\/b>)/g).map((part, index) => {
    const bold = part.startsWith('<b>');
    const value = part.replace(/<\/?b>/g, '');
    const nodes = value.split(expression).map((token, i) => {
      if (token === '→') return <span key={i} className="mx-1 text-primary">→</span>;
      if (!labels.includes(token)) return <Fragment key={i}>{token}</Fragment>;
      const iconName = (content.icons as Record<string, string>)[token];
      const Icon = icons[iconName];
      return <strong key={i} className="font-bold">{Icon && <Icon aria-hidden="true" className="mx-1 inline h-3.5 w-3.5 text-primary" />}{token}</strong>;
    });
    return bold ? <strong key={index}>{nodes}</strong> : <Fragment key={index}>{nodes}</Fragment>;
  });
}

export function SupplyManualReader() {
  return <main className="mx-auto max-w-7xl px-3 pb-20 pt-6 sm:px-6 sm:pt-8">
    <div className="mb-8 border-b border-border pb-6">
      <h1 className="flex items-center gap-3 text-2xl font-semibold">Supply <Boxes className="h-7 w-7" /></h1>
      <p className="mt-2 text-lg">Manual do Usuário</p>
      <p className="mt-1 text-sm text-muted-foreground">Solicitações, Aprovações, Fabricação, Estoque e Almoxarifado</p>
      <p className="mt-3 text-xs text-muted-foreground">V4 · 06.11.2026</p>
    </div>
    <section className="max-w-4xl space-y-5 pb-8" aria-labelledby="objetivo">
      <h2 id="objetivo" className="text-xl font-semibold">Objetivo</h2>
      <p className="leading-7">Centralizar solicitações de materiais, serviços, viagens, reembolsos e outras demandas, organizar as aprovações, acompanhar o atendimento até a conferência do recebimento e gerenciar a fabricação de dispositivos, o controle de estoque e o almoxarifado.</p>
      <p className="leading-7">O app conecta quem solicita, quem aprova e quem atende, preservando dados, documentos, conversas e histórico. Também mantém os cadastros, estoques e regras de acesso que sustentam essas rotinas.</p>
      <h2 className="text-xl font-semibold">Para quem</h2>
      <p>Solicitantes, aprovadores, Compras/Supply, equipes de Armazém/Fábrica e administradores.</p>
      <h2 className="text-xl font-semibold">Como usar</h2>
      <p>Escolha um assunto no <strong>Sumário</strong>. Os caminhos reproduzem os nomes dos menus; as ações disponíveis dependem do perfil de acesso.</p>
    </section>
    <nav id="sumario" aria-label="Sumário do manual" className="scroll-mt-32 border-y border-border py-7">
      <h2 className="mb-5 text-xl font-semibold">Sumário</h2>
      <ol className="grid gap-2 md:grid-cols-2">{content.sections.map((section, i) => <li key={section.title}>
        <a href={`#capitulo-${i + 1}`} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
          <CdeNumber screen="components/supply-manual-reader.tsx">{i + 1}</CdeNumber>
          <span className="text-sm">{section.title}</span>
        </a>
      </li>)}</ol>
    </nav>
    <div className="max-w-4xl">{content.sections.map((section, i) => <section id={`capitulo-${i + 1}`} key={section.title} className="scroll-mt-32 border-b border-border py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold">{i + 1}. {section.title}</h2>
        <Button asChild variant="ghost" size="sm" className="shrink-0 text-primary"><a href="#sumario"><ArrowUp className="h-4 w-4" />Sumário</a></Button>
      </div>
      <div className="space-y-5">{section.blocks.map((block, j) => {
        if (block.kind === 'h') return <h3 key={j} className="pt-2 text-lg font-semibold"><ManualText text={block.text ?? ''} /></h3>;
        if (block.kind === 'steps') return <ol key={j} className="list-decimal space-y-3 pl-6 leading-7">{block.steps?.map((step, k) => <li key={k} className="pl-2"><ManualText text={step} /></li>)}</ol>;
        if (block.kind === 'table') return <div key={j} className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{block.headers?.map(header => <th key={header} className="border-b border-border p-3 font-normal text-muted-foreground"><ManualText text={header} /></th>)}</tr></thead><tbody>{block.rows?.map((row, k) => <tr key={k}>{row.map((cell, l) => <td key={l} className="border-b border-border p-3 align-top leading-6"><ManualText text={cell} /></td>)}</tr>)}</tbody></table></div>;
        return <p key={j} className={block.kind === 'note' ? 'border-l-2 border-primary bg-accent px-4 py-3 text-sm leading-6' : 'leading-7'}><ManualText text={block.text ?? ''} /></p>;
      })}</div>
    </section>)}</div>
  </main>;
}