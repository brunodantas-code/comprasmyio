import { createFileRoute } from "@tanstack/react-router";

/**
 * Sincroniza o estado dos QR codes com a plataforma externa (programa principal).
 * Chamada automaticamente a cada 5 minutos via pg_cron, ou manualmente pelo botão
 * "Sincronizar agora" na aba Checar QR Code.
 *
 * Segurança: exige o header `apikey` com a chave pública do projeto (mesmo padrão
 * dos demais hooks de cron). A escrita no banco é feita com service role, mas os
 * dados gravados vêm exclusivamente da API externa autenticada por MYIO_PRODUCTS_API_KEY.
 */

const DEFAULT_BASE_URL = "https://project--efd53831-b793-40e3-a8ef-13627f3457db.lovable.app";
const MAX_ITEMS_PER_RUN = 1000;
const LEASE_MINUTES = 3;

type ExternalProduct = {
  code?: string;
  product_type?: string;
  location?: string;
  status?: string;
  technician?: string;
  nome_cliente?: string;
  client_name?: string;
  cliente?: string;
  client?: string;
  qr?: string;
  qr_value?: string;
  url?: string;
  link?: string;
  updated_at?: string;
};

type UnitMatch = {
  id: string;
  qr_value: string;
  material_id: string | null;
  material_name: string | null;
};

/** Extrai o código sequencial (ex.: 1_1_1_15) de um QR no formato https://produto.myio.com.br/<codigo>?... — também aceita o código puro. */
function extractCodeFromQr(qr: string): string | null {
  const m = /produto\.myio\.com\.br\/([^?\s#]+)/i.exec(qr);
  if (m?.[1]) return m[1];
  const t = qr.trim();
  return /^\d+(?:_\d+)+$/.test(t) ? t : null;
}

/** Normaliza um QR para comparação: remove query string e âncora. */
function normalizeQrKey(v: string): string {
  let s = v.trim();
  const h = s.indexOf("#");
  if (h >= 0) s = s.slice(0, h);
  const q = s.indexOf("?");
  if (q >= 0) s = s.slice(0, q);
  return s.trim();
}

/** Cauda do link da caixa (ex.: caixa-10/3) — a API externa pode reportar só o trecho final do link. */
function boxQrTail(v: string): string | null {
  const m = /(?:^|\/)(caixa-[^/\s]+\/[^/\s]+)$/i.exec(normalizeQrKey(v));
  return m?.[1] ?? null;
}

/** Nome do cliente informado pela plataforma externa (campo da API ou parâmetro `nome_cliente` do QR). */
function extractClientName(p: ExternalProduct): string | null {
  for (const v of [p.nome_cliente, p.client_name, p.cliente, p.client]) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const v of [p.qr, p.qr_value, p.url, p.link]) {
    if (typeof v !== "string" || !v.includes("nome_cliente=")) continue;
    try {
      const n = new URL(v).searchParams.get("nome_cliente");
      if (n?.trim()) return n.trim();
    } catch {
      // URL inválida: ignora
    }
  }
  return null;
}

/** Destino unit_products.moved_to equivalente ao local externo, quando o produto sai do cliente. */
const LOCATION_TO_MOVED_TO: Record<string, string> = {
  estoque: "almoxarifado",
  tecnico: "tecnico",
  perdido: "perdido",
  avariado: "avariado",
};

function authorize(request: Request): Response | null {
  const key = request.headers.get("apikey");
  const allowed = [process.env["SUPABASE_PUBLISHABLE_KEY"], process.env["SUPABASE_ANON_KEY"]].filter(Boolean);
  if (!key || !allowed.includes(key)) {
    return Response.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }
  return null;
}

async function runSync(): Promise<{ status: number; body: Record<string, unknown> }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Trava de execução única: se houver um lease válido, outra execução está em andamento.
  const { data: stateRow } = await supabaseAdmin
    .from("external_sync_state")
    .select("lease_until")
    .eq("id", true)
    .maybeSingle();
  if (stateRow?.lease_until && new Date(stateRow.lease_until).getTime() > Date.now()) {
    return { status: 200, body: { ok: true, skipped: true, reason: "Outra sincronização está em andamento." } };
  }
  await supabaseAdmin
    .from("external_sync_state")
    .update({ lease_until: new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString() })
    .eq("id", true);

  const finish = async (status: string, message: string, totalItems?: number) => {
    await supabaseAdmin
      .from("external_sync_state")
      .update({
        lease_until: null,
        last_run_at: new Date().toISOString(),
        last_status: status,
        last_message: message,
        ...(totalItems !== undefined ? { total_items: totalItems } : {}),
      })
      .eq("id", true);
  };

  try {
    const base = (process.env["MYIO_PRODUCTS_API_BASE"] || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const apiKey = process.env["MYIO_PRODUCTS_API_KEY"];
    if (!apiKey) {
      await finish("erro", "MYIO_PRODUCTS_API_KEY não configurada.");
      return { status: 500, body: { ok: false, error: "Chave da API externa não configurada." } };
    }

    const res = await fetch(`${base}/api/public/products`, { headers: { "x-api-key": apiKey } });
    if (!res.ok) {
      const text = await res.text();
      await finish("erro", `API externa respondeu ${res.status}: ${text.slice(0, 300)}`);
      return {
        status: 502,
        body: { ok: false, error: `Plataforma externa respondeu ${res.status}`, detail: text.slice(0, 500) },
      };
    }
    const json = (await res.json()) as { products?: ExternalProduct[] };
    const externalProducts = (Array.isArray(json.products) ? json.products : [])
      .filter((p) => !!p.code)
      .slice(0, MAX_ITEMS_PER_RUN);

    // Unidades homologadas internas, indexadas pelo código extraído do QR.
    const { data: units, error: unitsErr } = await supabaseAdmin
      .from("homologation_units")
      .select("id, qr_value, homologations(material_id, materials(name))");
    if (unitsErr) throw unitsErr;
    const unitByCode = new Map<string, UnitMatch>();
    for (const u of units ?? []) {
      const code = extractCodeFromQr(u.qr_value);
      if (!code || unitByCode.has(code)) continue;
      const hom = u.homologations as { material_id: string | null; materials: { name: string } | null } | null;
      unitByCode.set(code, {
        id: u.id,
        qr_value: u.qr_value,
        material_id: hom?.material_id ?? null,
        material_name: hom?.materials?.name ?? null,
      });
    }

    // REGRA DE OURO: só sincronizamos QR codes gerados pelo fluxo de homologação
    // (presentes em homologation_units). Qualquer código que exista apenas na
    // plataforma externa é ignorado — não entra no banco nem dispara correções.
    const knownCodes = new Set(unitByCode.keys());

    // CAIXAS: a caixa é a mestra do rastreio. Se a plataforma externa reportar
    // o QR da CAIXA (ex.: a caixa chegou ao cliente), todos os produtos dentro
    // dela herdam o mesmo local/status/técnico/cliente. Mapeia cada forma do
    // QR da caixa (link completo ou só a cauda caixa-N/seq) para os códigos
    // unitários do conteúdo.
    const { data: boxRows, error: boxErr } = await supabaseAdmin
      .from("homologations")
      .select("box_qr, homologation_units(qr_value)")
      .not("box_qr", "is", null);
    if (boxErr) throw boxErr;
    const unitCodesByBoxKey = new Map<string, string[]>();
    for (const b of boxRows ?? []) {
      if (!b.box_qr) continue;
      const codes = ((b.homologation_units ?? []) as { qr_value: string }[])
        .map((u) => extractCodeFromQr(u.qr_value))
        .filter((c): c is string => !!c);
      if (!codes.length) continue;
      unitCodesByBoxKey.set(normalizeQrKey(b.box_qr), codes);
      const tail = boxQrTail(b.box_qr);
      if (tail) unitCodesByBoxKey.set(tail, codes);
    }

    // Expande caixas em produtos unitários. Dois passes para garantir que o
    // estado da CAIXA sempre vence o reporte individual de uma unidade.
    const productByCode = new Map<string, ExternalProduct>();
    const direct: ExternalProduct[] = [];
    let ignored = 0;
    for (const p of externalProducts) {
      const raw = (p.code ?? "").trim();
      const keys = new Set<string>();
      if (raw) {
        keys.add(normalizeQrKey(raw));
        const t = boxQrTail(raw);
        if (t) keys.add(t);
      }
      for (const v of [p.qr, p.qr_value, p.url, p.link]) {
        if (typeof v !== "string" || !v.trim()) continue;
        keys.add(normalizeQrKey(v));
        const tv = boxQrTail(v);
        if (tv) keys.add(tv);
      }
      let boxCodes: string[] | undefined;
      for (const k of keys) {
        boxCodes = unitCodesByBoxKey.get(k);
        if (boxCodes) break;
      }
      if (boxCodes) {
        for (const c of boxCodes) productByCode.set(c, { ...p, code: c });
      } else if (knownCodes.has(raw)) {
        direct.push(p);
      } else {
        ignored++;
      }
    }
    for (const p of direct) {
      if (!productByCode.has(p.code!)) productByCode.set(p.code!, p);
    }
    const products = [...productByCode.values()];

    const { data: existing, error: statesErr } = await supabaseAdmin.from("external_product_states").select("*");
    if (statesErr) throw statesErr;
    const stateByCode = new Map((existing ?? []).map((s) => [s.code, s]));

    // Limpeza: remove do banco estados de QR codes que não pertencem à
    // homologação (sincronizados antes desta regra ou removidos do estoque).
    const staleCodes = (existing ?? []).map((s) => s.code).filter((c) => !knownCodes.has(c));
    if (staleCodes.length) {
      await supabaseAdmin.from("external_product_states").delete().in("code", staleCodes);
      for (const c of staleCodes) stateByCode.delete(c);
    }

    // Registros da sub-aba Cliente (unit_products), para localizar pelo código do QR
    // mesmo quando o rótulo salvo difere (com/sem parâmetros de query na URL).
    type UnitRow = {
      id: string;
      label: string | null;
      installed_at: string | null;
      project_id: string | null;
      moved_to: string | null;
      order_id: string | null;
    };
    const { data: unitRows, error: unitRowsErr } = await supabaseAdmin
      .from("unit_products")
      .select("id, label, installed_at, project_id, moved_to, order_id");
    if (unitRowsErr) throw unitRowsErr;
    const allUnitRows = (unitRows ?? []) as UnitRow[];
    const findUnitRow = (code: string, label: string, onlyActive: boolean): UnitRow | null => {
      const cands = onlyActive ? allUnitRows.filter((r) => !r.moved_to) : allUnitRows;
      return (
        cands.find((r) => r.label === label) ??
        cands.find((r) => (r.label ? extractCodeFromQr(r.label) === code : false)) ??
        cands.find((r) => !!(r.label && (r.label.includes(`/${code}?`) || r.label.endsWith(`/${code}`)))) ??
        null
      );
    };

    // --- Livro-razão por QR code -------------------------------------------
    // A plataforma externa é a FONTE DA VERDADE sobre onde cada produto está.
    // Se alguém retirar um produto do estoque sem dar baixa e instalar em
    // algum lugar, a API detecta e nós desfalcamos de onde ele constava:
    // estoque (movimentação de saída), técnico (baixa na lista do técnico) ou
    // cliente (saída da sub-aba Cliente).
    type QrLedger = {
      type: string;
      movementId: string;
      responsible: string | null;
      materialId: string | null;
      at: string;
    };
    const { data: qrMoves, error: qrMovesErr } = await supabaseAdmin
      .from("stock_movement_qrs")
      .select("qr_value, movement_id, stock_movements(id, type, material_id, responsible, created_at)");
    if (qrMovesErr) throw qrMovesErr;
    const ledgerByCode = new Map<string, QrLedger>();
    const codesByMovement = new Map<string, string[]>();
    for (const row of qrMoves ?? []) {
      const mv = row.stock_movements as {
        id: string;
        type: string;
        material_id: string | null;
        responsible: string | null;
        created_at: string;
      } | null;
      if (!mv || !row.qr_value) continue;
      const c = extractCodeFromQr(row.qr_value);
      if (!c) continue;
      const list = codesByMovement.get(mv.id) ?? [];
      list.push(c);
      codesByMovement.set(mv.id, list);
      const cur = ledgerByCode.get(c);
      if (!cur || mv.created_at > cur.at) {
        ledgerByCode.set(c, { type: mv.type, movementId: mv.id, responsible: mv.responsible, materialId: mv.material_id, at: mv.created_at });
      }
    }

    // QRs já baixados em pedidos Myio contam como "fora do estoque": a baixa do
    // pedido já descontou o estoque, então o sync NUNCA deve gerar uma segunda
    // saída para o mesmo QR (foi o que causou estoque negativo). Cada QR
    // homologado é descontado uma única vez.
    const { data: delQrs, error: dqErr } = await supabaseAdmin.from("myio_delivery_qrs").select("qr_value");
    if (dqErr) throw dqErr;
    for (const q of delQrs ?? []) {
      const c = q.qr_value ? extractCodeFromQr(q.qr_value) : null;
      if (!c || ledgerByCode.has(c)) continue;
      ledgerByCode.set(c, {
        type: "saida",
        movementId: "",
        responsible: null,
        materialId: unitByCode.get(c)?.material_id ?? null,
        at: "",
      });
    }

    // Saldo atual por material: trava para o sync nunca criar saída automática
    // que deixe o estoque negativo.
    const { data: allMoves, error: amErr } = await supabaseAdmin
      .from("stock_movements")
      .select("material_id, quantity, type");
    if (amErr) throw amErr;
    const saldoByMaterial = new Map<string, number>();
    for (const m of allMoves ?? []) {
      if (!m.material_id) continue;
      const cur = saldoByMaterial.get(m.material_id) ?? 0;
      saldoByMaterial.set(m.material_id, m.type === "saida" ? cur - Number(m.quantity) : cur + Number(m.quantity));
    }

    // Saídas com técnico responsável ainda não totalmente movimentadas.
    const { data: dispatchRows, error: dispErr } = await supabaseAdmin
      .from("stock_movements")
      .select("id, material_id, quantity, responsible")
      .eq("type", "saida")
      .not("responsible", "is", null);
    if (dispErr) throw dispErr;
    const { data: techMoveRows, error: tmErr } = await supabaseAdmin
      .from("technician_moves")
      .select("movement_id, quantity");
    if (tmErr) throw tmErr;
    const movedByDispatch = new Map<string, number>();
    for (const m of techMoveRows ?? []) {
      movedByDispatch.set(m.movement_id, (movedByDispatch.get(m.movement_id) ?? 0) + (m.quantity ?? 0));
    }
    type DispatchInfo = { id: string; materialId: string; technician: string; remaining: number };
    const openDispatchByCode = new Map<string, DispatchInfo>();
    for (const d of dispatchRows ?? []) {
      if (!d.responsible?.trim() || !d.material_id) continue;
      const remaining = d.quantity - (movedByDispatch.get(d.id) ?? 0);
      if (remaining <= 0) continue;
      const info: DispatchInfo = { id: d.id, materialId: d.material_id, technician: d.responsible.trim(), remaining };
      for (const c of codesByMovement.get(d.id) ?? []) {
        if (!openDispatchByCode.has(c)) openDispatchByCode.set(c, info);
      }
    }

    // QR codes vinculados a pedidos em transporte (baixas Myio). Usados para dar
    // baixa automática no transporte quando a plataforma externa confirma que o
    // produto chegou ao cliente — hoje o pedido continuaria "em_transito" mesmo
    // com o QR já na aba Cliente.
    const { data: transitOrders, error: toErr } = await supabaseAdmin
      .from("myio_orders")
      .select("id, client_name")
      .eq("status", "em_transito");
    if (toErr) throw toErr;
    const transitOrderIds = (transitOrders ?? []).map((o) => o.id);
    // Nome do cliente (projeto) por pedido — fallback quando a API externa não
    // informa o nome_cliente ao reportar a chegada da caixa/produto no cliente.
    const clientNameByOrder = new Map((transitOrders ?? []).map((o) => [o.id, o.client_name as string]));
    const clientNameByCode = new Map<string, string>();
    const qrsByTransitOrder = new Map<string, { code: string }[]>();
    if (transitOrderIds.length) {
      const { data: tDels, error: tdErr } = await supabaseAdmin
        .from("myio_item_deliveries")
        .select("id, order_id")
        .in("order_id", transitOrderIds);
      if (tdErr) throw tdErr;
      const delOrder = new Map((tDels ?? []).map((d) => [d.id, d.order_id]));
      const delIds = (tDels ?? []).map((d) => d.id);
      if (delIds.length) {
        const { data: tQrs, error: tqErr } = await supabaseAdmin
          .from("myio_delivery_qrs")
          .select("qr_value, delivery_id")
          .in("delivery_id", delIds);
        if (tqErr) throw tqErr;
        for (const q of tQrs ?? []) {
          const orderId = delOrder.get(q.delivery_id);
          const code = q.qr_value ? extractCodeFromQr(q.qr_value) : null;
          if (!orderId || !code) continue;
          const list = qrsByTransitOrder.get(orderId) ?? [];
          list.push({ code });
          qrsByTransitOrder.set(orderId, list);
        }
      }
    }

    let corrections = 0;

    /** Baixa automática de 1 unidade que saiu do estoque sem registro. */
    const registerExit = async (code: string, label: string, materialId: string, technician: string | null, reason: string) => {
      // Trava anti-negativo: se o saldo já está zerado, a divergência é de
      // rastreio (não de estoque) — registra o problema em vez de descontar.
      const saldo = saldoByMaterial.get(materialId) ?? 0;
      if (saldo <= 0) {
        problems.push(`${code}: saída automática ignorada (estoque já zerado)`);
        return;
      }
      const { data: mv, error } = await supabaseAdmin
        .from("stock_movements")
        .insert({ material_id: materialId, quantity: 1, type: "saida", responsible: technician, reason })
        .select("id")
        .single();
      if (error || !mv) {
        problems.push(`${code}: falha ao dar baixa automática (${error?.message ?? "erro"})`);
        return;
      }
      saldoByMaterial.set(materialId, saldo - 1);
      await supabaseAdmin.from("stock_movement_qrs").insert({
        movement_id: mv.id,
        qr_value: label,
        homologation_unit_id: unitByCode.get(code)?.id ?? null,
      });
      ledgerByCode.set(code, { type: "saida", movementId: mv.id, responsible: technician, materialId, at: now });
      if (technician) openDispatchByCode.set(code, { id: mv.id, materialId, technician, remaining: 1 });
      corrections++;
    };

    /** Estorno automático de 1 unidade que voltou ao estoque sem registro. */
    const registerReturn = async (code: string, label: string, materialId: string, reason: string) => {
      const { data: mv, error } = await supabaseAdmin
        .from("stock_movements")
        .insert({ material_id: materialId, quantity: 1, type: "entrada", reason })
        .select("id")
        .single();
      if (error || !mv) {
        problems.push(`${code}: falha ao estornar para o estoque (${error?.message ?? "erro"})`);
        return;
      }
      saldoByMaterial.set(materialId, (saldoByMaterial.get(materialId) ?? 0) + 1);
      await supabaseAdmin.from("stock_movement_qrs").insert({
        movement_id: mv.id,
        qr_value: label,
        homologation_unit_id: unitByCode.get(code)?.id ?? null,
      });
      ledgerByCode.set(code, { type: "entrada", movementId: mv.id, responsible: null, materialId, at: now });
      corrections++;
    };

    /** Zera 1 unidade da lista do técnico quando o produto foi para outro destino. */
    const clearTechnician = async (code: string, destination: "unidade" | "perdido" | "almoxarifado" | "avariado", projectId: string | null) => {
      const disp = openDispatchByCode.get(code);
      if (!disp || disp.remaining <= 0) return;
      const { error } = await supabaseAdmin.from("technician_moves").insert({
        movement_id: disp.id,
        material_id: disp.materialId,
        technician: disp.technician,
        destination,
        project_id: projectId,
        quantity: 1,
        notes: "Atualizado pela plataforma externa",
      });
      if (error) {
        problems.push(`${code}: falha ao baixar da lista do técnico (${error.message})`);
        return;
      }
      disp.remaining -= 1;
      if (disp.remaining <= 0) openDispatchByCode.delete(code);
      corrections++;
    };

    // Cache de projeto por nome de cliente (evita consultas repetidas na mesma execução).
    const projectByClient = new Map<string, string | null>();
    const findProjectForClient = async (clientName: string): Promise<string | null> => {
      const key = clientName.trim().toLowerCase();
      if (projectByClient.has(key)) return projectByClient.get(key) ?? null;
      let projectId: string | null = null;
      const { data: proj } = await supabaseAdmin
        .from("projects")
        .select("id")
        .ilike("client_name", clientName.trim())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      projectId = proj?.id ?? null;
      if (!projectId) {
        const { data: client } = await supabaseAdmin
          .from("clients")
          .select("id")
          .ilike("name", clientName.trim())
          .limit(1)
          .maybeSingle();
        if (client) {
          const { data: proj2 } = await supabaseAdmin
            .from("projects")
            .select("id")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          projectId = proj2?.id ?? null;
        }
      }
      projectByClient.set(key, projectId);
      return projectId;
    };

    const now = new Date().toISOString();
    let changed = 0;
    const problems: string[] = [];
    // Local real de cada código nesta execução (a plataforma externa é a fonte da verdade).
    const locByCode = new Map<string, string>();

    for (const p of products) {
      const code = p.code!;
      const location = (p.location || "estoque").trim().toLowerCase();
      locByCode.set(code, location);
      const status = p.status?.trim().toLowerCase() || null;
      const technician = p.technician?.trim() || null;
      const clientName = location === "cliente" ? extractClientName(p) : null;
      const unit = unitByCode.get(code);
      const prev = stateByCode.get(code);
      const hasChanged =
        !prev ||
        prev.location !== location ||
        (prev.status ?? null) !== status ||
        (prev.technician ?? null) !== technician ||
        (prev.client_name ?? null) !== clientName;

      const label = unit?.qr_value ?? prev?.qr_value ?? `https://produto.myio.com.br/${code}`;

      const { error: upStateErr } = await supabaseAdmin.from("external_product_states").upsert(
        {
          code,
          product_type: p.product_type ?? null,
          location,
          status,
          technician,
          client_name: clientName,
          qr_value: label,
          material_id: unit?.material_id ?? prev?.material_id ?? null,
          homologation_unit_id: unit?.id ?? prev?.homologation_unit_id ?? null,
          last_change_at: hasChanged ? now : prev!.last_change_at,
          payload: p,
        },
        { onConflict: "code" },
      );
      if (upStateErr) {
        problems.push(`${code}: ${upStateErr.message}`);
        continue;
      }
      // Produto fora do cliente não pode permanecer ativo na sub-aba Cliente:
      // marca a saída mesmo quando o estado externo não mudou nesta execução
      // (corrige registros que ficaram inconsistentes em sincronizações anteriores).
      const reconcileExitFromClient = async () => {
        const movedTo = LOCATION_TO_MOVED_TO[location];
        if (!movedTo) return;
        const target = findUnitRow(code, label, true);
        if (!target) return;
        await supabaseAdmin
          .from("unit_products")
          .update({
            moved_to: movedTo,
            moved_technician: location === "tecnico" ? technician : null,
            moved_at: now,
            move_notes: "Atualizado pela plataforma externa",
            client_name: null,
          })
          .eq("id", target.id);
        target.moved_to = movedTo;
      };

      // Reconciliação de posição: a plataforma externa manda no local real do
      // produto. Desfalca de onde ele constava (estoque/técnico) sempre que a
      // posição interna divergir — mesmo que a saída nunca tenha sido dada.
      const materialId = unit?.material_id ?? prev?.material_id ?? null;
      const reconcilePosition = async () => {
        if (!materialId) return;
        const ledgerEntry = ledgerByCode.get(code);
        const inStockNow = !ledgerEntry || ledgerEntry.type !== "saida";
        const LOCATION_PT: Record<string, string> = {
          cliente: "cliente",
          tecnico: "técnico",
          perdido: "perdido",
          avariado: "avariado",
        };

        if (location === "estoque") {
          // Voltou ao estoque sem registro: estorna a saída e limpa o técnico.
          if (!inStockNow) {
            await registerReturn(code, label, materialId, "Retorno ao estoque detectado pela plataforma externa");
          }
          await clearTechnician(code, "almoxarifado", null);
          return;
        }

        // Produto em campo: não pode constar em estoque.
        if (inStockNow) {
          const where =
            location === "cliente"
              ? `no cliente ${clientName ?? ""}`.trim()
              : location === "tecnico"
                ? `com o técnico ${technician ?? ""}`.trim()
                : `como ${LOCATION_PT[location] ?? location}`;
          await registerExit(
            code,
            label,
            materialId,
            location === "tecnico" ? technician : null,
            `Saída automática — plataforma externa detectou o produto ${where}`,
          );
        } else if (location === "tecnico" && technician) {
          // Já estava baixado: garante que a saída aponta para o técnico certo.
          const disp = openDispatchByCode.get(code);
          if (disp && disp.technician.toLowerCase() !== technician.toLowerCase()) {
            await supabaseAdmin.from("stock_movements").update({ responsible: technician }).eq("id", disp.id);
            disp.technician = technician;
            corrections++;
          } else if (!disp && ledgerEntry && ledgerEntry.movementId && !ledgerEntry.responsible) {
            await supabaseAdmin.from("stock_movements").update({ responsible: technician }).eq("id", ledgerEntry.movementId);
            ledgerEntry.responsible = technician;
            openDispatchByCode.set(code, { id: ledgerEntry.movementId, materialId, technician, remaining: 1 });
            corrections++;
          }
        }

        // Saiu da mão do técnico para outro destino: zera a lista dele.
        if (location !== "tecnico") {
          const DEST: Record<string, "unidade" | "perdido" | "avariado"> = {
            cliente: "unidade",
            perdido: "perdido",
            avariado: "avariado",
          };
          const dest = DEST[location];
          if (dest) {
            const projectId = location === "cliente" && clientName ? await findProjectForClient(clientName) : null;
            await clearTechnician(code, dest, projectId);
          }
        }
      };
      await reconcilePosition();

      if (!hasChanged) {
        if (location !== "cliente") await reconcileExitFromClient();
        continue;
      }
      changed++;

      // Cliente: reflete na aba Cliente (unit_products) se está instalado ou parado,
      // vinculando o nome do cliente e o projeto correspondente, quando existir.
      if (location === "cliente") {
        const projectId = clientName ? await findProjectForClient(clientName) : null;
        const target = findUnitRow(code, label, false);
        if (target) {
          await supabaseAdmin
            .from("unit_products")
            .update({
              status: status === "instalado" ? "instalado" : "parado",
              installed_at: status === "instalado" ? (target.installed_at ?? now) : null,
              moved_to: null,
              moved_at: null,
              moved_technician: null,
              move_notes: null,
              move_photo_url: null,
              client_name: clientName,
              project_id: target.project_id ?? projectId,
            })
            .eq("id", target.id);
          target.moved_to = null;
        } else {
          await supabaseAdmin.from("unit_products").insert({
            label,
            product: p.product_type ?? unit?.material_name ?? "Produto Myio",
            material_id: unit?.material_id ?? null,
            status: status === "instalado" ? "instalado" : "parado",
            installed_at: status === "instalado" ? now : null,
            client_name: clientName,
            project_id: projectId,
            notes: "Sincronizado da plataforma externa",
          });
        }
      } else {
        // Saiu do cliente: marca a saída para o novo local (técnico, estoque, perdido, avariado).
        await reconcileExitFromClient();
      }

      // Avariado: registra na aba Itens Avariados (uma vez por ocorrência aberta).
      if (location === "avariado") {
        const { data: openDamage } = await supabaseAdmin
          .from("damaged_items")
          .select("id")
          .eq("source", "Plataforma externa")
          .eq("source_detail", code)
          .eq("status", "avariado")
          .limit(1);
        if (!openDamage?.length) {
          await supabaseAdmin.from("damaged_items").insert({
            material_id: unit?.material_id ?? null,
            product: p.product_type ?? unit?.material_name ?? `Produto ${code}`,
            quantity: 1,
            source: "Plataforma externa",
            source_detail: code,
            reason: "Reportado como avariado pela plataforma externa",
            status: "avariado",
          });
        }
      }
      // Técnico / Perdido / Estoque: ficam registrados em external_product_states
      // e aparecem nas sub-abas Técnico, Perdido e no Checar QR Code.
    }

    // Baixa automática no transporte: quando TODOS os QR codes vinculados a um
    // pedido em transporte constam como "cliente" na plataforma externa, o pedido
    // é marcado como entregue e sai da sub-aba Transporte.
    for (const [orderId, qrList] of qrsByTransitOrder) {
      if (!qrList.length) continue;
      if (!qrList.every((q) => locByCode.get(q.code) === "cliente")) continue;
      const { error: orderErr } = await supabaseAdmin
        .from("myio_orders")
        .update({ status: "entregue_cliente" })
        .eq("id", orderId);
      if (orderErr) {
        problems.push(`pedido ${orderId}: falha ao concluir entrega (${orderErr.message})`);
        continue;
      }
      // Vincula ao pedido as unidades que o sync já criou na aba Cliente.
      const codes = new Set(qrList.map((q) => q.code));
      const linkIds = allUnitRows
        .filter((r) => !r.order_id && !r.moved_to && !!r.label && codes.has(extractCodeFromQr(r.label!) ?? ""))
        .map((r) => r.id);
      if (linkIds.length) {
        await supabaseAdmin.from("unit_products").update({ order_id: orderId }).in("id", linkIds);
      }
      corrections++;
    }

    const message = `${products.length} produto(s) consultados, ${changed} com mudança de estado, ${corrections} correção(ões) de posição.${ignored ? ` ${ignored} QR(s) externo(s) ignorado(s) (não gerados na homologação).` : ""}`;
    await finish(
      problems.length ? "parcial" : "ok",
      problems.length ? `${message} Erros: ${problems.slice(0, 3).join(" | ")}` : message,
      products.length,
    );
    return {
      status: 200,
      body: { ok: true, total: products.length, ignored, changed, corrections, problems: problems.slice(0, 10) },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish("erro", msg.slice(0, 500));
    return { status: 500, body: { ok: false, error: msg } };
  }
}

async function handle(request: Request): Promise<Response> {
  const denied = authorize(request);
  if (denied) return denied;
  const { status, body } = await runSync();
  return Response.json(body, { status });
}

export const Route = createFileRoute("/api/public/hooks/sync-product-status")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
