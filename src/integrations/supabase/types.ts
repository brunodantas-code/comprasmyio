export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_profile_definitions: {
        Row: {
          active: boolean
          base_profile: Database["public"]["Enums"]["access_profile"]
          code: string
          created_at: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_profile: Database["public"]["Enums"]["access_profile"]
          code: string
          created_at?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_profile?: Database["public"]["Enums"]["access_profile"]
          code?: string
          created_at?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      access_profile_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          menu_key: string
          profile_code: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          menu_key: string
          profile_code: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          menu_key?: string
          profile_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_profile_permissions_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "access_profile_definitions"
            referencedColumns: ["code"]
          },
        ]
      }
      access_profile_request_types: {
        Row: {
          created_at: string
          profile_code: string
          request_type_code: string
        }
        Insert: {
          created_at?: string
          profile_code: string
          request_type_code: string
        }
        Update: {
          created_at?: string
          profile_code?: string
          request_type_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_profile_request_types_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "access_profile_definitions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "access_profile_request_types_request_type_code_fkey"
            columns: ["request_type_code"]
            isOneToOne: false
            referencedRelation: "request_types"
            referencedColumns: ["code"]
          },
        ]
      }
      additional_step_types: {
        Row: {
          active: boolean
          code: string
          created_at: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_rules: {
        Row: {
          active: boolean
          approver_id: string | null
          category: string | null
          created_at: string
          id: string
          name: string
          position: number
          request_types: string[]
          step_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          approver_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          request_types?: string[]
          step_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          approver_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          request_types?: string[]
          step_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_step_type_fkey"
            columns: ["step_type"]
            isOneToOne: false
            referencedRelation: "additional_step_types"
            referencedColumns: ["code"]
          },
        ]
      }
      approval_settings: {
        Row: {
          created_at: string
          dual_approval_enabled: boolean
          dual_approval_threshold: number
          id: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          dual_approval_enabled?: boolean
          dual_approval_threshold?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          dual_approval_enabled?: boolean
          dual_approval_threshold?: number
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      approval_steps: {
        Row: {
          approver_id: string | null
          comment: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          order_id: string
          role_label: string
          status: string
          step_index: number
        }
        Insert: {
          approver_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          order_id: string
          role_label: string
          status?: string
          step_index: number
        }
        Update: {
          approver_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          order_id?: string
          role_label?: string
          status?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_release_issues: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          material_id: string | null
          message: string
          release_id: string
          reported_by: string | null
          reported_quantity: number | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          material_id?: string | null
          message: string
          release_id: string
          reported_by?: string | null
          reported_quantity?: number | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          material_id?: string | null
          message?: string
          release_id?: string
          reported_by?: string | null
          reported_quantity?: number | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_release_issues_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "assembly_release_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_release_issues_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "assembly_release_issues_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_release_issues_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "assembly_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_release_items: {
        Row: {
          created_at: string
          id: string
          material_id: string
          quantity: number
          release_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          quantity: number
          release_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          quantity?: number
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_release_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "assembly_release_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_release_items_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "assembly_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_releases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          photo_url: string
          responsibles: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          photo_url: string
          responsibles?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          photo_url?: string
          responsibles?: string[]
        }
        Relationships: []
      }
      cash_flow_accounts: {
        Row: {
          accepts_entries: boolean
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          nature: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          accepts_entries?: boolean
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          nature: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          accepts_entries?: boolean
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          nature?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_bank_accounts: {
        Row: {
          account_number: string | null
          active: boolean
          agency: string | null
          bank_name: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          opening_balance: number
          opening_balance_date: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          active?: boolean
          agency?: string | null
          bank_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          opening_balance?: number
          opening_balance_date?: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          active?: boolean
          agency?: string | null
          bank_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          opening_balance?: number
          opening_balance_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_bank_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_budgets: {
        Row: {
          account_id: string
          april: number
          august: number
          created_at: string
          created_by: string | null
          december: number
          february: number
          fiscal_year: number
          id: string
          january: number
          july: number
          june: number
          march: number
          may: number
          november: number
          october: number
          september: number
          updated_at: string
        }
        Insert: {
          account_id: string
          april?: number
          august?: number
          created_at?: string
          created_by?: string | null
          december?: number
          february?: number
          fiscal_year: number
          id?: string
          january?: number
          july?: number
          june?: number
          march?: number
          may?: number
          november?: number
          october?: number
          september?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          april?: number
          august?: number
          created_at?: string
          created_by?: string | null
          december?: number
          february?: number
          fiscal_year?: number
          id?: string
          january?: number
          july?: number
          june?: number
          march?: number
          may?: number
          november?: number
          october?: number
          september?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_payable_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          payable_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          payable_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          payable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_payable_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_payable_logs_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_payables"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_payables: {
        Row: {
          account_id: string | null
          amount: number
          approval_number: string | null
          cash_period: string
          classified_at: string | null
          classified_by: string | null
          client_id: string | null
          competence_period: string
          cost_center_id: string | null
          created_at: string
          due_date: string | null
          fiscal_period: string
          id: string
          item_name: string
          paid_at: string | null
          project_id: string | null
          request_type: string
          requester_id: string
          source_order_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          approval_number?: string | null
          cash_period: string
          classified_at?: string | null
          classified_by?: string | null
          client_id?: string | null
          competence_period: string
          cost_center_id?: string | null
          created_at?: string
          due_date?: string | null
          fiscal_period: string
          id?: string
          item_name: string
          paid_at?: string | null
          project_id?: string | null
          request_type: string
          requester_id: string
          source_order_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          approval_number?: string | null
          cash_period?: string
          classified_at?: string | null
          classified_by?: string | null
          client_id?: string | null
          competence_period?: string
          cost_center_id?: string | null
          created_at?: string
          due_date?: string | null
          fiscal_period?: string
          id?: string
          item_name?: string
          paid_at?: string | null
          project_id?: string | null
          request_type?: string
          requester_id?: string
          source_order_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_payables_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_payables_classified_by_fkey"
            columns: ["classified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_payables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_payables_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_payables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_payables_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_payables_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: true
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_reconciliations: {
        Row: {
          id: string
          matched_amount: number
          matched_at: string
          matched_by: string | null
          payable_id: string
          transaction_id: string
        }
        Insert: {
          id?: string
          matched_amount: number
          matched_at?: string
          matched_by?: string | null
          payable_id: string
          transaction_id: string
        }
        Update: {
          id?: string
          matched_amount?: number
          matched_at?: string
          matched_by?: string | null
          payable_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_reconciliations_matched_by_fkey"
            columns: ["matched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_reconciliations_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_payables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_reconciliations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_statement_imports: {
        Row: {
          bank_account_id: string
          file_format: string
          file_hash: string
          file_name: string
          id: string
          imported_at: string
          imported_by: string | null
          row_count: number
        }
        Insert: {
          bank_account_id: string
          file_format: string
          file_hash: string
          file_name: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          row_count?: number
        }
        Update: {
          bank_account_id?: string
          file_format?: string
          file_hash?: string
          file_name?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          row_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_statement_imports_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_statement_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_transactions: {
        Row: {
          account_id: string | null
          amount: number
          bank_account_id: string
          cash_period: string
          competence_period: string
          created_at: string
          created_by: string | null
          dedupe_key: string
          description: string
          external_id: string | null
          fiscal_period: string
          id: string
          import_id: string | null
          posted_at: string
          reconciliation_status: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          bank_account_id: string
          cash_period: string
          competence_period: string
          created_at?: string
          created_by?: string | null
          dedupe_key: string
          description: string
          external_id?: string | null
          fiscal_period: string
          id?: string
          import_id?: string | null
          posted_at: string
          reconciliation_status?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          bank_account_id?: string
          cash_period?: string
          competence_period?: string
          created_at?: string
          created_by?: string | null
          dedupe_key?: string
          description?: string
          external_id?: string | null
          fiscal_period?: string
          id?: string
          import_id?: string | null
          posted_at?: string
          reconciliation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_statement_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          cnpj: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      damaged_items: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string | null
          photo_url: string | null
          product: string
          quantity: number
          reason: string
          recovered_at: string | null
          recovered_by: string | null
          recovered_to: string | null
          recovery_notes: string | null
          source: string
          source_detail: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string | null
          photo_url?: string | null
          product: string
          quantity?: number
          reason: string
          recovered_at?: string | null
          recovered_by?: string | null
          recovered_to?: string | null
          recovery_notes?: string | null
          source: string
          source_detail?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string | null
          photo_url?: string | null
          product?: string
          quantity?: number
          reason?: string
          recovered_at?: string | null
          recovered_by?: string | null
          recovered_to?: string | null
          recovery_notes?: string | null
          source?: string
          source_detail?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "damaged_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "damaged_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_admins: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_admins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_apps: {
        Row: {
          active: boolean
          created_at: string
          description: string
          key: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          key: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          key?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      external_product_states: {
        Row: {
          client_name: string | null
          code: string
          created_at: string
          homologation_unit_id: string | null
          id: string
          last_change_at: string
          location: string
          material_id: string | null
          payload: Json | null
          product_type: string | null
          qr_value: string | null
          status: string | null
          technician: string | null
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          code: string
          created_at?: string
          homologation_unit_id?: string | null
          id?: string
          last_change_at?: string
          location?: string
          material_id?: string | null
          payload?: Json | null
          product_type?: string | null
          qr_value?: string | null
          status?: string | null
          technician?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          code?: string
          created_at?: string
          homologation_unit_id?: string | null
          id?: string
          last_change_at?: string
          location?: string
          material_id?: string | null
          payload?: Json | null
          product_type?: string | null
          qr_value?: string | null
          status?: string | null
          technician?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_product_states_homologation_unit_id_fkey"
            columns: ["homologation_unit_id"]
            isOneToOne: false
            referencedRelation: "homologation_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_product_states_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "external_product_states_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      external_sync_state: {
        Row: {
          created_at: string
          id: boolean
          last_message: string | null
          last_run_at: string | null
          last_status: string | null
          lease_until: string | null
          total_items: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          last_message?: string | null
          last_run_at?: string | null
          last_status?: string | null
          lease_until?: string | null
          total_items?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          last_message?: string | null
          last_run_at?: string | null
          last_status?: string | null
          lease_until?: string | null
          total_items?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      homologation_units: {
        Row: {
          created_at: string
          homologation_id: string
          id: string
          position: number
          qr_value: string
        }
        Insert: {
          created_at?: string
          homologation_id: string
          id?: string
          position: number
          qr_value: string
        }
        Update: {
          created_at?: string
          homologation_id?: string
          id?: string
          position?: number
          qr_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "homologation_units_homologation_id_fkey"
            columns: ["homologation_id"]
            isOneToOne: false
            referencedRelation: "homologations"
            referencedColumns: ["id"]
          },
        ]
      }
      homologations: {
        Row: {
          box_qr: string | null
          box_size: number
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          notes: string | null
          release_id: string
          responsible_id: string | null
        }
        Insert: {
          box_qr?: string | null
          box_size: number
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          notes?: string | null
          release_id: string
          responsible_id?: string | null
        }
        Update: {
          box_qr?: string | null
          box_size?: number
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          notes?: string | null
          release_id?: string
          responsible_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homologations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "homologations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homologations_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "assembly_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batch_items: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          item_name: string
          material_id: string | null
          quantity: number
          source: string
          terceiros_material_id: string | null
          tool_asset_id: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          item_name: string
          material_id?: string | null
          quantity?: number
          source: string
          terceiros_material_id?: string | null
          tool_asset_id?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          item_name?: string
          material_id?: string | null
          quantity?: number
          source?: string
          terceiros_material_id?: string | null
          tool_asset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batch_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "import_batch_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batch_items_terceiros_material_id_fkey"
            columns: ["terceiros_material_id"]
            isOneToOne: false
            referencedRelation: "terceiros_material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "import_batch_items_terceiros_material_id_fkey"
            columns: ["terceiros_material_id"]
            isOneToOne: false
            referencedRelation: "terceiros_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batch_items_tool_asset_id_fkey"
            columns: ["tool_asset_id"]
            isOneToOne: false
            referencedRelation: "tool_asset_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "import_batch_items_tool_asset_id_fkey"
            columns: ["tool_asset_id"]
            isOneToOne: false
            referencedRelation: "tool_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          attachments: Json
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: []
      }
      job_title_hierarchy: {
        Row: {
          approver_job_title_id: string | null
          created_at: string
          job_title_id: string
          updated_at: string
        }
        Insert: {
          approver_job_title_id?: string | null
          created_at?: string
          job_title_id: string
          updated_at?: string
        }
        Update: {
          approver_job_title_id?: string | null
          created_at?: string
          job_title_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_title_hierarchy_approver_job_title_id_fkey"
            columns: ["approver_job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_title_hierarchy_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: true
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_titles: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          short_name: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          short_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_manufactured: boolean
          is_product: boolean
          link: string | null
          location: string
          loss_percent: number
          lot_quantity: number | null
          manufacturer_code: string | null
          myio_code: string | null
          name: string
          photo_url: string | null
          purchase_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_manufactured?: boolean
          is_product?: boolean
          link?: string | null
          location?: string
          loss_percent?: number
          lot_quantity?: number | null
          manufacturer_code?: string | null
          myio_code?: string | null
          name: string
          photo_url?: string | null
          purchase_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_manufactured?: boolean
          is_product?: boolean
          link?: string | null
          location?: string
          loss_percent?: number
          lot_quantity?: number | null
          manufacturer_code?: string | null
          myio_code?: string | null
          name?: string
          photo_url?: string | null
          purchase_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      myio_delivery_qrs: {
        Row: {
          box_qr: string | null
          created_at: string
          created_by: string | null
          delivery_id: string
          homologation_unit_id: string | null
          id: string
          order_item_id: string | null
          qr_value: string
        }
        Insert: {
          box_qr?: string | null
          created_at?: string
          created_by?: string | null
          delivery_id: string
          homologation_unit_id?: string | null
          id?: string
          order_item_id?: string | null
          qr_value: string
        }
        Update: {
          box_qr?: string | null
          created_at?: string
          created_by?: string | null
          delivery_id?: string
          homologation_unit_id?: string | null
          id?: string
          order_item_id?: string | null
          qr_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "myio_delivery_qrs_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "myio_item_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "myio_delivery_qrs_homologation_unit_id_fkey"
            columns: ["homologation_unit_id"]
            isOneToOne: false
            referencedRelation: "homologation_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "myio_delivery_qrs_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "myio_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      myio_item_deliveries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          order_id: string
          order_item_id: string
          photo_url: string
          product: string
          quantity: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id: string
          order_item_id: string
          photo_url: string
          product: string
          quantity?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string
          order_item_id?: string
          photo_url?: string
          product?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "myio_item_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "myio_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "myio_item_deliveries_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "myio_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      myio_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "myio_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "myio_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      myio_orders: {
        Row: {
          client_id: string | null
          client_name: string
          client_request_reason: string | null
          created_at: string
          created_by: string | null
          delivery_date: string
          id: string
          is_replacement: boolean
          notes: string | null
          project_id: string | null
          purchase_order_id: string | null
          request_group_id: string | null
          status: Database["public"]["Enums"]["myio_order_status"]
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string
          client_request_reason?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date: string
          id?: string
          is_replacement?: boolean
          notes?: string | null
          project_id?: string | null
          purchase_order_id?: string | null
          request_group_id?: string | null
          status?: Database["public"]["Enums"]["myio_order_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          client_request_reason?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          id?: string
          is_replacement?: boolean
          notes?: string | null
          project_id?: string | null
          purchase_order_id?: string | null
          request_group_id?: string | null
          status?: Database["public"]["Enums"]["myio_order_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "myio_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "myio_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "myio_orders_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: true
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      myio_product_images: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_url: string
          product: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
          product: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
          product?: string
          updated_at?: string
        }
        Relationships: []
      }
      myio_shipments: {
        Row: {
          address: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          proof_url: string
          responsible: string
          shipping_method: string
          tracking_code: string
        }
        Insert: {
          address: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          proof_url: string
          responsible: string
          shipping_method: string
          tracking_code: string
        }
        Update: {
          address?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          proof_url?: string
          responsible?: string
          shipping_method?: string
          tracking_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "myio_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "myio_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          order_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          order_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_boms: {
        Row: {
          component_material_id: string
          created_at: string
          id: string
          product_material_id: string
          quantity: number
        }
        Insert: {
          component_material_id: string
          created_at?: string
          id?: string
          product_material_id: string
          quantity: number
        }
        Update: {
          component_material_id?: string
          created_at?: string
          id?: string
          product_material_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_boms_component_material_id_fkey"
            columns: ["component_material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "product_boms_component_material_id_fkey"
            columns: ["component_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_boms_product_material_id_fkey"
            columns: ["product_material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "product_boms_product_material_id_fkey"
            columns: ["product_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      production_demands: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          order_id: string | null
          order_item_id: string | null
          product: string
          quantity: number
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          product: string
          quantity: number
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          product?: string
          quantity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_demands_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "myio_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_level: string | null
          approval_limit: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          device_approval_limit: number
          device_tier2_limit: number
          device_tier3_limit: number
          email: string | null
          full_name: string
          id: string
          job_title_id: string | null
          manager_id: string | null
          tier2_limit: number
          tier3_limit: number
        }
        Insert: {
          approval_level?: string | null
          approval_limit?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          device_approval_limit?: number
          device_tier2_limit?: number
          device_tier3_limit?: number
          email?: string | null
          full_name?: string
          id: string
          job_title_id?: string | null
          manager_id?: string | null
          tier2_limit?: number
          tier3_limit?: number
        }
        Update: {
          approval_level?: string | null
          approval_limit?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          device_approval_limit?: number
          device_tier2_limit?: number
          device_tier3_limit?: number
          email?: string | null
          full_name?: string
          id?: string
          job_title_id?: string | null
          manager_id?: string | null
          tier2_limit?: number
          tier3_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number
          client_cnpj: string | null
          client_id: string | null
          client_name: string
          concluded_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          budget?: number
          client_cnpj?: string | null
          client_id?: string | null
          client_name?: string
          concluded_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          budget?: number
          client_cnpj?: string | null
          client_id?: string | null
          client_name?: string
          concluded_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_demands: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          order_id: string | null
          order_item_id: string | null
          product: string
          purchase_order_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          product: string
          purchase_order_id?: string | null
          quantity: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          product?: string
          purchase_order_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_demands_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "myio_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_demands_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          allocation_type: string | null
          approval_number: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          attachments: Json
          budget_exceeded: boolean
          budget_snapshot: number | null
          buyer_notes: string | null
          client_id: string | null
          committed_before_snapshot: number | null
          cost_center_id: string | null
          created_at: string
          deadline_date: string | null
          deadline_type: Database["public"]["Enums"]["deadline_type"]
          delivery_forecast: string | null
          delivery_point: string | null
          estimated_value: number
          for_stock: boolean
          id: string
          item_link: string | null
          item_name: string
          material_id: string | null
          parent_order_id: string | null
          passphrase: string | null
          payment_date: string | null
          project_id: string | null
          projected_committed_snapshot: number | null
          quantity: number
          recipient: string
          request_group_id: string | null
          request_model: string
          request_type: string
          requester_id: string
          requester_notes: string | null
          status: Database["public"]["Enums"]["order_status"]
          terceiros_material_id: string | null
          tool_asset_id: string | null
          travel_departure: string | null
          travel_destination: string | null
          travel_legs: Json
          travel_return: string | null
          travel_type: string | null
          updated_at: string
        }
        Insert: {
          allocation_type?: string | null
          approval_number?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json
          budget_exceeded?: boolean
          budget_snapshot?: number | null
          buyer_notes?: string | null
          client_id?: string | null
          committed_before_snapshot?: number | null
          cost_center_id?: string | null
          created_at?: string
          deadline_date?: string | null
          deadline_type?: Database["public"]["Enums"]["deadline_type"]
          delivery_forecast?: string | null
          delivery_point?: string | null
          estimated_value?: number
          for_stock?: boolean
          id?: string
          item_link?: string | null
          item_name: string
          material_id?: string | null
          parent_order_id?: string | null
          passphrase?: string | null
          payment_date?: string | null
          project_id?: string | null
          projected_committed_snapshot?: number | null
          quantity?: number
          recipient?: string
          request_group_id?: string | null
          request_model?: string
          request_type?: string
          requester_id: string
          requester_notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          terceiros_material_id?: string | null
          tool_asset_id?: string | null
          travel_departure?: string | null
          travel_destination?: string | null
          travel_legs?: Json
          travel_return?: string | null
          travel_type?: string | null
          updated_at?: string
        }
        Update: {
          allocation_type?: string | null
          approval_number?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json
          budget_exceeded?: boolean
          budget_snapshot?: number | null
          buyer_notes?: string | null
          client_id?: string | null
          committed_before_snapshot?: number | null
          cost_center_id?: string | null
          created_at?: string
          deadline_date?: string | null
          deadline_type?: Database["public"]["Enums"]["deadline_type"]
          delivery_forecast?: string | null
          delivery_point?: string | null
          estimated_value?: number
          for_stock?: boolean
          id?: string
          item_link?: string | null
          item_name?: string
          material_id?: string | null
          parent_order_id?: string | null
          passphrase?: string | null
          payment_date?: string | null
          project_id?: string | null
          projected_committed_snapshot?: number | null
          quantity?: number
          recipient?: string
          request_group_id?: string | null
          request_model?: string
          request_type?: string
          requester_id?: string
          requester_notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          terceiros_material_id?: string | null
          tool_asset_id?: string | null
          travel_departure?: string | null
          travel_destination?: string | null
          travel_legs?: Json
          travel_return?: string | null
          travel_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "purchase_orders_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_request_type_fkey"
            columns: ["request_type"]
            isOneToOne: false
            referencedRelation: "request_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "purchase_orders_terceiros_material_id_fkey"
            columns: ["terceiros_material_id"]
            isOneToOne: false
            referencedRelation: "terceiros_material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "purchase_orders_terceiros_material_id_fkey"
            columns: ["terceiros_material_id"]
            isOneToOne: false
            referencedRelation: "terceiros_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tool_asset_id_fkey"
            columns: ["tool_asset_id"]
            isOneToOne: false
            referencedRelation: "tool_asset_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "purchase_orders_tool_asset_id_fkey"
            columns: ["tool_asset_id"]
            isOneToOne: false
            referencedRelation: "tool_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          pending_count: number
          recipient: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          pending_count?: number
          recipient: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          pending_count?: number
          recipient?: string
          status?: string
        }
        Relationships: []
      }
      reminder_settings: {
        Row: {
          body_text: string
          enabled: boolean
          frequency: string
          id: boolean
          last_sent_at: string | null
          last_slot: string | null
          time_1: string
          time_2: string
          updated_at: string
          weekday: number
        }
        Insert: {
          body_text?: string
          enabled?: boolean
          frequency?: string
          id?: boolean
          last_sent_at?: string | null
          last_slot?: string | null
          time_1?: string
          time_2?: string
          updated_at?: string
          weekday?: number
        }
        Update: {
          body_text?: string
          enabled?: boolean
          frequency?: string
          id?: boolean
          last_sent_at?: string | null
          last_slot?: string | null
          time_1?: string
          time_2?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      request_types: {
        Row: {
          active: boolean
          code: string
          created_at: string
          is_system: boolean
          model_code: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          is_system?: boolean
          model_code: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          is_system?: boolean
          model_code?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      role_hierarchy: {
        Row: {
          approver_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          approver_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          approver_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      stock_movement_qrs: {
        Row: {
          box_qr: string | null
          created_at: string
          created_by: string | null
          homologation_unit_id: string | null
          id: string
          movement_id: string
          qr_value: string
        }
        Insert: {
          box_qr?: string | null
          created_at?: string
          created_by?: string | null
          homologation_unit_id?: string | null
          id?: string
          movement_id: string
          qr_value: string
        }
        Update: {
          box_qr?: string | null
          created_at?: string
          created_by?: string | null
          homologation_unit_id?: string | null
          id?: string
          movement_id?: string
          qr_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movement_qrs_homologation_unit_id_fkey"
            columns: ["homologation_unit_id"]
            isOneToOne: false
            referencedRelation: "homologation_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movement_qrs_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          order_id: string | null
          photo_url: string | null
          quantity: number
          reason: string | null
          responsible: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          order_id?: string | null
          photo_url?: string | null
          quantity: number
          reason?: string | null
          responsible?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          order_id?: string | null
          photo_url?: string | null
          quantity?: number
          reason?: string | null
          responsible?: string | null
          type?: Database["public"]["Enums"]["stock_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_moves: {
        Row: {
          created_at: string
          created_by: string | null
          destination: string
          id: string
          material_id: string
          movement_id: string
          notes: string | null
          project_id: string | null
          quantity: number
          technician: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination: string
          id?: string
          material_id: string
          movement_id: string
          notes?: string | null
          project_id?: string | null
          quantity: number
          technician: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination?: string
          id?: string
          material_id?: string
          movement_id?: string
          notes?: string | null
          project_id?: string | null
          quantity?: number
          technician?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_moves_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "technician_moves_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_moves_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_moves_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      terceiros_materials: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          link: string | null
          lot_quantity: number | null
          manufacturer_code: string | null
          myio_code: string | null
          name: string
          photo_url: string | null
          purchase_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          link?: string | null
          lot_quantity?: number | null
          manufacturer_code?: string | null
          myio_code?: string | null
          name: string
          photo_url?: string | null
          purchase_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          link?: string | null
          lot_quantity?: number | null
          manufacturer_code?: string | null
          myio_code?: string | null
          name?: string
          photo_url?: string | null
          purchase_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      terceiros_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          order_id: string | null
          photo_url: string | null
          quantity: number
          reason: string | null
          responsible: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          order_id?: string | null
          photo_url?: string | null
          quantity: number
          reason?: string | null
          responsible?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          order_id?: string | null
          photo_url?: string | null
          quantity?: number
          reason?: string | null
          responsible?: string | null
          type?: Database["public"]["Enums"]["stock_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "terceiros_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "terceiros_material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "terceiros_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "terceiros_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terceiros_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_assets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          link: string | null
          lot_quantity: number | null
          manufacturer_code: string | null
          myio_code: string | null
          name: string
          photo_url: string | null
          purchase_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          link?: string | null
          lot_quantity?: number | null
          manufacturer_code?: string | null
          myio_code?: string | null
          name: string
          photo_url?: string | null
          purchase_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          link?: string | null
          lot_quantity?: number | null
          manufacturer_code?: string | null
          myio_code?: string | null
          name?: string
          photo_url?: string | null
          purchase_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tool_movements: {
        Row: {
          created_at: string
          created_by: string | null
          destination: string | null
          id: string
          material_id: string
          order_id: string | null
          photo_url: string | null
          quantity: number
          reason: string | null
          responsible: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination?: string | null
          id?: string
          material_id: string
          order_id?: string | null
          photo_url?: string | null
          quantity: number
          reason?: string | null
          responsible?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination?: string | null
          id?: string
          material_id?: string
          order_id?: string | null
          photo_url?: string | null
          quantity?: number
          reason?: string | null
          responsible?: string | null
          type?: Database["public"]["Enums"]["stock_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tool_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "tool_asset_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "tool_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "tool_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_products: {
        Row: {
          client_name: string | null
          created_at: string
          created_by: string | null
          id: string
          installed_at: string | null
          label: string | null
          material_id: string | null
          move_notes: string | null
          move_photo_url: string | null
          moved_at: string | null
          moved_technician: string | null
          moved_to: string | null
          notes: string | null
          order_id: string | null
          product: string | null
          project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          installed_at?: string | null
          label?: string | null
          material_id?: string | null
          move_notes?: string | null
          move_photo_url?: string | null
          moved_at?: string | null
          moved_technician?: string | null
          moved_to?: string | null
          notes?: string | null
          order_id?: string | null
          product?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          installed_at?: string | null
          label?: string | null
          material_id?: string | null
          move_notes?: string | null
          move_photo_url?: string | null
          moved_at?: string | null
          moved_technician?: string | null
          moved_to?: string | null
          notes?: string | null
          order_id?: string | null
          product?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_products_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "unit_products_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_products_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "myio_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access_profiles: {
        Row: {
          created_at: string
          is_customized: boolean
          profile: Database["public"]["Enums"]["access_profile"]
          profile_definition_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_customized?: boolean
          profile?: Database["public"]["Enums"]["access_profile"]
          profile_definition_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_customized?: boolean
          profile?: Database["public"]["Enums"]["access_profile"]
          profile_definition_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_profiles_profile_definition_id_fkey"
            columns: ["profile_definition_id"]
            isOneToOne: false
            referencedRelation: "access_profile_definitions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_access_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_app_access: {
        Row: {
          app_key: string
          created_at: string
          granted_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_key: string
          created_at?: string
          granted_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_key?: string
          created_at?: string
          granted_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_app_access_app_key_fkey"
            columns: ["app_key"]
            isOneToOne: false
            referencedRelation: "erp_apps"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_app_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_app_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_deletion_requests: {
        Row: {
          completed_at: string | null
          decided_at: string | null
          decided_by: string | null
          failure_reason: string | null
          id: string
          requested_at: string
          requested_by: string
          status: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          failure_reason?: string | null
          id?: string
          requested_at?: string
          requested_by: string
          status?: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          failure_reason?: string | null
          id?: string
          requested_at?: string
          requested_by?: string
          status?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_deletion_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_deletion_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_deletion_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_menu_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          menu_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          menu_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          menu_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_menu_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reminders: {
        Row: {
          body_text: string
          created_at: string
          created_by: string | null
          enabled: boolean
          frequency: string
          id: string
          last_sent_at: string | null
          last_slot: string | null
          time_1: string
          time_2: string
          updated_at: string
          user_id: string
          weekday: number
        }
        Insert: {
          body_text?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          last_sent_at?: string | null
          last_slot?: string | null
          time_1?: string
          time_2?: string
          updated_at?: string
          user_id: string
          weekday?: number
        }
        Update: {
          body_text?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          last_sent_at?: string | null
          last_slot?: string | null
          time_1?: string
          time_2?: string
          updated_at?: string
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      user_request_type_permissions: {
        Row: {
          created_at: string
          request_type_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          request_type_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          request_type_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_request_type_permissions_request_type_code_fkey"
            columns: ["request_type_code"]
            isOneToOne: false
            referencedRelation: "request_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_request_type_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      material_stock: {
        Row: {
          balance: number | null
          last_movement_at: string | null
          link: string | null
          location: string | null
          material_id: string | null
          name: string | null
          total_in: number | null
          total_out: number | null
        }
        Relationships: []
      }
      terceiros_material_stock: {
        Row: {
          balance: number | null
          last_movement_at: string | null
          link: string | null
          material_id: string | null
          name: string | null
          total_in: number | null
          total_out: number | null
        }
        Relationships: []
      }
      tool_asset_stock: {
        Row: {
          balance: number | null
          last_movement_at: string | null
          link: string | null
          material_id: string | null
          name: string | null
          total_in: number | null
          total_out: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage_cash_flow: { Args: { _user_id: string }; Returns: boolean }
      can_manage_limits: { Args: { _user_id: string }; Returns: boolean }
      can_request_type: {
        Args: { _request_type_code: string; _user_id: string }
        Returns: boolean
      }
      create_myio_order_request: {
        Args: {
          _client_id: string
          _client_request_reason: string
          _delivery_date: string
          _is_replacement: boolean
          _items: Json
          _notes: string
          _project_id: string
        }
        Returns: {
          approval_number: string
          myio_order_id: string
          purchase_order_id: string
        }[]
      }
      decide_approval_step: {
        Args: { _comment?: string; _decision: string; _step_id: string }
        Returns: undefined
      }
      decide_user_deletion: {
        Args: { _approve: boolean; _request_id: string }
        Returns: {
          status: string
          target_user_id: string
        }[]
      }
      get_factory_access_users: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      has_job_title_name: {
        Args: { _name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_access_admin: { Args: { _user_id: string }; Returns: boolean }
      primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      request_user_deletion: {
        Args: { _target_user_id: string }
        Returns: string
      }
      set_user_access_profile: {
        Args: {
          _profile: Database["public"]["Enums"]["access_profile"]
          _target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      access_profile: "admin" | "padrao" | "restrito"
      app_role:
        | "admin"
        | "comprador"
        | "solicitante"
        | "fabrica"
        | "estoquista"
        | "coo"
        | "ceo"
        | "cfo"
        | "cto"
        | "financeiro"
      deadline_type: "urgente" | "esta_semana" | "este_mes" | "customizado"
      myio_order_status:
        | "pendente"
        | "produzindo"
        | "pronto_entrega"
        | "entregue_cliente"
        | "em_transito"
        | "perdido"
      order_status:
        | "pendente"
        | "comprado_aguardando"
        | "entregue"
        | "cancelado"
        | "recebido_ok"
        | "recebido_problema"
      stock_movement_type: "entrada" | "saida" | "ajuste"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_profile: ["admin", "padrao", "restrito"],
      app_role: [
        "admin",
        "comprador",
        "solicitante",
        "fabrica",
        "estoquista",
        "coo",
        "ceo",
        "cfo",
        "cto",
        "financeiro",
      ],
      deadline_type: ["urgente", "esta_semana", "este_mes", "customizado"],
      myio_order_status: [
        "pendente",
        "produzindo",
        "pronto_entrega",
        "entregue_cliente",
        "em_transito",
        "perdido",
      ],
      order_status: [
        "pendente",
        "comprado_aguardando",
        "entregue",
        "cancelado",
        "recebido_ok",
        "recebido_problema",
      ],
      stock_movement_type: ["entrada", "saida", "ajuste"],
    },
  },
} as const
