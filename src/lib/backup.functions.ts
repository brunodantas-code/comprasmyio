import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Exporta um snapshot completo do banco (todas as tabelas públicas) em JSON.
 * Somente administradores. Os arquivos dos buckets de storage não são incluídos —
 * apenas os caminhos/metadados registrados nas tabelas.
 */
export const exportDatabaseBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const TABLES = [
      "profiles",
      "user_roles",
      "clients",
      "projects",
      "purchase_orders",
      "order_logs",
      "materials",
      "product_boms",
      "stock_movements",
      "stock_movement_qrs",
      "purchase_demands",
      "production_demands",
      "homologations",
      "homologation_units",
      "assembly_releases",
      "assembly_release_items",
      "assembly_release_issues",
      "unit_products",
      "technician_moves",
      "damaged_items",
      "myio_orders",
      "myio_order_items",
      "myio_shipments",
      "myio_item_deliveries",
      "myio_delivery_qrs",
      "myio_product_images",
      "terceiros_materials",
      "terceiros_movements",
      "external_product_states",
      "external_sync_state",
    ] as const;

    const PAGE = 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tables: Record<string, any[]> = {};
    for (const table of TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select("*")
          .range(from, from + PAGE - 1);
        if (error) throw new Error(`Falha ao exportar a tabela ${table}: ${error.message}`);
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
      }
      tables[table] = rows;
    }

    return { generatedAt: new Date().toISOString(), tables };
  });
