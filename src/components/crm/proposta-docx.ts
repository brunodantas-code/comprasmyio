/** DOCX da proposta comercial no layout padrão MYIO (capa, apresentação, escopo, investimento, condições, aceite). Gerado no navegador. */
import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import logoAsset from "@/assets/myio-logo-dark.png.asset.json";
import { parcelasTexto, renderTemplate, type Condicoes, type ItemProposta } from "./proposta-logic";

const ROXO = "1A0E45"; const CINZA = "6A6A6A"; const LAVANDA = "EFEDF5"; const LINHA = "E3E3E3";
const MYIO_CNPJ = "27.222.019/0001-39"; const LARGURA = 9360; const FONT = "Nunito";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const qtd = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const dataBR = (d: string) => d.slice(0, 10).split("-").reverse().join("/");

export type DadosDocx = {
  numero: string; versao: number; data_proposta: string; template_codigo: string | null;
  template: { nome: string; introducao: string | null; escopo: string | null } | null;
  empresa: { nome_fantasia: string; razao_social: string | null; cnpj: string | null; cidade: string | null; uf: string | null };
  contato: { nome: string; cargo: string | null; email: string | null } | null;
  vendedor: { nome: string } | null; produto: string | null;
  condicoes: Condicoes; itens: ItemProposta[]; total_setup: number; total_mensal: number;
};

type Al = (typeof AlignmentType)[keyof typeof AlignmentType];
const semBorda = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const fina = { style: BorderStyle.SINGLE, size: 2, color: LINHA };
const corpo = (text: string, o: { bold?: boolean; size?: number; color?: string; before?: number; after?: number; align?: Al } = {}) =>
  new Paragraph({ alignment: o.align, spacing: { before: o.before, after: o.after ?? 120, line: 300 }, children: [new TextRun({ text, bold: o.bold, size: o.size ?? 22, color: o.color, font: FONT })] });
const titulo1 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 320, after: 160 }, children: [new TextRun({ text, bold: true, size: 27, color: ROXO, font: FONT })] });
const marcador = (text: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 90, line: 300 }, children: [new TextRun({ text, size: 22, font: FONT })] });
const tc = (text: string, o: { header?: boolean; total?: boolean; bold?: boolean; align?: Al; span?: number; color?: string } = {}) => new TableCell({
  columnSpan: o.span, borders: { top: fina, bottom: fina, left: semBorda, right: semBorda },
  shading: o.header ? { type: ShadingType.CLEAR, fill: ROXO, color: ROXO } : o.total ? { type: ShadingType.CLEAR, fill: LAVANDA, color: LAVANDA } : undefined,
  margins: { top: 90, bottom: 90, left: 120, right: 120 },
  children: [new Paragraph({ alignment: o.align, children: [new TextRun({ text, bold: o.bold || o.header || o.total, size: 20, color: o.header ? "FFFFFF" : o.color, font: FONT })] })],
});
const tabela = (larguras: number[], rows: TableRow[]) => new Table({ width: { size: LARGURA, type: WidthType.DXA }, columnWidths: larguras, borders: { top: semBorda, bottom: semBorda, left: semBorda, right: semBorda, insideHorizontal: semBorda, insideVertical: semBorda }, rows });
const R = AlignmentType.RIGHT; const C = AlignmentType.CENTER;

async function logo(): Promise<ArrayBuffer | null> {
  try { const r = await fetch(logoAsset.url); return r.ok ? await r.arrayBuffer() : null; } catch { return null; }
}

export async function gerarDocxProposta(d: DadosDocx): Promise<Blob> {
  const c = d.condicoes;
  const vars = { empresa: d.empresa.nome_fantasia, shopping: d.empresa.nome_fantasia, cidade: d.empresa.cidade, nome: d.contato?.nome ?? "", contrato_referencia: c.contrato_referencia ? `ao ${c.contrato_referencia}` : "ao contrato vigente" };
  const parc = parcelasTexto(d.total_setup, c.parcelas_setup, brl);
  const produto = d.produto ?? d.template?.nome ?? "MYIO";
  const totalUn = d.itens.reduce((s, i) => s + i.quantidade, 0);
  const comMensal = d.itens.filter((i) => i.preco_mensal_unit > 0);
  const img = await logo();

  // Escopo agrupado por ambiente (quando informado)
  const grupos = new Map<string, ItemProposta[]>();
  d.itens.forEach((i) => { const k = i.ambiente?.trim() || ""; grupos.set(k, [...(grupos.get(k) ?? []), i]); });
  const escopo: TableRow[] = [new TableRow({ tableHeader: true, children: [tc("Item", { header: true }), tc("Modelo", { header: true }), tc("Qtd", { header: true, align: C })] })];
  for (const [amb, its] of grupos) {
    if (amb) escopo.push(new TableRow({ children: [tc(amb, { span: 3, bold: true, color: ROXO })] }));
    its.forEach((i) => escopo.push(new TableRow({ children: [tc(i.nome), tc(i.modelo ?? "—"), tc(`${qtd(i.quantidade)} ${i.unidade}`, { align: C })] })));
  }
  escopo.push(new TableRow({ children: [tc("Total", { total: true }), tc("", { total: true }), tc(`${qtd(totalUn)} un.`, { total: true, align: C })] }));
  const ressalvas = d.itens.filter((i) => i.observacao?.trim());

  const invest: TableRow[] = [
    new TableRow({ tableHeader: true, children: [tc("Item", { header: true }), tc("Qtd", { header: true, align: C }), tc("Setup unit.", { header: true, align: R }), tc("Setup", { header: true, align: R }), tc("Mensal unit.", { header: true, align: R }), tc("Mensal", { header: true, align: R })] }),
    ...d.itens.map((i) => new TableRow({ children: [tc(i.modelo ? `${i.nome} — ${i.modelo}` : i.nome), tc(qtd(i.quantidade), { align: C }), tc(brl(i.preco_setup_unit), { align: R }), tc(brl(i.quantidade * i.preco_setup_unit), { align: R }), tc(i.preco_mensal_unit ? brl(i.preco_mensal_unit) : "—", { align: R }), tc(i.preco_mensal_unit ? brl(i.quantidade * i.preco_mensal_unit) : "—", { align: R })] })),
    new TableRow({ children: [tc(`Setup — ${parc}`, { total: true }), tc(qtd(totalUn), { total: true, align: C }), tc("", { total: true }), tc(brl(d.total_setup), { total: true, align: R }), tc("", { total: true, span: 2 })] }),
    new TableRow({ children: [tc("Assinatura mensal (PaaS)", { total: true }), tc(qtd(comMensal.reduce((s, i) => s + i.quantidade, 0)), { total: true, align: C }), tc("", { total: true, span: 3 }), tc(`${brl(d.total_mensal)}/mês`, { total: true, align: R })] }),
  ];
  const resumo = tabela([4000, 5360], [
    new TableRow({ tableHeader: true, children: [tc("Item", { header: true }), tc("Resumo", { header: true })] }),
    new TableRow({ children: [tc("Prazo contratual"), tc(`${c.contrato_meses} meses`)] }),
    new TableRow({ children: [tc("Setup"), tc(`${brl(d.total_setup)} em ${parc}`)] }),
    new TableRow({ children: [tc("Assinatura mensal (PaaS)"), tc(`${brl(d.total_mensal)}/mês`)] }),
    new TableRow({ children: [tc("Início do projeto"), tc("Assinatura do contrato + pagamento da 1ª parcela do setup")] }),
    new TableRow({ children: [tc("Validade da proposta"), tc(`${c.validade_dias} dias`)] }),
  ]);
  const condicoes = [
    `Vigência do contrato: ${c.contrato_meses} meses.`,
    `Setup faturado em ${c.parcelas_setup} parcela${c.parcelas_setup > 1 ? "s" : ""}, a primeira na assinatura.`,
    "Mensalidade faturada a partir da ativação da plataforma.",
    "Os equipamentos permanecem de propriedade da MYIO Automação, cedidos em locação durante a vigência contratual.",
    "Valores não incluem impostos retidos na fonte nem custos de infraestrutura civil/elétrica do cliente, salvo quando listados.",
    `Validade desta proposta: ${c.validade_dias} dias.`,
    ...(c.observacoes ? [c.observacoes] : []),
  ];
  const empresaLinha = [d.empresa.razao_social, d.empresa.cnpj ? `CNPJ ${d.empresa.cnpj}` : null, [d.empresa.cidade, d.empresa.uf].filter(Boolean).join("/") || null].filter(Boolean).join(" · ");

  const capa = [
    ...(img ? [new Paragraph({ spacing: { before: 1200, after: 600 }, children: [new ImageRun({ type: "png", data: img, transformation: { width: 180, height: 60 } })] })] : [corpo("MYIO", { bold: true, size: 48, color: ROXO, before: 1200, after: 600 })]),
    corpo(d.template_codigo === "EXPANSAO" ? "PROPOSTA DE EXPANSÃO" : d.template_codigo === "REALOCACAO" ? "PROPOSTA DE REALOCAÇÃO" : "PROPOSTA COMERCIAL", { bold: true, size: 40, color: ROXO, after: 200 }),
    corpo(produto, { size: 28, color: CINZA, after: 600 }),
    corpo(d.empresa.nome_fantasia, { bold: true, size: 30, after: 80 }),
    ...(empresaLinha ? [corpo(empresaLinha, { color: CINZA, after: 400 })] : []),
    corpo(`Proposta ${d.numero}${d.versao > 1 ? ` · versão ${d.versao}` : ""}`, { after: 60 }),
    corpo(`Data: ${dataBR(d.data_proposta)}`, { after: 60 }),
    ...(d.contato ? [corpo(`A/C: ${d.contato.nome}${d.contato.cargo ? ` — ${d.contato.cargo}` : ""}`, { after: 60 })] : []),
    ...(d.vendedor ? [corpo(`Responsável MYIO: ${d.vendedor.nome}`, { after: 60 })] : []),
    new Paragraph({ pageBreakBefore: true, children: [] }),
  ];

  const doc = new Document({
    creator: "ERP myio · CRM", title: `Proposta ${d.numero}`,
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 1150, bottom: 1150, left: 1150, right: 1150 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: R, children: [new TextRun({ text: `${produto} · Proposta ${d.numero}${d.versao > 1 ? ` v${d.versao}` : ""}`, size: 16, color: CINZA, font: FONT })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: C, children: [new TextRun({ children: [`MYIO Automação · CNPJ ${MYIO_CNPJ} · Página `, PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: 16, color: CINZA, font: FONT })] })] }) },
      children: [
        ...capa,
        titulo1("1. Apresentação"),
        corpo(renderTemplate(d.template?.introducao, vars) || "A MYIO apresenta sua proposta comercial."),
        resumo,
        titulo1("2. Escopo"),
        ...(d.template?.escopo ? [corpo(renderTemplate(d.template.escopo, vars))] : []),
        tabela([4700, 2860, 1800], escopo),
        ...(ressalvas.length ? [corpo("Ressalvas técnicas", { bold: true, color: ROXO, before: 200, after: 60 }), ...ressalvas.map((i) => marcador(`${i.nome}: ${i.observacao}`))] : []),
        titulo1("3. Investimento"),
        tabela([3160, 900, 1300, 1400, 1300, 1300], invest),
        corpo("O setup inclui equipamentos, assembling, pré-configuração, supervisão técnica da instalação e comissionamento na plataforma. A assinatura mensal cobre plataforma, conectividade, suporte e garantia dos dispositivos durante a vigência.", { size: 19, color: CINZA, before: 120 }),
        titulo1("4. Condições comerciais"),
        ...condicoes.map(marcador),
        titulo1("5. Aceite"),
        corpo(`De acordo com os termos desta proposta, ${d.empresa.razao_social ?? d.empresa.nome_fantasia}${d.empresa.cnpj ? `, CNPJ ${d.empresa.cnpj}` : ""}.`),
        corpo("Nome: ____________________________________", { before: 480 }),
        corpo("Cargo: ____________________________________"),
        corpo("Assinatura: _______________________________"),
        corpo("Data: ____/____/________"),
      ],
    }],
  });
  return Packer.toBlob(doc);
}

export const nomeArquivoDocx = (d: Pick<DadosDocx, "numero" | "versao" | "empresa">) =>
  `Proposta-${d.numero}${d.versao > 1 ? `-v${d.versao}` : ""}-${d.empresa.nome_fantasia.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "_")}.docx`;
