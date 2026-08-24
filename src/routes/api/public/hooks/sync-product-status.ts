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

/** Extrai o código sequencial (ex.: 1_1_1_15) de um QR no formato https://produto.myio.com.br/<codigo>?... */
function extractCodeFromQr(qr: string): string | null {
  const m = /produto\.myio\.com\.br\/([^?\s#]+)/i.exec(qr);
  return m?.[1] ?? null;
}

/** Escapa curingas de LIKE/ILIKE (o código contém underscores). */
function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
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
    const products = (Array.isArray(json.products) ? json.products : [])
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

    const { data: existing, error: statesErr } = await supabaseAdmin.from("external_product_states").select("*");
    if (statesErr) throw statesErr;
    const stateByCode = new Map((existing ?? []).map((s) => [s.code, s]));

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

    for (const p of products) {
      const code = p.code!;
      const location = (p.location || "estoque").trim().toLowerCase();
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
      if (!hasChanged) continue;
      changed++;

      // Cliente: reflete na aba Cliente (unit_products) se está instalado ou parado.
      if (location === "cliente") {
        let { data: target } = await supabaseAdmin
          .from("unit_products")
          .select("id, installed_at")
          .eq("label", label)
          .maybeSingle();
        if (!target) {
          const { data: fuzzy } = await supabaseAdmin
            .from("unit_products")
            .select("id, installed_at")
            .ilike("label", `%/${escapeLike(code)}?%`)
            .limit(1)
            .maybeSingle();
          target = fuzzy;
        }
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
            })
            .eq("id", target.id);
        } else {
          await supabaseAdmin.from("unit_products").insert({
            label,
            product: p.product_type ?? unit?.material_name ?? "Produto Myio",
            material_id: unit?.material_id ?? null,
            status: status === "instalado" ? "instalado" : "parado",
            installed_at: status === "instalado" ? now : null,
            notes: "Sincronizado da plataforma externa",
          });
        }
      } else if (prev?.location === "cliente") {
        // Saiu do cliente: marca a saída para o novo local.
        const { data: target } = await supabaseAdmin
          .from("unit_products")
          .select("id")
          .eq("label", label)
          .is("moved_to", null)
          .maybeSingle();
        if (target) {
          await supabaseAdmin
            .from("unit_products")
            .update({
              moved_to: LOCATION_TO_MOVED_TO[location] ?? null,
              moved_technician: location === "tecnico" ? technician : null,
              moved_at: now,
              move_notes: "Atualizado pela plataforma externa",
            })
            .eq("id", target.id);
        }
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

    const message = `${products.length} produto(s) consultados, ${changed} com mudança de estado.`;
    await finish(
      problems.length ? "parcial" : "ok",
      problems.length ? `${message} Erros: ${problems.slice(0, 3).join(" | ")}` : message,
      products.length,
    );
    return { status: 200, body: { ok: true, total: products.length, changed, problems: problems.slice(0, 10) } };
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
