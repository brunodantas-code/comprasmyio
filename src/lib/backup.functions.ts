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
      "access_profile_definitions",
      "access_profile_permissions",
      "access_profile_request_types",
      "additional_step_types",
      "approval_rules",
      "approval_settings",
      "approval_steps",
      "profiles",
      "user_roles",
      "user_access_profiles",
      "user_additional_job_titles",
      "user_app_access",
      "user_deletion_requests",
      "user_menu_permissions",
      "user_operational_functions",
      "user_reminders",
      "user_request_type_permissions",
      "request_types",
      "role_hierarchy",
      "job_titles",
      "job_title_hierarchy",
      "operational_functions",
      "clients",
      "client_categories",
      "client_units",
      "projects",
      "cost_centers",
      "delivery_points",
      "purchase_orders",
      "purchase_order_items",
      "order_logs",
      "materials",
      "material_stock_types",
      "product_boms",
      "stock_destinations",
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
      "tool_assets",
      "tool_movements",
      "cash_flow_accounts",
      "cash_flow_bank_accounts",
      "cash_flow_budgets",
      "cash_flow_payable_logs",
      "cash_flow_payables",
      "cash_flow_reconciliations",
      "cash_flow_statement_imports",
      "cash_flow_transactions",
      "damage_reasons",
      "import_batches",
      "import_batch_items",
      "reminder_settings",
      "reminder_send_log",
      "development_tickets",
      "development_ticket_attachments",
      "development_ticket_logs",
      "development_ticket_messages",
      "erp_admins",
      "erp_apps",
      "external_product_states",
      "external_sync_state",
    ] as string[];

    const PAGE = 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tables: Record<string, any[]> = {};
    for (const table of TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabaseAdmin
          .from(table as never)
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
