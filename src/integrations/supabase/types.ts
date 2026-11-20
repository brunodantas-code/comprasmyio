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
          ceo_approver_job_title_id: string | null
          created_at: string
          dual_approval_enabled: boolean
          dual_approval_job_title_1_id: string | null
          dual_approval_job_title_2_id: string | null
          dual_approval_threshold: number
          id: boolean
          updated_at: string
        }
        Insert: {
          ceo_approver_job_title_id?: string | null
          created_at?: string
          dual_approval_enabled?: boolean
          dual_approval_job_title_1_id?: string | null
          dual_approval_job_title_2_id?: string | null
          dual_approval_threshold?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          ceo_approver_job_title_id?: string | null
          created_at?: string
          dual_approval_enabled?: boolean
          dual_approval_job_title_1_id?: string | null
          dual_approval_job_title_2_id?: string | null
          dual_approval_threshold?: number
          id?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_settings_ceo_approver_job_title_id_fkey"
            columns: ["ceo_approver_job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_settings_dual_approval_job_title_1_id_fkey"
            columns: ["dual_approval_job_title_1_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_settings_dual_approval_job_title_2_id_fkey"
            columns: ["dual_approval_job_title_2_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
        ]
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
          client_unit_id: string | null
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
          client_unit_id?: string | null
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
          client_unit_id?: string | null
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
            foreignKeyName: "cash_flow_payables_client_unit_id_fkey"
            columns: ["client_unit_id"]
            isOneToOne: false
            referencedRelation: "client_units"
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
      cde_models: {
        Row: {
          class_name: string
          created_at: string
          created_by: string
          group_key: string
          icon: string
          icon_class: string
          id: string
          label: string
          name: string
          size: string
          style: Json
          tag: string
          variant: string
        }
        Insert: {
          class_name?: string
          created_at?: string
          created_by: string
          group_key: string
          icon?: string
          icon_class?: string
          id?: string
          label?: string
          name: string
          size?: string
          style?: Json
          tag?: string
          variant?: string
        }
        Update: {
          class_name?: string
          created_at?: string
          created_by?: string
          group_key?: string
          icon?: string
          icon_class?: string
          id?: string
          label?: string
          name?: string
          size?: string
          style?: Json
          tag?: string
          variant?: string
        }
        Relationships: []
      }
      cde_removed: {
        Row: {
          created_at: string
          group_key: string
          removed_by: string
          replaced_by: string
          variant_key: string
        }
        Insert: {
          created_at?: string
          group_key: string
          removed_by: string
          replaced_by: string
          variant_key: string
        }
        Update: {
          created_at?: string
          group_key?: string
          removed_by?: string
          replaced_by?: string
          variant_key?: string
        }
        Relationships: []
      }
      cde_selected: {
        Row: {
          chosen_by: string
          created_at: string
          group_key: string
          is_primary: boolean
          screens: string[]
          variant_key: string
        }
        Insert: {
          chosen_by: string
          created_at?: string
          group_key: string
          is_primary?: boolean
          screens?: string[]
          variant_key: string
        }
        Update: {
          chosen_by?: string
          created_at?: string
          group_key?: string
          is_primary?: boolean
          screens?: string[]
          variant_key?: string
        }
        Relationships: []
      }
      cde_standards: {
        Row: {
          chosen_by: string | null
          group_key: string
          updated_at: string
          variant_key: string
        }
        Insert: {
          chosen_by?: string | null
          group_key: string
          updated_at?: string
          variant_key: string
        }
        Update: {
          chosen_by?: string | null
          group_key?: string
          updated_at?: string
          variant_key?: string
        }
        Relationships: []
      }
      central_dependencies: {
        Row: {
          created_at: string
          created_by: string
          id: string
          milestone: string
          predecessor_id: string
          predecessor_kind: string
          successor_id: string
          successor_kind: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          milestone?: string
          predecessor_id: string
          predecessor_kind: string
          successor_id: string
          successor_kind: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          milestone?: string
          predecessor_id?: string
          predecessor_kind?: string
          successor_id?: string
          successor_kind?: string
        }
        Relationships: []
      }
      central_dependency_logs: {
        Row: {
          action: string
          actor_id: string
          after_value: Json | null
          before_value: Json | null
          created_at: string
          dependency_id: string
          id: string
        }
        Insert: {
          action: string
          actor_id: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          dependency_id: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          dependency_id?: string
          id?: string
        }
        Relationships: []
      }
      client_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      client_units: {
        Row: {
          active: boolean
          category_id: string | null
          city: string | null
          client_id: string
          cnpj: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          city?: string | null
          client_id: string
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          city?: string | null
          client_id?: string
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_units_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "client_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_units_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          category_id: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          id: string
          legal_name: string | null
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          legal_name?: string | null
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "client_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      code_app_attendants: {
        Row: {
          app_key: string
          attendant_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          app_key: string
          attendant_id: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          app_key?: string
          attendant_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_app_attendants_app_key_fkey"
            columns: ["app_key"]
            isOneToOne: true
            referencedRelation: "erp_apps"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "code_app_attendants_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_messages: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          message: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          message: string
          starts_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          message?: string
          starts_at?: string
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
      crm_atividades: {
        Row: {
          autor_id: string | null
          created_at: string
          data: string
          id: string
          lead_id: string | null
          oportunidade_id: string | null
          payload: Json
          tipo: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          data?: string
          id?: string
          lead_id?: string | null
          oportunidade_id?: string | null
          payload?: Json
          tipo: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          data?: string
          id?: string
          lead_id?: string | null
          oportunidade_id?: string | null
          payload?: Json
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_atividades_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_atividades_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contatos: {
        Row: {
          cargo: string | null
          created_at: string
          created_by: string | null
          email: string | null
          empresa_id: string
          id: string
          legado: Json | null
          nome: string
          observacoes: string | null
          papel: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          legado?: Json | null
          nome: string
          observacoes?: string | null
          papel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          legado?: Json | null
          nome?: string
          observacoes?: string | null
          papel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contatos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "crm_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contatos_papel_fkey"
            columns: ["papel"]
            isOneToOne: false
            referencedRelation: "crm_papeis_contato"
            referencedColumns: ["codigo"]
          },
        ]
      }
      crm_custo_base_produto: {
        Row: {
          cif: number
          componentes_myio: number
          created_at: string | null
          custo_base: number | null
          custo_mensal: number | null
          id: string
          lote_id: string
          mod_assembling: number
          observacoes: string | null
          origem_custo: string | null
          pre_setup_fabrica: number
          produto: string
          updated_at: string | null
          valores_originais: Json | null
        }
        Insert: {
          cif?: number
          componentes_myio?: number
          created_at?: string | null
          custo_base?: number | null
          custo_mensal?: number | null
          id?: string
          lote_id: string
          mod_assembling?: number
          observacoes?: string | null
          origem_custo?: string | null
          pre_setup_fabrica?: number
          produto: string
          updated_at?: string | null
          valores_originais?: Json | null
        }
        Update: {
          cif?: number
          componentes_myio?: number
          created_at?: string | null
          custo_base?: number | null
          custo_mensal?: number | null
          id?: string
          lote_id?: string
          mod_assembling?: number
          observacoes?: string | null
          origem_custo?: string | null
          pre_setup_fabrica?: number
          produto?: string
          updated_at?: string | null
          valores_originais?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_custo_base_produto_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "crm_lotes_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_documentos_migrados: {
        Row: {
          file_name: string
          file_size: number
          grupo: string
          internal_only: boolean
          path: string
          sha256: string
          storage_path: string
        }
        Insert: {
          file_name: string
          file_size: number
          grupo: string
          internal_only?: boolean
          path: string
          sha256: string
          storage_path: string
        }
        Update: {
          file_name?: string
          file_size?: number
          grupo?: string
          internal_only?: boolean
          path?: string
          sha256?: string
          storage_path?: string
        }
        Relationships: []
      }
      crm_emails_envios: {
        Row: {
          assunto: string
          atividade_id: string | null
          corpo: string
          created_at: string
          destino: string
          enviado_em: string | null
          erro: string | null
          id: string
          lead_id: string | null
          lote_id: string | null
          nao_antes_de: string | null
          oportunidade_id: string | null
          remetente_id: string
          status: string
          template_id: string | null
          template_nome: string | null
          tentativas: number
          updated_at: string
        }
        Insert: {
          assunto: string
          atividade_id?: string | null
          corpo: string
          created_at?: string
          destino: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          lead_id?: string | null
          lote_id?: string | null
          nao_antes_de?: string | null
          oportunidade_id?: string | null
          remetente_id: string
          status?: string
          template_id?: string | null
          template_nome?: string | null
          tentativas?: number
          updated_at?: string
        }
        Update: {
          assunto?: string
          atividade_id?: string | null
          corpo?: string
          created_at?: string
          destino?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          lead_id?: string | null
          lote_id?: string | null
          nao_antes_de?: string | null
          oportunidade_id?: string | null
          remetente_id?: string
          status?: string
          template_id?: string | null
          template_nome?: string | null
          tentativas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_emails_envios_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "crm_atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_emails_envios_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_emails_envios_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "crm_emails_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_emails_envios_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_emails_envios_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "crm_templates_mensagem"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_emails_lotes: {
        Row: {
          created_at: string
          id: string
          remetente_id: string
          template_id: string | null
          template_nome: string
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          remetente_id: string
          template_id?: string | null
          template_nome: string
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          remetente_id?: string
          template_id?: string | null
          template_nome?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_emails_lotes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "crm_templates_mensagem"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_empresas: {
        Row: {
          apelido: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          dominio: string | null
          email: string | null
          endereco: string | null
          grupo_economico: string | null
          id: string
          legado: Json | null
          municipio_ibge: number | null
          nome_fantasia: string
          observacoes: string | null
          razao_social: string | null
          segmento: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          apelido?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          dominio?: string | null
          email?: string | null
          endereco?: string | null
          grupo_economico?: string | null
          id?: string
          legado?: Json | null
          municipio_ibge?: number | null
          nome_fantasia: string
          observacoes?: string | null
          razao_social?: string | null
          segmento?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          apelido?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          dominio?: string | null
          email?: string | null
          endereco?: string | null
          grupo_economico?: string | null
          id?: string
          legado?: Json | null
          municipio_ibge?: number | null
          nome_fantasia?: string
          observacoes?: string | null
          razao_social?: string | null
          segmento?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_etapas_lead: {
        Row: {
          ativa: boolean
          codigo: string
          cor: string | null
          created_at: string
          id: string
          nome: string
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          codigo: string
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          codigo?: string
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_fases_funil: {
        Row: {
          ativa: boolean
          checklist_saida: Json
          cor: string | null
          created_at: string
          id: string
          nome: string
          ordem: number
          probabilidade: number
          tempo_max_dias: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          checklist_saida?: Json
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          ordem: number
          probabilidade?: number
          tempo_max_dias?: number | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          checklist_saida?: Json
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          probabilidade?: number
          tempo_max_dias?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_import_batches: {
        Row: {
          batch_key: string
          created_at: string
          payload_hash: string
          row_count: number
          run_id: string
          table_name: string
        }
        Insert: {
          batch_key: string
          created_at?: string
          payload_hash: string
          row_count: number
          run_id: string
          table_name: string
        }
        Update: {
          batch_key?: string
          created_at?: string
          payload_hash?: string
          row_count?: number
          run_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_import_batches_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "crm_import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_import_originals: {
        Row: {
          payload: Json
          record_key: string
          run_id: string
          table_name: string
        }
        Insert: {
          payload: Json
          record_key: string
          run_id: string
          table_name: string
        }
        Update: {
          payload?: Json
          record_key?: string
          run_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_import_originals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "crm_import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_import_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          requested_by: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id: string
          requested_by: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_import_runs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_insumos: {
        Row: {
          ativo: boolean
          categoria: string
          codigo: string | null
          conta_device: boolean
          created_at: string
          custo_mensal: number | null
          fornecedor: string | null
          id: string
          margem_propria: number | null
          nome: string
          observacoes: string | null
          origem_preco: string
          parametro_tipo: string
          parametro_valor: number | null
          pct_mensal: number | null
          preco_compra: number | null
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          codigo?: string | null
          conta_device?: boolean
          created_at?: string
          custo_mensal?: number | null
          fornecedor?: string | null
          id?: string
          margem_propria?: number | null
          nome: string
          observacoes?: string | null
          origem_preco?: string
          parametro_tipo?: string
          parametro_valor?: number | null
          pct_mensal?: number | null
          preco_compra?: number | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          codigo?: string | null
          conta_device?: boolean
          created_at?: string
          custo_mensal?: number | null
          fornecedor?: string | null
          id?: string
          margem_propria?: number | null
          nome?: string
          observacoes?: string | null
          origem_preco?: string
          parametro_tipo?: string
          parametro_valor?: number | null
          pct_mensal?: number | null
          preco_compra?: number | null
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_insumos_compatibilidade: {
        Row: {
          insumo_id: string
          produto_codigo: string
        }
        Insert: {
          insumo_id: string
          produto_codigo: string
        }
        Update: {
          insumo_id?: string
          produto_codigo?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_insumos_compatibilidade_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "crm_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_insumos_compatibilidade_produto_codigo_fkey"
            columns: ["produto_codigo"]
            isOneToOne: false
            referencedRelation: "crm_produtos_myio"
            referencedColumns: ["codigo"]
          },
        ]
      }
      crm_itens_proposta_composicao: {
        Row: {
          created_at: string
          custo_setup_unit: number | null
          id: string
          item_lista_id: string | null
          item_proposta_id: string
          nome: string
          ordem: number
          preco_mensal_unit: number
          preco_setup_unit: number
          quantidade_por_linha: number
          ref: string
          tipo: string
        }
        Insert: {
          created_at?: string
          custo_setup_unit?: number | null
          id?: string
          item_lista_id?: string | null
          item_proposta_id: string
          nome: string
          ordem?: number
          preco_mensal_unit?: number
          preco_setup_unit?: number
          quantidade_por_linha: number
          ref: string
          tipo: string
        }
        Update: {
          created_at?: string
          custo_setup_unit?: number | null
          id?: string
          item_lista_id?: string | null
          item_proposta_id?: string
          nome?: string
          ordem?: number
          preco_mensal_unit?: number
          preco_setup_unit?: number
          quantidade_por_linha?: number
          ref?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_itens_proposta_composicao_item_lista_id_fkey"
            columns: ["item_lista_id"]
            isOneToOne: false
            referencedRelation: "crm_tabela_precos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_itens_proposta_composicao_item_proposta_id_fkey"
            columns: ["item_proposta_id"]
            isOneToOne: false
            referencedRelation: "crm_proposta_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_itens_proposta_custo: {
        Row: {
          composicao: Json | null
          custo_capitalizavel_unit: number | null
          custo_unit: number | null
          item_id: string
          kit_id: string | null
        }
        Insert: {
          composicao?: Json | null
          custo_capitalizavel_unit?: number | null
          custo_unit?: number | null
          item_id: string
          kit_id?: string | null
        }
        Update: {
          composicao?: Json | null
          custo_capitalizavel_unit?: number | null
          custo_unit?: number | null
          item_id?: string
          kit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_itens_proposta_custo_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "crm_proposta_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_itens_proposta_custo_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "crm_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_kits: {
        Row: {
          ativo: boolean
          created_at: string
          custo_3os_imp: number
          custo_3os_nac: number
          grupo: string
          id: string
          nome: string
          observacoes: string | null
          ordem: number
          produto: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_3os_imp?: number
          custo_3os_nac?: number
          grupo: string
          id?: string
          nome: string
          observacoes?: string | null
          ordem?: number
          produto: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_3os_imp?: number
          custo_3os_nac?: number
          grupo?: string
          id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number
          produto?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_kits_insumos: {
        Row: {
          insumo_id: string
          kit_id: string
          quantidade: number
        }
        Insert: {
          insumo_id: string
          kit_id: string
          quantidade?: number
        }
        Update: {
          insumo_id?: string
          kit_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_kits_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "crm_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_kits_insumos_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "crm_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_contatos: {
        Row: {
          cargo: string | null
          created_at: string
          decisor: boolean
          email: string | null
          id: string
          lead_id: string
          nome: string
          origem_lead_id: string | null
          papel: string | null
          telefone: string | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          decisor?: boolean
          email?: string | null
          id?: string
          lead_id: string
          nome: string
          origem_lead_id?: string | null
          papel?: string | null
          telefone?: string | null
        }
        Update: {
          cargo?: string | null
          created_at?: string
          decisor?: boolean
          email?: string | null
          id?: string
          lead_id?: string
          nome?: string
          origem_lead_id?: string | null
          papel?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_contatos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_contatos_origem_lead_id_fkey"
            columns: ["origem_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_contatos_papel_fkey"
            columns: ["papel"]
            isOneToOne: false
            referencedRelation: "crm_papeis_contato"
            referencedColumns: ["codigo"]
          },
        ]
      }
      crm_lead_origens: {
        Row: {
          lead_id: string
          origem: string
        }
        Insert: {
          lead_id: string
          origem: string
        }
        Update: {
          lead_id?: string
          origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_origens_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          cargo: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          dono_id: string | null
          email: string | null
          empresa_id: string | null
          empresa_texto: string | null
          etapa_codigo: string | null
          etapa_desde: string | null
          etapa_legado: string | null
          id: string
          interesses: string | null
          municipio_ibge: number | null
          nome: string
          observacoes: string | null
          oportunidade_id: string | null
          origem: string
          origem_detalhe: string | null
          papel: string | null
          proximo_followup: string | null
          revisar_cidade: boolean | null
          status: string
          telefone: string | null
          telefone_e164: string | null
          tipo: string | null
          toques: number
          uf: string | null
          ultima_atividade: string | null
          ultimo_contato: string | null
          updated_at: string
          whatsapp_status: string | null
        }
        Insert: {
          cargo?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          dono_id?: string | null
          email?: string | null
          empresa_id?: string | null
          empresa_texto?: string | null
          etapa_codigo?: string | null
          etapa_desde?: string | null
          etapa_legado?: string | null
          id?: string
          interesses?: string | null
          municipio_ibge?: number | null
          nome: string
          observacoes?: string | null
          oportunidade_id?: string | null
          origem?: string
          origem_detalhe?: string | null
          papel?: string | null
          proximo_followup?: string | null
          revisar_cidade?: boolean | null
          status?: string
          telefone?: string | null
          telefone_e164?: string | null
          tipo?: string | null
          toques?: number
          uf?: string | null
          ultima_atividade?: string | null
          ultimo_contato?: string | null
          updated_at?: string
          whatsapp_status?: string | null
        }
        Update: {
          cargo?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          dono_id?: string | null
          email?: string | null
          empresa_id?: string | null
          empresa_texto?: string | null
          etapa_codigo?: string | null
          etapa_desde?: string | null
          etapa_legado?: string | null
          id?: string
          interesses?: string | null
          municipio_ibge?: number | null
          nome?: string
          observacoes?: string | null
          oportunidade_id?: string | null
          origem?: string
          origem_detalhe?: string | null
          papel?: string | null
          proximo_followup?: string | null
          revisar_cidade?: boolean | null
          status?: string
          telefone?: string | null
          telefone_e164?: string | null
          tipo?: string | null
          toques?: number
          uf?: string | null
          ultima_atividade?: string | null
          ultimo_contato?: string | null
          updated_at?: string
          whatsapp_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "crm_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_etapa_codigo_fkey"
            columns: ["etapa_codigo"]
            isOneToOne: false
            referencedRelation: "crm_etapas_lead"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "crm_leads_oportunidade_fk"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_papel_fkey"
            columns: ["papel"]
            isOneToOne: false
            referencedRelation: "crm_papeis_contato"
            referencedColumns: ["codigo"]
          },
        ]
      }
      crm_levantamento_convites: {
        Row: {
          created_at: string
          criado_por: string
          emitido_em: string
          enviado_em: string | null
          expira_em: string
          gravacoes: number
          id: string
          levantamento_id: string | null
          oportunidade_id: string
          respostas: Json | null
          status: string
          token_hash: string
          ultima_gravacao: string | null
          updated_at: string
          visto_em: string | null
        }
        Insert: {
          created_at?: string
          criado_por: string
          emitido_em?: string
          enviado_em?: string | null
          expira_em?: string
          gravacoes?: number
          id?: string
          levantamento_id?: string | null
          oportunidade_id: string
          respostas?: Json | null
          status?: string
          token_hash: string
          ultima_gravacao?: string | null
          updated_at?: string
          visto_em?: string | null
        }
        Update: {
          created_at?: string
          criado_por?: string
          emitido_em?: string
          enviado_em?: string | null
          expira_em?: string
          gravacoes?: number
          id?: string
          levantamento_id?: string | null
          oportunidade_id?: string
          respostas?: Json | null
          status?: string
          token_hash?: string
          ultima_gravacao?: string | null
          updated_at?: string
          visto_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_levantamento_convites_levantamento_id_fkey"
            columns: ["levantamento_id"]
            isOneToOne: false
            referencedRelation: "crm_levantamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_levantamento_convites_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_levantamentos: {
        Row: {
          arquivo_nome: string | null
          arquivo_path: string | null
          created_at: string
          criado_por: string | null
          custo_estimado_usd: number
          extracao: Json
          id: string
          modelo: string | null
          oportunidade_id: string | null
          origem: string
          proposta_id: string | null
          texto_fonte: string
          tokens_in: number
          tokens_out: number
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          created_at?: string
          criado_por?: string | null
          custo_estimado_usd?: number
          extracao: Json
          id?: string
          modelo?: string | null
          oportunidade_id?: string | null
          origem: string
          proposta_id?: string | null
          texto_fonte: string
          tokens_in?: number
          tokens_out?: number
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          created_at?: string
          criado_por?: string | null
          custo_estimado_usd?: number
          extracao?: Json
          id?: string
          modelo?: string | null
          oportunidade_id?: string | null
          origem?: string
          proposta_id?: string | null
          texto_fonte?: string
          tokens_in?: number
          tokens_out?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_levantamentos_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_levantamentos_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "crm_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_listas_preco: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          nome: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          nome: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          nome?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_lotes_custo: {
        Row: {
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      crm_municipios: {
        Row: {
          id: number
          nome: string
          uf: string
        }
        Insert: {
          id: number
          nome: string
          uf: string
        }
        Update: {
          id?: number
          nome?: string
          uf?: string
        }
        Relationships: []
      }
      crm_nomes_proposta: {
        Row: {
          modelo: string
          ordem: number
          origem: string
          updated_at: string
        }
        Insert: {
          modelo: string
          ordem?: number
          origem: string
          updated_at?: string
        }
        Update: {
          modelo?: string
          ordem?: number
          origem?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_oportunidades: {
        Row: {
          contato_id: string | null
          created_at: string
          created_by: string | null
          data_prevista_fechamento: string | null
          dono_id: string | null
          empresa_id: string
          fase_desde: string
          fase_id: string
          id: string
          lead_id: string | null
          legado: Json | null
          motivo_encerramento: string | null
          observacoes: string | null
          probabilidade: number | null
          produto_alvo: string | null
          proxima_acao_data: string | null
          proxima_acao_descricao: string | null
          tipo_venda: string | null
          titulo: string
          updated_at: string
          valor_mrr: number | null
          valor_setup: number | null
        }
        Insert: {
          contato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_prevista_fechamento?: string | null
          dono_id?: string | null
          empresa_id: string
          fase_desde?: string
          fase_id: string
          id?: string
          lead_id?: string | null
          legado?: Json | null
          motivo_encerramento?: string | null
          observacoes?: string | null
          probabilidade?: number | null
          produto_alvo?: string | null
          proxima_acao_data?: string | null
          proxima_acao_descricao?: string | null
          tipo_venda?: string | null
          titulo: string
          updated_at?: string
          valor_mrr?: number | null
          valor_setup?: number | null
        }
        Update: {
          contato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_prevista_fechamento?: string | null
          dono_id?: string | null
          empresa_id?: string
          fase_desde?: string
          fase_id?: string
          id?: string
          lead_id?: string | null
          legado?: Json | null
          motivo_encerramento?: string | null
          observacoes?: string | null
          probabilidade?: number | null
          produto_alvo?: string | null
          proxima_acao_data?: string | null
          proxima_acao_descricao?: string | null
          tipo_venda?: string | null
          titulo?: string
          updated_at?: string
          valor_mrr?: number | null
          valor_setup?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_oportunidades_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "crm_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "crm_fases_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_papeis_contato: {
        Row: {
          ativo: boolean
          codigo: string
          decisor_padrao: boolean
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          decisor_padrao?: boolean
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          decisor_padrao?: boolean
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      crm_parametros_motor: {
        Row: {
          aliquota_iss_estimada: number
          circuitos_por_central: number
          custo_hora_padrao: number
          custo_mensal_servir_padrao: number
          faixa_locacao_max: number
          faixa_locacao_min: number
          id: number
          multiplicador_margem_locacao: number
          teto_margem_servicos: number
          updated_at: string
        }
        Insert: {
          aliquota_iss_estimada?: number
          circuitos_por_central?: number
          custo_hora_padrao?: number
          custo_mensal_servir_padrao?: number
          faixa_locacao_max?: number
          faixa_locacao_min?: number
          id?: number
          multiplicador_margem_locacao?: number
          teto_margem_servicos?: number
          updated_at?: string
        }
        Update: {
          aliquota_iss_estimada?: number
          circuitos_por_central?: number
          custo_hora_padrao?: number
          custo_mensal_servir_padrao?: number
          faixa_locacao_max?: number
          faixa_locacao_min?: number
          id?: number
          multiplicador_margem_locacao?: number
          teto_margem_servicos?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_parametros_preco: {
        Row: {
          custo_hora_instalacao: number
          id: number
          margem_alvo: number
          updated_at: string
        }
        Insert: {
          custo_hora_instalacao?: number
          id?: number
          margem_alvo?: number
          updated_at?: string
        }
        Update: {
          custo_hora_instalacao?: number
          id?: number
          margem_alvo?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_perfis_legado: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          erp_user_id: string | null
          id: string
          nome: string
          papel: string
          updated_at: string
          visao_geral: boolean
        }
        Insert: {
          ativo: boolean
          created_at: string
          email: string
          erp_user_id?: string | null
          id: string
          nome: string
          papel: string
          updated_at: string
          visao_geral: boolean
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          erp_user_id?: string | null
          id?: string
          nome?: string
          papel?: string
          updated_at?: string
          visao_geral?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "crm_perfis_legado_erp_user_id_fkey"
            columns: ["erp_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_precos_ponto: {
        Row: {
          ativo: boolean
          atualizado_por: string | null
          composicao: string
          created_at: string
          descricao: string
          grandeza: string
          id: string
          nome_produto: string | null
          ordem: number
          preco_mensal: number | null
          preco_setup: number | null
          texto_tecnico: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          atualizado_por?: string | null
          composicao: string
          created_at?: string
          descricao: string
          grandeza: string
          id?: string
          nome_produto?: string | null
          ordem?: number
          preco_mensal?: number | null
          preco_setup?: number | null
          texto_tecnico?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          atualizado_por?: string | null
          composicao?: string
          created_at?: string
          descricao?: string
          grandeza?: string
          id?: string
          nome_produto?: string | null
          ordem?: number
          preco_mensal?: number | null
          preco_setup?: number | null
          texto_tecnico?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_precos_ponto_historico: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          id: string
          mensal_antes: number | null
          mensal_depois: number | null
          origem: string
          preco_ponto_id: string
          setup_antes: number | null
          setup_depois: number | null
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          id?: string
          mensal_antes?: number | null
          mensal_depois?: number | null
          origem?: string
          preco_ponto_id: string
          setup_antes?: number | null
          setup_depois?: number | null
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          id?: string
          mensal_antes?: number | null
          mensal_depois?: number | null
          origem?: string
          preco_ponto_id?: string
          setup_antes?: number | null
          setup_depois?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_precos_ponto_historico_preco_ponto_id_fkey"
            columns: ["preco_ponto_id"]
            isOneToOne: false
            referencedRelation: "crm_precos_ponto"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_produtos_myio: {
        Row: {
          ativo: boolean
          codigo: string
          conta_device: boolean
          created_at: string
          margem_propria: number | null
          nome: string
          observacoes: string | null
          ordem: number
          pct_mensal: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          conta_device?: boolean
          created_at?: string
          margem_propria?: number | null
          nome: string
          observacoes?: string | null
          ordem?: number
          pct_mensal?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          conta_device?: boolean
          created_at?: string
          margem_propria?: number | null
          nome?: string
          observacoes?: string | null
          ordem?: number
          pct_mensal?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_produtos_myio_preco: {
        Row: {
          margem_propria: number | null
          produto_codigo: string
          updated_at: string
        }
        Insert: {
          margem_propria?: number | null
          produto_codigo: string
          updated_at?: string
        }
        Update: {
          margem_propria?: number | null
          produto_codigo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_produtos_myio_preco_produto_codigo_fkey"
            columns: ["produto_codigo"]
            isOneToOne: true
            referencedRelation: "crm_produtos_myio"
            referencedColumns: ["codigo"]
          },
        ]
      }
      crm_proposta_itens: {
        Row: {
          ambiente: string | null
          categoria: string
          categoria_ponto: string | null
          composicao: boolean
          created_at: string
          id: string
          modelo: string | null
          modo: string
          nome: string
          nome_proposta: string | null
          nota_interna: string | null
          observacao: string | null
          ordem: number
          origem_faixa: string | null
          preco_mensal_unit: number
          preco_ponto_id: string | null
          preco_setup_unit: number
          preco_tabela_mensal: number | null
          preco_tabela_setup: number | null
          precos_historicos: Json | null
          produto_nome: string | null
          produto_texto_tecnico: string | null
          proposta_id: string
          quantidade: number
          regra_medicao_desc: string | null
          regra_medicao_id: string | null
          tabela_item_id: string | null
          unidade: string
        }
        Insert: {
          ambiente?: string | null
          categoria?: string
          categoria_ponto?: string | null
          composicao?: boolean
          created_at?: string
          id?: string
          modelo?: string | null
          modo?: string
          nome: string
          nome_proposta?: string | null
          nota_interna?: string | null
          observacao?: string | null
          ordem?: number
          origem_faixa?: string | null
          preco_mensal_unit?: number
          preco_ponto_id?: string | null
          preco_setup_unit?: number
          preco_tabela_mensal?: number | null
          preco_tabela_setup?: number | null
          precos_historicos?: Json | null
          produto_nome?: string | null
          produto_texto_tecnico?: string | null
          proposta_id: string
          quantidade?: number
          regra_medicao_desc?: string | null
          regra_medicao_id?: string | null
          tabela_item_id?: string | null
          unidade?: string
        }
        Update: {
          ambiente?: string | null
          categoria?: string
          categoria_ponto?: string | null
          composicao?: boolean
          created_at?: string
          id?: string
          modelo?: string | null
          modo?: string
          nome?: string
          nome_proposta?: string | null
          nota_interna?: string | null
          observacao?: string | null
          ordem?: number
          origem_faixa?: string | null
          preco_mensal_unit?: number
          preco_ponto_id?: string | null
          preco_setup_unit?: number
          preco_tabela_mensal?: number | null
          preco_tabela_setup?: number | null
          precos_historicos?: Json | null
          produto_nome?: string | null
          produto_texto_tecnico?: string | null
          proposta_id?: string
          quantidade?: number
          regra_medicao_desc?: string | null
          regra_medicao_id?: string | null
          tabela_item_id?: string | null
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposta_itens_preco_ponto_id_fkey"
            columns: ["preco_ponto_id"]
            isOneToOne: false
            referencedRelation: "crm_precos_ponto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_proposta_itens_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "crm_propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_proposta_itens_regra_medicao_id_fkey"
            columns: ["regra_medicao_id"]
            isOneToOne: false
            referencedRelation: "crm_regras_medicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_proposta_itens_tabela_item_id_fkey"
            columns: ["tabela_item_id"]
            isOneToOne: false
            referencedRelation: "crm_tabela_precos"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_proposta_memoria: {
        Row: {
          calculado_em: string
          centrais_existentes: number
          custo_hora: number
          custo_mensal_servir: number
          frete_site: number
          historico_original: Json | null
          horas_implantacao: number
          lote_codigo: string | null
          mobilizacao: number
          proposta_id: string
          resultado: Json
        }
        Insert: {
          calculado_em?: string
          centrais_existentes?: number
          custo_hora?: number
          custo_mensal_servir?: number
          frete_site?: number
          historico_original?: Json | null
          horas_implantacao?: number
          lote_codigo?: string | null
          mobilizacao?: number
          proposta_id: string
          resultado?: Json
        }
        Update: {
          calculado_em?: string
          centrais_existentes?: number
          custo_hora?: number
          custo_mensal_servir?: number
          frete_site?: number
          historico_original?: Json | null
          horas_implantacao?: number
          lote_codigo?: string | null
          mobilizacao?: number
          proposta_id?: string
          resultado?: Json
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposta_memoria_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: true
            referencedRelation: "crm_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_proposta_pendencias: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string | null
          linha: number | null
          linha_original: Json | null
          origem: string | null
          proposta_id: string
          resolucao: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          status: string
          texto: string
          tipo: string | null
          valor_parcial: number | null
          valor_parcial_original: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          linha?: number | null
          linha_original?: Json | null
          origem?: string | null
          proposta_id: string
          resolucao?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          texto: string
          tipo?: string | null
          valor_parcial?: number | null
          valor_parcial_original?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          linha?: number | null
          linha_original?: Json | null
          origem?: string | null
          proposta_id?: string
          resolucao?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          texto?: string
          tipo?: string | null
          valor_parcial?: number | null
          valor_parcial_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposta_pendencias_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "crm_proposta_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_proposta_pendencias_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "crm_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_propostas: {
        Row: {
          arquivo_origem_path: string | null
          arquivo_path: string | null
          condicoes: Json
          created_at: string
          created_by: string | null
          data_proposta: string
          id: string
          importada: boolean
          incompleta: boolean
          legado: Json | null
          lista_preco_id: string | null
          numero: string
          observacoes: string | null
          oportunidade_id: string
          status: string
          template_codigo: string | null
          template_id: string | null
          tipo_venda: string | null
          total_mensal: number
          total_setup: number
          updated_at: string
          versao: number
        }
        Insert: {
          arquivo_origem_path?: string | null
          arquivo_path?: string | null
          condicoes?: Json
          created_at?: string
          created_by?: string | null
          data_proposta?: string
          id?: string
          importada?: boolean
          incompleta?: boolean
          legado?: Json | null
          lista_preco_id?: string | null
          numero?: string
          observacoes?: string | null
          oportunidade_id: string
          status?: string
          template_codigo?: string | null
          template_id?: string | null
          tipo_venda?: string | null
          total_mensal?: number
          total_setup?: number
          updated_at?: string
          versao?: number
        }
        Update: {
          arquivo_origem_path?: string | null
          arquivo_path?: string | null
          condicoes?: Json
          created_at?: string
          created_by?: string | null
          data_proposta?: string
          id?: string
          importada?: boolean
          incompleta?: boolean
          legado?: Json | null
          lista_preco_id?: string | null
          numero?: string
          observacoes?: string | null
          oportunidade_id?: string
          status?: string
          template_codigo?: string | null
          template_id?: string | null
          tipo_venda?: string | null
          total_mensal?: number
          total_setup?: number
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_propostas_lista_preco_id_fkey"
            columns: ["lista_preco_id"]
            isOneToOne: false
            referencedRelation: "crm_listas_preco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_propostas_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_propostas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "crm_templates_proposta"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_propostas_custo: {
        Row: {
          lote_codigo: string | null
          proposta_id: string
          total_custo: number
          updated_at: string
        }
        Insert: {
          lote_codigo?: string | null
          proposta_id: string
          total_custo?: number
          updated_at?: string
        }
        Update: {
          lote_codigo?: string | null
          proposta_id?: string
          total_custo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_propostas_custo_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: true
            referencedRelation: "crm_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_propostas_rateio: {
        Row: {
          calculado_em: string
          contrato_meses: number
          economia_iss_mensal: number
          iss_estimado_mensal: number
          mensalidade: number
          parcela_locacao: number
          parcela_servicos: number
          proposta_id: string
          rateio_locacao_pct: number
          rateio_servicos_pct: number
        }
        Insert: {
          calculado_em?: string
          contrato_meses: number
          economia_iss_mensal: number
          iss_estimado_mensal: number
          mensalidade: number
          parcela_locacao: number
          parcela_servicos: number
          proposta_id: string
          rateio_locacao_pct: number
          rateio_servicos_pct: number
        }
        Update: {
          calculado_em?: string
          contrato_meses?: number
          economia_iss_mensal?: number
          iss_estimado_mensal?: number
          mensalidade?: number
          parcela_locacao?: number
          parcela_servicos?: number
          proposta_id?: string
          rateio_locacao_pct?: number
          rateio_servicos_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_propostas_rateio_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: true
            referencedRelation: "crm_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_regras_composicao: {
        Row: {
          ativo: boolean
          codigo: string
          como_escolher: string | null
          created_at: string
          faixa_fixa_a: number | null
          insumo1_categoria: string | null
          insumo1_id: string | null
          insumo1_qtd: number
          insumo2_categoria: string | null
          insumo2_qtd: number
          ordem: number
          produto_codigo: string
          rotulo: string
          se_faltar: string
          servico_alto_a_partir_de_a: number | null
          servico_alto_codigo: string | null
          servico_codigo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          como_escolher?: string | null
          created_at?: string
          faixa_fixa_a?: number | null
          insumo1_categoria?: string | null
          insumo1_id?: string | null
          insumo1_qtd?: number
          insumo2_categoria?: string | null
          insumo2_qtd?: number
          ordem?: number
          produto_codigo: string
          rotulo: string
          se_faltar?: string
          servico_alto_a_partir_de_a?: number | null
          servico_alto_codigo?: string | null
          servico_codigo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          como_escolher?: string | null
          created_at?: string
          faixa_fixa_a?: number | null
          insumo1_categoria?: string | null
          insumo1_id?: string | null
          insumo1_qtd?: number
          insumo2_categoria?: string | null
          insumo2_qtd?: number
          ordem?: number
          produto_codigo?: string
          rotulo?: string
          se_faltar?: string
          servico_alto_a_partir_de_a?: number | null
          servico_alto_codigo?: string | null
          servico_codigo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_regras_composicao_insumo1_id_fkey"
            columns: ["insumo1_id"]
            isOneToOne: false
            referencedRelation: "crm_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_regras_composicao_produto_codigo_fkey"
            columns: ["produto_codigo"]
            isOneToOne: false
            referencedRelation: "crm_produtos_myio"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "crm_regras_composicao_servico_alto_codigo_fkey"
            columns: ["servico_alto_codigo"]
            isOneToOne: false
            referencedRelation: "crm_servicos_instalacao"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "crm_regras_composicao_servico_codigo_fkey"
            columns: ["servico_codigo"]
            isOneToOne: false
            referencedRelation: "crm_servicos_instalacao"
            referencedColumns: ["codigo"]
          },
        ]
      }
      crm_regras_geracao: {
        Row: {
          devices_por_dupla: number
          id: number
          proporcao: Json
          updated_at: string
        }
        Insert: {
          devices_por_dupla: number
          id: number
          proporcao: Json
          updated_at?: string
        }
        Update: {
          devices_por_dupla?: number
          id?: number
          proporcao?: Json
          updated_at?: string
        }
        Relationships: []
      }
      crm_regras_medicao: {
        Row: {
          ativa: boolean
          composicao: string
          condicao: string
          condicao_max: number | null
          condicao_min: number | null
          created_at: string
          created_by: string | null
          data_origem: string
          grandeza: string
          id: string
          insumo1_id: string | null
          insumo1_qtd: number
          insumo2_id: string | null
          insumo2_qtd: number
          nome_item: string | null
          observacao: string | null
          ordem: number
          origem: string
          origem_ref: string | null
          preco_ponto_id: string | null
          produto_codigo: string
          servico_alto_a_partir_de_a: number | null
          servico_alto_codigo: string | null
          servico_codigo: string | null
          termos: string[]
          tipo: string
          tipo_rotulo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          composicao: string
          condicao?: string
          condicao_max?: number | null
          condicao_min?: number | null
          created_at?: string
          created_by?: string | null
          data_origem?: string
          grandeza: string
          id?: string
          insumo1_id?: string | null
          insumo1_qtd?: number
          insumo2_id?: string | null
          insumo2_qtd?: number
          nome_item?: string | null
          observacao?: string | null
          ordem?: number
          origem: string
          origem_ref?: string | null
          preco_ponto_id?: string | null
          produto_codigo: string
          servico_alto_a_partir_de_a?: number | null
          servico_alto_codigo?: string | null
          servico_codigo?: string | null
          termos?: string[]
          tipo: string
          tipo_rotulo: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          composicao?: string
          condicao?: string
          condicao_max?: number | null
          condicao_min?: number | null
          created_at?: string
          created_by?: string | null
          data_origem?: string
          grandeza?: string
          id?: string
          insumo1_id?: string | null
          insumo1_qtd?: number
          insumo2_id?: string | null
          insumo2_qtd?: number
          nome_item?: string | null
          observacao?: string | null
          ordem?: number
          origem?: string
          origem_ref?: string | null
          preco_ponto_id?: string | null
          produto_codigo?: string
          servico_alto_a_partir_de_a?: number | null
          servico_alto_codigo?: string | null
          servico_codigo?: string | null
          termos?: string[]
          tipo?: string
          tipo_rotulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_regras_medicao_insumo1_id_fkey"
            columns: ["insumo1_id"]
            isOneToOne: false
            referencedRelation: "crm_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_regras_medicao_insumo2_id_fkey"
            columns: ["insumo2_id"]
            isOneToOne: false
            referencedRelation: "crm_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_regras_medicao_preco_ponto_id_fkey"
            columns: ["preco_ponto_id"]
            isOneToOne: false
            referencedRelation: "crm_precos_ponto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_regras_medicao_produto_codigo_fkey"
            columns: ["produto_codigo"]
            isOneToOne: false
            referencedRelation: "crm_produtos_myio"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "crm_regras_medicao_servico_alto_codigo_fkey"
            columns: ["servico_alto_codigo"]
            isOneToOne: false
            referencedRelation: "crm_servicos_instalacao"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "crm_regras_medicao_servico_codigo_fkey"
            columns: ["servico_codigo"]
            isOneToOne: false
            referencedRelation: "crm_servicos_instalacao"
            referencedColumns: ["codigo"]
          },
        ]
      }
      crm_servicos_instalacao: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          horas: number | null
          margem_propria: number | null
          nome: string
          observacoes: string | null
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          horas?: number | null
          margem_propria?: number | null
          nome: string
          observacoes?: string | null
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          horas?: number | null
          margem_propria?: number | null
          nome?: string
          observacoes?: string | null
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_sugestoes_regra_medicao: {
        Row: {
          composicao: Json
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          descricao: string
          id: string
          item_proposta_id: string | null
          motivo: string
          proposta_id: string
          regra_criada_id: string | null
          regra_id: string | null
          status: string
          tipo: string | null
        }
        Insert: {
          composicao: Json
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          descricao: string
          id?: string
          item_proposta_id?: string | null
          motivo: string
          proposta_id: string
          regra_criada_id?: string | null
          regra_id?: string | null
          status?: string
          tipo?: string | null
        }
        Update: {
          composicao?: Json
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          descricao?: string
          id?: string
          item_proposta_id?: string | null
          motivo?: string
          proposta_id?: string
          regra_criada_id?: string | null
          regra_id?: string | null
          status?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_sugestoes_regra_medicao_item_proposta_id_fkey"
            columns: ["item_proposta_id"]
            isOneToOne: false
            referencedRelation: "crm_proposta_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sugestoes_regra_medicao_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "crm_propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sugestoes_regra_medicao_regra_criada_id_fkey"
            columns: ["regra_criada_id"]
            isOneToOne: false
            referencedRelation: "crm_regras_medicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sugestoes_regra_medicao_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "crm_regras_medicao"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tabela_precos: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          id: string
          insumo_id: string | null
          lista_id: string | null
          modelo: string | null
          nome: string
          notas_internas: string | null
          ordem: number
          preco_mensal: number
          preco_setup: number
          produto_codigo: string | null
          servico_codigo: string | null
          unidade: string
          updated_at: string
          valores_originais: Json | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          insumo_id?: string | null
          lista_id?: string | null
          modelo?: string | null
          nome: string
          notas_internas?: string | null
          ordem?: number
          preco_mensal?: number
          preco_setup?: number
          produto_codigo?: string | null
          servico_codigo?: string | null
          unidade?: string
          updated_at?: string
          valores_originais?: Json | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          insumo_id?: string | null
          lista_id?: string | null
          modelo?: string | null
          nome?: string
          notas_internas?: string | null
          ordem?: number
          preco_mensal?: number
          preco_setup?: number
          produto_codigo?: string | null
          servico_codigo?: string | null
          unidade?: string
          updated_at?: string
          valores_originais?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tabela_precos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "crm_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tabela_precos_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "crm_listas_preco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tabela_precos_produto_codigo_fkey"
            columns: ["produto_codigo"]
            isOneToOne: false
            referencedRelation: "crm_produtos_myio"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "crm_tabela_precos_servico_codigo_fkey"
            columns: ["servico_codigo"]
            isOneToOne: false
            referencedRelation: "crm_servicos_instalacao"
            referencedColumns: ["codigo"]
          },
        ]
      }
      crm_tabela_precos_custo: {
        Row: {
          custo_manual: number | null
          custo_origem: string | null
          item_id: string
          kit_id: string | null
          markup_percentual: number
          updated_at: string
        }
        Insert: {
          custo_manual?: number | null
          custo_origem?: string | null
          item_id: string
          kit_id?: string | null
          markup_percentual?: number
          updated_at?: string
        }
        Update: {
          custo_manual?: number | null
          custo_origem?: string | null
          item_id?: string
          kit_id?: string | null
          markup_percentual?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tabela_precos_custo_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "crm_tabela_precos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tabela_precos_custo_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "crm_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_templates_mensagem: {
        Row: {
          assunto: string | null
          ativo: boolean
          canal: string
          corpo: string
          etapa_lead: string | null
          fase_id: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          assunto?: string | null
          ativo?: boolean
          canal?: string
          corpo: string
          etapa_lead?: string | null
          fase_id?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          assunto?: string | null
          ativo?: boolean
          canal?: string
          corpo?: string
          etapa_lead?: string | null
          fase_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_templates_mensagem_etapa_lead_fkey"
            columns: ["etapa_lead"]
            isOneToOne: false
            referencedRelation: "crm_etapas_lead"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "crm_templates_mensagem_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "crm_fases_funil"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_templates_proposta: {
        Row: {
          ativo: boolean
          codigo: string
          condicoes_padrao: Json
          escopo: string | null
          id: string
          introducao: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          condicoes_padrao?: Json
          escopo?: string | null
          id?: string
          introducao?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          condicoes_padrao?: Json
          escopo?: string | null
          id?: string
          introducao?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      damage_reasons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          name?: string
          position?: number
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
          reason_code: string | null
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
          reason_code?: string | null
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
          reason_code?: string | null
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
          {
            foreignKeyName: "damaged_items_reason_code_fkey"
            columns: ["reason_code"]
            isOneToOne: false
            referencedRelation: "damage_reasons"
            referencedColumns: ["code"]
          },
        ]
      }
      delivery_points: {
        Row: {
          active: boolean
          address: string
          code: string
          created_at: string
          is_default: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          code: string
          created_at?: string
          is_default?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          code?: string
          created_at?: string
          is_default?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      development_ticket_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string | null
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          content_type: string
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          message_id?: string | null
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string | null
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "development_ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "development_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      development_ticket_logs: {
        Row: {
          changed_by: string
          created_at: string
          event_type: string | null
          id: string
          new_assignee_id: string | null
          new_status: string | null
          note: string | null
          observation_id: string | null
          previous_assignee_id: string | null
          previous_note: string | null
          previous_status: string | null
          ticket_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          event_type?: string | null
          id?: string
          new_assignee_id?: string | null
          new_status?: string | null
          note?: string | null
          observation_id?: string | null
          previous_assignee_id?: string | null
          previous_note?: string | null
          previous_status?: string | null
          ticket_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          event_type?: string | null
          id?: string
          new_assignee_id?: string | null
          new_status?: string | null
          note?: string | null
          observation_id?: string | null
          previous_assignee_id?: string | null
          previous_note?: string | null
          previous_status?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_ticket_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_ticket_logs_new_assignee_id_fkey"
            columns: ["new_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_ticket_logs_previous_assignee_id_fkey"
            columns: ["previous_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_ticket_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "development_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      development_ticket_messages: {
        Row: {
          author_id: string
          created_at: string
          id: string
          message: string
          message_type: string
          parent_message_id: string | null
          recipient_id: string | null
          requester_seen_at: string | null
          ticket_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          message: string
          message_type: string
          parent_message_id?: string | null
          recipient_id?: string | null
          requester_seen_at?: string | null
          ticket_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          parent_message_id?: string | null
          recipient_id?: string | null
          requester_seen_at?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_ticket_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_ticket_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "development_ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_ticket_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "development_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      development_tickets: {
        Row: {
          admin_notes: string | null
          app_key: string
          assignee_id: string | null
          created_at: string
          description: string
          expected_result: string
          id: string
          menu_name: string | null
          priority: string
          proposed_solution: string | null
          reporter_id: string
          status: string
          submenu_name: string | null
          ticket_number: number
          ticket_type: string
          title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          admin_notes?: string | null
          app_key: string
          assignee_id?: string | null
          created_at?: string
          description: string
          expected_result: string
          id?: string
          menu_name?: string | null
          priority: string
          proposed_solution?: string | null
          reporter_id: string
          status?: string
          submenu_name?: string | null
          ticket_number?: never
          ticket_type: string
          title: string
          updated_at?: string
          urgency: string
        }
        Update: {
          admin_notes?: string | null
          app_key?: string
          assignee_id?: string | null
          created_at?: string
          description?: string
          expected_result?: string
          id?: string
          menu_name?: string | null
          priority?: string
          proposed_solution?: string | null
          reporter_id?: string
          status?: string
          submenu_name?: string | null
          ticket_number?: never
          ticket_type?: string
          title?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_tickets_app_key_fkey"
            columns: ["app_key"]
            isOneToOne: false
            referencedRelation: "erp_apps"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "development_tickets_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_tickets_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      internal_call_attachments: {
        Row: {
          call_id: string
          content_type: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          call_id: string
          content_type: string
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          message_id?: string | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          call_id?: string
          content_type?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_call_attachments_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "internal_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_call_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "internal_call_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_call_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_call_logs: {
        Row: {
          call_id: string
          changed_by: string | null
          created_at: string
          id: string
          new_assignee_id: string | null
          new_status: string | null
          note: string | null
          previous_assignee_id: string | null
          previous_status: string | null
        }
        Insert: {
          call_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_assignee_id?: string | null
          new_status?: string | null
          note?: string | null
          previous_assignee_id?: string | null
          previous_status?: string | null
        }
        Update: {
          call_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_assignee_id?: string | null
          new_status?: string | null
          note?: string | null
          previous_assignee_id?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_call_logs_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "internal_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_call_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_call_logs_new_assignee_id_fkey"
            columns: ["new_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_call_logs_previous_assignee_id_fkey"
            columns: ["previous_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_call_messages: {
        Row: {
          author_id: string
          call_id: string
          created_at: string
          id: string
          message: string
        }
        Insert: {
          author_id: string
          call_id: string
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          author_id?: string
          call_id?: string
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_call_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_call_messages_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "internal_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_calls: {
        Row: {
          assignee_id: string | null
          call_number: string | null
          category: string
          created_at: string
          description: string
          id: string
          internal_notes: string | null
          priority: string
          reporter_id: string
          site_survey_number: number | null
          site_survey_question_id: string | null
          site_survey_visit_environment_id: string | null
          site_survey_visit_id: string | null
          site_survey_visit_luc_id: string | null
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          call_number?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          internal_notes?: string | null
          priority?: string
          reporter_id: string
          site_survey_number?: number | null
          site_survey_question_id?: string | null
          site_survey_visit_environment_id?: string | null
          site_survey_visit_id?: string | null
          site_survey_visit_luc_id?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          call_number?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          internal_notes?: string | null
          priority?: string
          reporter_id?: string
          site_survey_number?: number | null
          site_survey_question_id?: string | null
          site_survey_visit_environment_id?: string | null
          site_survey_visit_id?: string | null
          site_survey_visit_luc_id?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_calls_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_calls_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_calls_site_survey_question_id_fkey"
            columns: ["site_survey_question_id"]
            isOneToOne: false
            referencedRelation: "site_survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_calls_site_survey_visit_environment_id_fkey"
            columns: ["site_survey_visit_environment_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_calls_site_survey_visit_id_fkey"
            columns: ["site_survey_visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_calls_site_survey_visit_luc_id_fkey"
            columns: ["site_survey_visit_luc_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_lucs"
            referencedColumns: ["id"]
          },
        ]
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
      legal_action_observations: {
        Row: {
          action_id: string
          author_id: string
          author_name: string
          created_at: string
          deleted_at: string | null
          id: string
          message: string
          updated_at: string
        }
        Insert: {
          action_id: string
          author_id?: string
          author_name?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          message: string
          updated_at?: string
        }
        Update: {
          action_id?: string
          author_id?: string
          author_name?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          message?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_action_observations_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "legal_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_actions: {
        Row: {
          archived: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          display_order: number | null
          due_date: string | null
          id: string
          record_id: string
          responsible_id: string
          responsible_name: string
          sequence: number
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          display_order?: number | null
          due_date?: string | null
          id?: string
          record_id: string
          responsible_id: string
          responsible_name: string
          sequence?: number
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          display_order?: number | null
          due_date?: string | null
          id?: string
          record_id?: string
          responsible_id?: string
          responsible_name?: string
          sequence?: number
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_actions_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "legal_records"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_confidential_subjects: {
        Row: {
          position: number
          record_id: string
          subject: Json
          subject_id: string
          updated_at: string
        }
        Insert: {
          position?: number
          record_id: string
          subject: Json
          subject_id: string
          updated_at?: string
        }
        Update: {
          position?: number
          record_id?: string
          subject?: Json
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_confidential_subjects_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "legal_records"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_records: {
        Row: {
          category: string
          content: Json
          created_at: string
          created_by: string
          file_name: string | null
          file_path: string | null
          id: string
          meeting_date: string | null
          pdf_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content?: Json
          created_at?: string
          created_by?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          meeting_date?: string | null
          pdf_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          created_by?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          meeting_date?: string | null
          pdf_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_signature_events: {
        Row: {
          content_hash: string
          id: string
          image: string
          participant_id: string | null
          record_id: string
          record_updated_at: string
          signed_at: string
          signer_name: string
          user_id: string
        }
        Insert: {
          content_hash: string
          id?: string
          image: string
          participant_id?: string | null
          record_id: string
          record_updated_at: string
          signed_at?: string
          signer_name: string
          user_id: string
        }
        Update: {
          content_hash?: string
          id?: string
          image?: string
          participant_id?: string | null
          record_id?: string
          record_updated_at?: string
          signed_at?: string
          signer_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_signature_events_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "legal_records"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_subject_completions: {
        Row: {
          completed_at: string
          completed_by: string
          record_id: string
          subject_id: string
        }
        Insert: {
          completed_at?: string
          completed_by?: string
          record_id: string
          subject_id: string
        }
        Update: {
          completed_at?: string
          completed_by?: string
          record_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_subject_completions_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "legal_records"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_subject_logs: {
        Row: {
          action_id: string | null
          actor_id: string
          actor_name: string
          created_at: string
          id: string
          record_id: string
          subject_id: string
          text: string
        }
        Insert: {
          action_id?: string | null
          actor_id: string
          actor_name: string
          created_at?: string
          id?: string
          record_id: string
          subject_id: string
          text: string
        }
        Update: {
          action_id?: string | null
          actor_id?: string
          actor_name?: string
          created_at?: string
          id?: string
          record_id?: string
          subject_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_subject_logs_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "legal_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_subject_logs_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "legal_records"
            referencedColumns: ["id"]
          },
        ]
      }
      material_stock_types: {
        Row: {
          active: boolean
          code: string
          created_at: string
          destination_type: string
          is_system: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          destination_type: string
          is_system?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          destination_type?: string
          is_system?: boolean
          name?: string
          position?: number
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
          stock_type_code: string | null
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
          stock_type_code?: string | null
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
          stock_type_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_stock_type_code_fkey"
            columns: ["stock_type_code"]
            isOneToOne: false
            referencedRelation: "material_stock_types"
            referencedColumns: ["code"]
          },
        ]
      }
      mobile_app_favorites: {
        Row: {
          app_keys: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          app_keys?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          app_keys?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_app_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          client_unit_id: string | null
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
          client_unit_id?: string | null
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
          client_unit_id?: string | null
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
            foreignKeyName: "myio_orders_client_unit_id_fkey"
            columns: ["client_unit_id"]
            isOneToOne: false
            referencedRelation: "client_units"
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
      mytosis_flow_versions: {
        Row: {
          created_at: string
          created_by: string
          file_path: string
          id: string
          root_id: string
          root_title: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          file_path: string
          id?: string
          root_id: string
          root_title: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          file_path?: string
          id?: string
          root_id?: string
          root_title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_flow_versions_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "mytosis_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_kpi_results: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kpi_id: string
          notes: string | null
          period_start: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          kpi_id: string
          notes?: string | null
          period_start: string
          value: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kpi_id?: string
          notes?: string | null
          period_start?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_kpi_results_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "mytosis_kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_kpis: {
        Row: {
          active: boolean
          cost_center_id: string
          created_at: string
          created_by: string
          description: string | null
          frequency: string
          id: string
          name: string
          responsible_id: string
          target: number
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cost_center_id: string
          created_at?: string
          created_by?: string
          description?: string | null
          frequency?: string
          id?: string
          name: string
          responsible_id: string
          target: number
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cost_center_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          frequency?: string
          id?: string
          name?: string
          responsible_id?: string
          target?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_kpis_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_links: {
        Row: {
          color: string | null
          created_at: string
          predecessor_id: string
          style: string
          successor_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          predecessor_id: string
          style?: string
          successor_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          predecessor_id?: string
          style?: string
          successor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_links_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "mytosis_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mytosis_links_successor_id_fkey"
            columns: ["successor_id"]
            isOneToOne: false
            referencedRelation: "mytosis_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_members: {
        Row: {
          created_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_node_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string | null
          node_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          content_type: string
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          message_id?: string | null
          node_id: string
          storage_path: string
          uploaded_by?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string | null
          node_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_node_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mytosis_node_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mytosis_node_attachments_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "mytosis_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_node_logs: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          node_id: string
          text: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          node_id: string
          text: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          node_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_node_logs_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "mytosis_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_node_messages: {
        Row: {
          author_id: string
          created_at: string
          id: string
          kind: string
          node_id: string
          recipient_id: string | null
          reply_to_id: string | null
          text: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          id?: string
          kind: string
          node_id: string
          recipient_id?: string | null
          reply_to_id?: string | null
          text: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          kind?: string
          node_id?: string
          recipient_id?: string | null
          reply_to_id?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_node_messages_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "mytosis_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mytosis_node_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mytosis_node_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "mytosis_node_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_nodes: {
        Row: {
          border_color: string
          control_color: string | null
          created_at: string
          created_by: string | null
          custom_format: boolean
          description: string | null
          description_font_size: number
          due_date: string | null
          fill_color: string
          id: string
          is_process: boolean
          kind: string
          linked_node_id: string | null
          locator: number
          parent_id: string | null
          position: number
          progress: number
          responsible_id: string | null
          shape: string
          text_align: string
          text_vertical_align: string
          title: string
          title_color: string | null
          title_font_size: number
          updated_at: string
          weight: number
        }
        Insert: {
          border_color?: string
          control_color?: string | null
          created_at?: string
          created_by?: string | null
          custom_format?: boolean
          description?: string | null
          description_font_size?: number
          due_date?: string | null
          fill_color?: string
          id?: string
          is_process?: boolean
          kind?: string
          linked_node_id?: string | null
          locator?: number
          parent_id?: string | null
          position?: number
          progress?: number
          responsible_id?: string | null
          shape?: string
          text_align?: string
          text_vertical_align?: string
          title: string
          title_color?: string | null
          title_font_size?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          border_color?: string
          control_color?: string | null
          created_at?: string
          created_by?: string | null
          custom_format?: boolean
          description?: string | null
          description_font_size?: number
          due_date?: string | null
          fill_color?: string
          id?: string
          is_process?: boolean
          kind?: string
          linked_node_id?: string | null
          locator?: number
          parent_id?: string | null
          position?: number
          progress?: number
          responsible_id?: string | null
          shape?: string
          text_align?: string
          text_vertical_align?: string
          title?: string
          title_color?: string | null
          title_font_size?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_nodes_linked_node_id_fkey"
            columns: ["linked_node_id"]
            isOneToOne: false
            referencedRelation: "mytosis_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mytosis_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "mytosis_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mytosis_nodes_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_processes: {
        Row: {
          created_at: string
          created_by: string
          flow_ids: string[]
          id: string
          name: string
          revision: number
          sections: Json
          stage_bindings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          flow_ids?: string[]
          id?: string
          name: string
          revision?: number
          sections?: Json
          stage_bindings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          flow_ids?: string[]
          id?: string
          name?: string
          revision?: number
          sections?: Json
          stage_bindings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      mytosis_settings: {
        Row: {
          box_format: Json
          box_formats: Json
          box_height: number
          box_width: number
          id: number
          updated_at: string
        }
        Insert: {
          box_format?: Json
          box_formats?: Json
          box_height?: number
          box_width?: number
          id?: number
          updated_at?: string
        }
        Update: {
          box_format?: Json
          box_formats?: Json
          box_height?: number
          box_width?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      mytosis_task_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string | null
          storage_path: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          file_name: string
          file_size?: number
          id?: string
          message_id?: string | null
          storage_path: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string | null
          storage_path?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_task_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mytosis_task_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mytosis_task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mytosis_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_task_logs: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          task_id: string
          text: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          task_id: string
          text: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          task_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mytosis_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_task_messages: {
        Row: {
          author_id: string
          created_at: string
          id: string
          kind: string
          recipient_id: string | null
          reply_to_id: string | null
          task_id: string
          text: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          id?: string
          kind?: string
          recipient_id?: string | null
          reply_to_id?: string | null
          task_id: string
          text: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          kind?: string
          recipient_id?: string | null
          reply_to_id?: string | null
          task_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_task_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mytosis_task_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "mytosis_task_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mytosis_task_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mytosis_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mytosis_tasks: {
        Row: {
          completed: boolean
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          involved_ids: string[]
          node_id: string
          responsible_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          involved_ids?: string[]
          node_id: string
          responsible_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          involved_ids?: string[]
          node_id?: string
          responsible_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mytosis_tasks_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "mytosis_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      opdesk_clients: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "opdesk_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opdesk_responsibles: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opdesk_responsibles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opdesk_task_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          storage_path: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          content_type: string
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          storage_path: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          storage_path?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "opdesk_task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "opdesk_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opdesk_task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opdesk_task_logs: {
        Row: {
          actor_email: string
          actor_id: string | null
          created_at: string
          id: string
          task_id: string
          text: string
        }
        Insert: {
          actor_email: string
          actor_id?: string | null
          created_at?: string
          id?: string
          task_id: string
          text: string
        }
        Update: {
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          task_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "opdesk_task_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opdesk_task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "opdesk_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      opdesk_task_observations: {
        Row: {
          author_email: string
          author_id: string
          created_at: string
          id: string
          task_id: string
          text: string
        }
        Insert: {
          author_email: string
          author_id: string
          created_at?: string
          id?: string
          task_id: string
          text: string
        }
        Update: {
          author_email?: string
          author_id?: string
          created_at?: string
          id?: string
          task_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "opdesk_task_observations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opdesk_task_observations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "opdesk_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      opdesk_tasks: {
        Row: {
          action_custom: string | null
          action_type: string
          agents: Json
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          end_date: string | null
          flow_rule: string
          id: string
          links: string[]
          next_subtask_number: number
          parent_task_id: string | null
          priority: string
          responsible_ids: string[]
          start_date: string | null
          status: string
          subtask_number: number | null
          task_number: number
          title: string
          updated_at: string
        }
        Insert: {
          action_custom?: string | null
          action_type: string
          agents?: Json
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          end_date?: string | null
          flow_rule?: string
          id?: string
          links?: string[]
          next_subtask_number?: number
          parent_task_id?: string | null
          priority?: string
          responsible_ids?: string[]
          start_date?: string | null
          status?: string
          subtask_number?: number | null
          task_number?: number
          title: string
          updated_at?: string
        }
        Update: {
          action_custom?: string | null
          action_type?: string
          agents?: Json
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          end_date?: string | null
          flow_rule?: string
          id?: string
          links?: string[]
          next_subtask_number?: number
          parent_task_id?: string | null
          priority?: string
          responsible_ids?: string[]
          start_date?: string | null
          status?: string
          subtask_number?: number | null
          task_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opdesk_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "opdesk_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opdesk_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opdesk_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "opdesk_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_functions: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      personal_todo_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          message_id: string | null
          storage_path: string
          todo_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          message_id?: string | null
          storage_path: string
          todo_id: string
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          message_id?: string | null
          storage_path?: string
          todo_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_todo_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "personal_todo_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_todo_attachments_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "personal_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_todo_label_links: {
        Row: {
          label_id: string
          owner_id: string
          todo_id: string
        }
        Insert: {
          label_id: string
          owner_id?: string
          todo_id: string
        }
        Update: {
          label_id?: string
          owner_id?: string
          todo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_todo_label_links_label_id_owner_id_fkey"
            columns: ["label_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "personal_todo_labels"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "personal_todo_label_links_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "personal_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_todo_labels: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          owner_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      personal_todo_logs: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          text: string
          todo_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          text: string
          todo_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          text?: string
          todo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_todo_logs_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "personal_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_todo_messages: {
        Row: {
          author_id: string
          created_at: string
          id: string
          message: string
          message_type: string
          parent_message_id: string | null
          recipient_id: string | null
          todo_id: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          id?: string
          message: string
          message_type: string
          parent_message_id?: string | null
          recipient_id?: string | null
          todo_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          parent_message_id?: string | null
          recipient_id?: string | null
          todo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_todo_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "personal_todo_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_todo_messages_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "personal_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_todo_preferences: {
        Row: {
          ordered_ids: string[]
          sort_mode: string
          user_id: string
        }
        Insert: {
          ordered_ids?: string[]
          sort_mode?: string
          user_id: string
        }
        Update: {
          ordered_ids?: string[]
          sort_mode?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_todo_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_todos: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string
          due_date: string | null
          expected_result: string
          id: string
          owner_id: string
          priority: string
          proposed_solution: string
          shared_user_ids: string[]
          status: string
          task_type: string
          title: string
          todo_number: number
          updated_at: string
          urgency: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          expected_result?: string
          id?: string
          owner_id?: string
          priority?: string
          proposed_solution?: string
          shared_user_ids?: string[]
          status?: string
          task_type?: string
          title: string
          todo_number?: never
          updated_at?: string
          urgency?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          expected_result?: string
          id?: string
          owner_id?: string
          priority?: string
          proposed_solution?: string
          shared_user_ids?: string[]
          status?: string
          task_type?: string
          title?: string
          todo_number?: never
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      pm_allocations: {
        Row: {
          actual_quantity: number
          id: string
          planned_quantity: number
          project_id: string
          resource_id: string
          task_id: string
          unit_rate: number
        }
        Insert: {
          actual_quantity?: number
          id?: string
          planned_quantity?: number
          project_id: string
          resource_id: string
          task_id: string
          unit_rate?: number
        }
        Update: {
          actual_quantity?: number
          id?: string
          planned_quantity?: number
          project_id?: string
          resource_id?: string
          task_id?: string
          unit_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "pm_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pm_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_allocations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "pm_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_allocations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "pm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_app_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_app_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_assumptions: {
        Row: {
          entries: Json
          id: string
          project_id: string
          source_label: string
          survey_id: string | null
        }
        Insert: {
          entries?: Json
          id?: string
          project_id: string
          source_label?: string
          survey_id?: string | null
        }
        Update: {
          entries?: Json
          id?: string
          project_id?: string
          source_label?: string
          survey_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_assumptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "pm_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_assumptions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_baselines: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          project_id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          project_id: string
          snapshot: Json
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          project_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pm_baselines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_baselines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pm_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_budget_accounts: {
        Row: {
          account_id: string
        }
        Insert: {
          account_id: string
        }
        Update: {
          account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_budget_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "cash_flow_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_dependencies: {
        Row: {
          lag: number
          link_type: string
          predecessor_id: string
          project_id: string
          successor_id: string
        }
        Insert: {
          lag?: number
          link_type?: string
          predecessor_id: string
          project_id: string
          successor_id: string
        }
        Update: {
          lag?: number
          link_type?: string
          predecessor_id?: string
          project_id?: string
          successor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_dependencies_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "pm_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pm_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_dependencies_successor_id_fkey"
            columns: ["successor_id"]
            isOneToOne: false
            referencedRelation: "pm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string
          id: string
          new_data: Json | null
          old_data: Json | null
          project_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          project_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pm_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_members: {
        Row: {
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pm_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_phases: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          deliverables: string
          duration_unit: string
          duration_value: number | null
          id: string
          name: string
          planned_end: string | null
          planned_start: string | null
          position: number
          project_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          deliverables?: string
          duration_unit?: string
          duration_value?: number | null
          id?: string
          name: string
          planned_end?: string | null
          planned_start?: string | null
          position?: number
          project_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          deliverables?: string
          duration_unit?: string
          duration_value?: number | null
          id?: string
          name?: string
          planned_end?: string | null
          planned_start?: string | null
          position?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_phases_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pm_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_projects: {
        Row: {
          board_columns: Json
          budget: number
          budget_details: Json
          budget_mode: string
          calendar_mode: string
          category: string
          created_at: string
          created_by: string
          custom_fields: Json
          erp_project_id: string | null
          holidays: string[]
          hours_per_day: number
          id: string
          location_city: string | null
          manager_id: string
          name: string
          planned_end: string | null
          scope: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          board_columns?: Json
          budget?: number
          budget_details?: Json
          budget_mode?: string
          calendar_mode?: string
          category?: string
          created_at?: string
          created_by?: string
          custom_fields?: Json
          erp_project_id?: string | null
          holidays?: string[]
          hours_per_day?: number
          id?: string
          location_city?: string | null
          manager_id: string
          name: string
          planned_end?: string | null
          scope?: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          board_columns?: Json
          budget?: number
          budget_details?: Json
          budget_mode?: string
          calendar_mode?: string
          category?: string
          created_at?: string
          created_by?: string
          custom_fields?: Json
          erp_project_id?: string | null
          holidays?: string[]
          hours_per_day?: number
          id?: string
          location_city?: string | null
          manager_id?: string
          name?: string
          planned_end?: string | null
          scope?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_projects_erp_project_id_fkey"
            columns: ["erp_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_resources: {
        Row: {
          capacity_per_day: number
          id: string
          kind: string
          name: string
          project_id: string
          rate: number
          unit: string
          user_id: string | null
        }
        Insert: {
          capacity_per_day?: number
          id?: string
          kind?: string
          name: string
          project_id: string
          rate?: number
          unit?: string
          user_id?: string | null
        }
        Update: {
          capacity_per_day?: number
          id?: string
          kind?: string
          name?: string
          project_id?: string
          rate?: number
          unit?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pm_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_resources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_task_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string | null
          project_id: string
          storage_path: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          content_type: string
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          message_id?: string | null
          project_id: string
          storage_path: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string | null
          project_id?: string
          storage_path?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_task_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "pm_task_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_task_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pm_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "pm_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_task_messages: {
        Row: {
          author_id: string
          created_at: string
          id: string
          kind: string
          project_id: string
          recipient_id: string | null
          reply_to_id: string | null
          seen_at: string | null
          task_id: string
          text: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          kind: string
          project_id: string
          recipient_id?: string | null
          reply_to_id?: string | null
          seen_at?: string | null
          task_id: string
          text: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          kind?: string
          project_id?: string
          recipient_id?: string | null
          reply_to_id?: string | null
          seen_at?: string | null
          task_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_task_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_task_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pm_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_task_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_task_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "pm_task_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_task_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "pm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_tasks: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          board_column: string | null
          custom_values: Json
          duration: number
          duration_unit: string
          duration_value: number | null
          id: string
          milestone: boolean
          name: string
          notes: string
          parent_id: string | null
          phase_id: string | null
          position: number
          progress: number
          project_id: string
          responsible_id: string | null
          start_date: string
          work_package: boolean
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          board_column?: string | null
          custom_values?: Json
          duration?: number
          duration_unit?: string
          duration_value?: number | null
          id?: string
          milestone?: boolean
          name: string
          notes?: string
          parent_id?: string | null
          phase_id?: string | null
          position?: number
          progress?: number
          project_id: string
          responsible_id?: string | null
          start_date: string
          work_package?: boolean
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          board_column?: string | null
          custom_values?: Json
          duration?: number
          duration_unit?: string
          duration_value?: number | null
          id?: string
          milestone?: boolean
          name?: string
          notes?: string
          parent_id?: string | null
          phase_id?: string | null
          position?: number
          progress?: number
          project_id?: string
          responsible_id?: string | null
          start_date?: string
          work_package?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pm_tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pm_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "pm_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pm_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_tasks_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          is_active: boolean
          job_title_id: string | null
          manager_id: string | null
          mobile_phone: string | null
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
          is_active?: boolean
          job_title_id?: string | null
          manager_id?: string | null
          mobile_phone?: string | null
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
          is_active?: boolean
          job_title_id?: string | null
          manager_id?: string | null
          mobile_phone?: string | null
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
      project_types: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          name: string
          position: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          position?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number
          client_cnpj: string | null
          client_id: string | null
          client_name: string
          client_unit_id: string | null
          concluded_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          project_type: string | null
          short_name: string | null
          status: string
        }
        Insert: {
          budget?: number
          client_cnpj?: string | null
          client_id?: string | null
          client_name?: string
          client_unit_id?: string | null
          concluded_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          project_type?: string | null
          short_name?: string | null
          status?: string
        }
        Update: {
          budget?: number
          client_cnpj?: string | null
          client_id?: string | null
          client_name?: string
          client_unit_id?: string | null
          concluded_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          project_type?: string | null
          short_name?: string | null
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
          {
            foreignKeyName: "projects_client_unit_id_fkey"
            columns: ["client_unit_id"]
            isOneToOne: false
            referencedRelation: "client_units"
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
      purchase_order_items: {
        Row: {
          created_at: string
          estimated_unit_value: number
          fulfillment_type: string
          id: string
          item_link: string | null
          item_name: string
          material_id: string | null
          order_id: string
          position: number
          quantity: number
          terceiros_material_id: string | null
          tool_asset_id: string | null
        }
        Insert: {
          created_at?: string
          estimated_unit_value?: number
          fulfillment_type?: string
          id?: string
          item_link?: string | null
          item_name: string
          material_id?: string | null
          order_id: string
          position?: number
          quantity: number
          terceiros_material_id?: string | null
          tool_asset_id?: string | null
        }
        Update: {
          created_at?: string
          estimated_unit_value?: number
          fulfillment_type?: string
          id?: string
          item_link?: string | null
          item_name?: string
          material_id?: string | null
          order_id?: string
          position?: number
          quantity?: number
          terceiros_material_id?: string | null
          tool_asset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_terceiros_material_id_fkey"
            columns: ["terceiros_material_id"]
            isOneToOne: false
            referencedRelation: "terceiros_material_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "purchase_order_items_terceiros_material_id_fkey"
            columns: ["terceiros_material_id"]
            isOneToOne: false
            referencedRelation: "terceiros_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_tool_asset_id_fkey"
            columns: ["tool_asset_id"]
            isOneToOne: false
            referencedRelation: "tool_asset_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "purchase_order_items_tool_asset_id_fkey"
            columns: ["tool_asset_id"]
            isOneToOne: false
            referencedRelation: "tool_assets"
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
          client_unit_id: string | null
          committed_before_snapshot: number | null
          cost_center_id: string | null
          created_at: string
          custom_status_id: string | null
          deadline_date: string | null
          deadline_type: Database["public"]["Enums"]["deadline_type"]
          delivery_forecast: string | null
          delivery_mode: string
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
          recipient_user_id: string | null
          reimbursement_account_id: string | null
          request_group_id: string | null
          request_model: string
          request_subtype: string | null
          request_type: string
          requester_id: string
          requester_notes: string | null
          site_survey_visit_id: string | null
          source_myio_order_item_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          tag_id: string | null
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
          client_unit_id?: string | null
          committed_before_snapshot?: number | null
          cost_center_id?: string | null
          created_at?: string
          custom_status_id?: string | null
          deadline_date?: string | null
          deadline_type?: Database["public"]["Enums"]["deadline_type"]
          delivery_forecast?: string | null
          delivery_mode?: string
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
          recipient_user_id?: string | null
          reimbursement_account_id?: string | null
          request_group_id?: string | null
          request_model?: string
          request_subtype?: string | null
          request_type?: string
          requester_id: string
          requester_notes?: string | null
          site_survey_visit_id?: string | null
          source_myio_order_item_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tag_id?: string | null
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
          client_unit_id?: string | null
          committed_before_snapshot?: number | null
          cost_center_id?: string | null
          created_at?: string
          custom_status_id?: string | null
          deadline_date?: string | null
          deadline_type?: Database["public"]["Enums"]["deadline_type"]
          delivery_forecast?: string | null
          delivery_mode?: string
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
          recipient_user_id?: string | null
          reimbursement_account_id?: string | null
          request_group_id?: string | null
          request_model?: string
          request_subtype?: string | null
          request_type?: string
          requester_id?: string
          requester_notes?: string | null
          site_survey_visit_id?: string | null
          source_myio_order_item_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tag_id?: string | null
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
            foreignKeyName: "purchase_orders_client_unit_id_fkey"
            columns: ["client_unit_id"]
            isOneToOne: false
            referencedRelation: "client_units"
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
            foreignKeyName: "purchase_orders_custom_status_id_fkey"
            columns: ["custom_status_id"]
            isOneToOne: false
            referencedRelation: "supply_order_statuses"
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
            foreignKeyName: "purchase_orders_reimbursement_account_id_fkey"
            columns: ["reimbursement_account_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_accounts"
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
            foreignKeyName: "purchase_orders_site_survey_visit_id_fkey"
            columns: ["site_survey_visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_source_myio_order_item_id_fkey"
            columns: ["source_myio_order_item_id"]
            isOneToOne: false
            referencedRelation: "myio_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "supply_tags"
            referencedColumns: ["id"]
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
      reimbursement_accounts: {
        Row: {
          active: boolean
          created_at: string
          details: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          details: Json
          id?: string
          name: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          details?: Json
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      reimbursement_destinations: {
        Row: {
          account_id: string
          created_at: string
          details: Json
          order_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          details: Json
          order_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          details?: Json
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reimbursement_destinations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimbursement_destinations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "purchase_orders"
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
      request_subtypes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          form_kind: string
          id: string
          is_system: boolean
          name: string
          position: number
          request_type_code: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          form_kind?: string
          id?: string
          is_system?: boolean
          name: string
          position?: number
          request_type_code: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          form_kind?: string
          id?: string
          is_system?: boolean
          name?: string
          position?: number
          request_type_code?: string
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
      site_survey_access_profiles: {
        Row: {
          active: boolean
          code: string
          created_at: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_survey_action_catalog: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_survey_attachments: {
        Row: {
          attachment_kind: string
          content_type: string | null
          created_at: string
          file_name: string
          file_size: number
          id: string
          question_id: string | null
          storage_path: string
          uploaded_by: string | null
          visit_environment_id: string | null
          visit_id: string
          visit_luc_id: string | null
        }
        Insert: {
          attachment_kind?: string
          content_type?: string | null
          created_at?: string
          file_name: string
          file_size?: number
          id?: string
          question_id?: string | null
          storage_path: string
          uploaded_by?: string | null
          visit_environment_id?: string | null
          visit_id: string
          visit_luc_id?: string | null
        }
        Update: {
          attachment_kind?: string
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          question_id?: string | null
          storage_path?: string
          uploaded_by?: string | null
          visit_environment_id?: string | null
          visit_id?: string
          visit_luc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_attachments_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "site_survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_attachments_visit_environment_id_fkey"
            columns: ["visit_environment_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_attachments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_attachments_visit_luc_id_fkey"
            columns: ["visit_luc_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_lucs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_builtin_catalog_names: {
        Row: {
          catalog_key: string
          name: string
          updated_at: string
        }
        Insert: {
          catalog_key: string
          name: string
          updated_at?: string
        }
        Update: {
          catalog_key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_survey_cancellation_reasons: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_cancellation_reasons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_client_report_imports: {
        Row: {
          confirmations: Json
          created_at: string
          file_name: string
          id: string
          imported_items: Json
          storage_path: string
          uploaded_by: string
          visit_id: string
        }
        Insert: {
          confirmations?: Json
          created_at?: string
          file_name: string
          id?: string
          imported_items?: Json
          storage_path: string
          uploaded_by: string
          visit_id: string
        }
        Update: {
          confirmations?: Json
          created_at?: string
          file_name?: string
          id?: string
          imported_items?: Json
          storage_path?: string
          uploaded_by?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_client_report_imports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_client_report_imports_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_commercial_proposals: {
        Row: {
          electrical: number | null
          evidence: string | null
          file_name: string
          file_size: number
          hydraulic_general: number | null
          hydraulic_shops: number | null
          scope_breakdown: Json | null
          storage_path: string
          updated_at: string
          uploaded_by: string
          visit_id: string
        }
        Insert: {
          electrical?: number | null
          evidence?: string | null
          file_name: string
          file_size: number
          hydraulic_general?: number | null
          hydraulic_shops?: number | null
          scope_breakdown?: Json | null
          storage_path: string
          updated_at?: string
          uploaded_by: string
          visit_id: string
        }
        Update: {
          electrical?: number | null
          evidence?: string | null
          file_name?: string
          file_size?: number
          hydraulic_general?: number | null
          hydraulic_shops?: number | null
          scope_breakdown?: Json | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_commercial_proposals_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_contracted_scope: {
        Row: {
          electrical: number | null
          hydraulic_general: number | null
          hydraulic_shops: number | null
          proposal_storage_path: string | null
          updated_at: string
          updated_by: string | null
          visit_id: string
        }
        Insert: {
          electrical?: number | null
          hydraulic_general?: number | null
          hydraulic_shops?: number | null
          proposal_storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_id: string
        }
        Update: {
          electrical?: number | null
          hydraulic_general?: number | null
          hydraulic_shops?: number | null
          proposal_storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_contracted_scope_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_custom_catalog_items: {
        Row: {
          active: boolean
          catalog_id: string
          created_at: string
          id: string
          name: string
          position: number
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          catalog_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          catalog_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_custom_catalog_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "site_survey_custom_catalogs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_custom_catalogs: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          name: string
          position: number
          purpose: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          name: string
          position?: number
          purpose?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          position?: number
          purpose?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_survey_environment_types: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          discipline: string
          id: string
          name: string
          normalized_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          discipline: string
          id?: string
          name: string
          normalized_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          discipline?: string
          id?: string
          name?: string
          normalized_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_survey_generated_calls: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          internal_call_id: string | null
          question_action_id: string
          question_id: string
          status: string
          trigger_value: string
          updated_at: string
          visit_environment_id: string | null
          visit_id: string
          visit_luc_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          internal_call_id?: string | null
          question_action_id: string
          question_id: string
          status?: string
          trigger_value: string
          updated_at?: string
          visit_environment_id?: string | null
          visit_id: string
          visit_luc_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          internal_call_id?: string | null
          question_action_id?: string
          question_id?: string
          status?: string
          trigger_value?: string
          updated_at?: string
          visit_environment_id?: string | null
          visit_id?: string
          visit_luc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_generated_calls_internal_call_id_fkey"
            columns: ["internal_call_id"]
            isOneToOne: false
            referencedRelation: "internal_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_generated_calls_question_action_id_fkey"
            columns: ["question_action_id"]
            isOneToOne: false
            referencedRelation: "site_survey_question_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_generated_calls_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "site_survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_generated_calls_visit_environment_id_fkey"
            columns: ["visit_environment_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_generated_calls_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_generated_calls_visit_luc_id_fkey"
            columns: ["visit_luc_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_lucs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_installation_approvals: {
        Row: {
          electrical_approved: boolean
          hydraulic_approved: boolean
          point_id: string
          point_kind: string
          updated_at: string
          updated_by: string | null
          visit_id: string
        }
        Insert: {
          electrical_approved?: boolean
          hydraulic_approved?: boolean
          point_id: string
          point_kind: string
          updated_at?: string
          updated_by?: string | null
          visit_id: string
        }
        Update: {
          electrical_approved?: boolean
          hydraulic_approved?: boolean
          point_id?: string
          point_kind?: string
          updated_at?: string
          updated_by?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_installation_approvals_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          visit_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          visit_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_logs_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_luc_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          luc_number: string
          shop_name: string
          valid_from: string
          valid_until: string | null
          visit_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          luc_number: string
          shop_name: string
          valid_from?: string
          valid_until?: string | null
          visit_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          luc_number?: string
          shop_name?: string
          valid_from?: string
          valid_until?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_luc_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_luc_history_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_material_catalog: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          name: string
          position: number
          type_builtin: string | null
          type_catalog_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          name: string
          position?: number
          type_builtin?: string | null
          type_catalog_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          type_builtin?: string | null
          type_catalog_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_material_catalog_type_catalog_id_fkey"
            columns: ["type_catalog_id"]
            isOneToOne: false
            referencedRelation: "site_survey_custom_catalogs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_material_decisions: {
        Row: {
          created_at: string
          id: string
          no_additional_material: boolean
          recorded_by: string
          updated_at: string
          visit_environment_id: string | null
          visit_id: string
          visit_luc_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          no_additional_material?: boolean
          recorded_by: string
          updated_at?: string
          visit_environment_id?: string | null
          visit_id: string
          visit_luc_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          no_additional_material?: boolean
          recorded_by?: string
          updated_at?: string
          visit_environment_id?: string | null
          visit_id?: string
          visit_luc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_material_decisions_visit_environment_id_fkey"
            columns: ["visit_environment_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_material_decisions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_material_decisions_visit_luc_id_fkey"
            columns: ["visit_luc_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_lucs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_pause_reasons: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          name: string
          position: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          position?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_pause_reasons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_point_edit_locks: {
        Row: {
          expires_at: string
          point_id: string
          point_kind: string
          session_id: string
          user_id: string
          visit_id: string
        }
        Insert: {
          expires_at?: string
          point_id: string
          point_kind: string
          session_id: string
          user_id: string
          visit_id: string
        }
        Update: {
          expires_at?: string
          point_id?: string
          point_kind?: string
          session_id?: string
          user_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_point_edit_locks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_point_edit_locks_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_point_pauses: {
        Row: {
          ended_at: string | null
          ended_by: string | null
          id: string
          reason_id: string
          started_at: string
          started_by: string
          visit_environment_id: string | null
          visit_id: string
          visit_luc_id: string | null
        }
        Insert: {
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          reason_id: string
          started_at?: string
          started_by: string
          visit_environment_id?: string | null
          visit_id: string
          visit_luc_id?: string | null
        }
        Update: {
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          reason_id?: string
          started_at?: string
          started_by?: string
          visit_environment_id?: string | null
          visit_id?: string
          visit_luc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_point_pauses_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_point_pauses_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "site_survey_pause_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_point_pauses_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_point_pauses_visit_environment_id_fkey"
            columns: ["visit_environment_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_point_pauses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_point_pauses_visit_luc_id_fkey"
            columns: ["visit_luc_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_lucs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_profile_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          permission_key: string
          profile_code: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          permission_key: string
          profile_code: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          permission_key?: string
          profile_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_profile_permissions_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "site_survey_access_profiles"
            referencedColumns: ["code"]
          },
        ]
      }
      site_survey_question_actions: {
        Row: {
          action_id: string
          active: boolean
          created_at: string
          id: string
          question_id: string
          trigger_value: string
          updated_at: string
        }
        Insert: {
          action_id: string
          active?: boolean
          created_at?: string
          id?: string
          question_id: string
          trigger_value: string
          updated_at?: string
        }
        Update: {
          action_id?: string
          active?: boolean
          created_at?: string
          id?: string
          question_id?: string
          trigger_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_question_actions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "site_survey_action_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_question_actions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "site_survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_questions: {
        Row: {
          active: boolean
          conditioned_on_question_id: string | null
          conditioned_operator: string
          conditioned_value: string | null
          configuration: Json
          created_at: string
          id: string
          options: Json
          position: number
          prompt: string
          question_key: string | null
          question_type: string
          required: boolean
          section_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          conditioned_on_question_id?: string | null
          conditioned_operator?: string
          conditioned_value?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          options?: Json
          position?: number
          prompt: string
          question_key?: string | null
          question_type?: string
          required?: boolean
          section_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          conditioned_on_question_id?: string | null
          conditioned_operator?: string
          conditioned_value?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          options?: Json
          position?: number
          prompt?: string
          question_key?: string | null
          question_type?: string
          required?: boolean
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_questions_conditioned_on_question_id_fkey"
            columns: ["conditioned_on_question_id"]
            isOneToOne: false
            referencedRelation: "site_survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "site_survey_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_report_texts: {
        Row: {
          answer_value: string
          created_at: string
          created_by: string
          id: string
          name: string
          question_id: string
          report_answer: string
          report_question: string
        }
        Insert: {
          answer_value?: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          question_id: string
          report_answer?: string
          report_question?: string
        }
        Update: {
          answer_value?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          question_id?: string
          report_answer?: string
          report_question?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_report_texts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "site_survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_responses: {
        Row: {
          answer: Json
          answered_at: string
          answered_by: string | null
          created_at: string
          id: string
          question_id: string
          question_snapshot: Json
          updated_at: string
          visit_environment_id: string | null
          visit_id: string
          visit_luc_id: string | null
        }
        Insert: {
          answer?: Json
          answered_at?: string
          answered_by?: string | null
          created_at?: string
          id?: string
          question_id: string
          question_snapshot?: Json
          updated_at?: string
          visit_environment_id?: string | null
          visit_id: string
          visit_luc_id?: string | null
        }
        Update: {
          answer?: Json
          answered_at?: string
          answered_by?: string | null
          created_at?: string
          id?: string
          question_id?: string
          question_snapshot?: Json
          updated_at?: string
          visit_environment_id?: string | null
          visit_id?: string
          visit_luc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_responses_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "site_survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_responses_visit_environment_id_fkey"
            columns: ["visit_environment_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_responses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_responses_visit_luc_id_fkey"
            columns: ["visit_luc_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_lucs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_screwdriver_types: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      site_survey_sections: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          position: number
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_shop_catalog: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          excluded_from_sync: boolean
          id: string
          name: string
          normalized_name: string
          point_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          excluded_from_sync?: boolean
          id?: string
          name: string
          normalized_name: string
          point_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          excluded_from_sync?: boolean
          id?: string
          name?: string
          normalized_name?: string
          point_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_shop_catalog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_shop_catalog_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_templates: {
        Row: {
          active: boolean
          client_category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_templates_client_category_id_fkey"
            columns: ["client_category_id"]
            isOneToOne: false
            referencedRelation: "client_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_time_assumptions: {
        Row: {
          active: boolean
          answer_value: string | null
          created_at: string
          created_by: string | null
          id: string
          minutes: number
          name: string
          position: number
          question_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          answer_value?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          minutes?: number
          name: string
          position?: number
          question_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          answer_value?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          minutes?: number
          name?: string
          position?: number
          question_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_time_assumptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_time_assumptions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "site_survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_user_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          permission_key: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          permission_key: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_user_profiles: {
        Row: {
          is_customized: boolean
          profile_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          is_customized?: boolean
          profile_code?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          is_customized?: boolean
          profile_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_user_profiles_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "site_survey_access_profiles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "site_survey_user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_visit_environments: {
        Row: {
          active: boolean
          completed_at: string | null
          completed_by: string | null
          completion_status: string
          created_at: string
          created_by: string | null
          environment_type_id: string | null
          facade_id_ok: boolean | null
          id: string
          last_progress_at: string | null
          location: string | null
          luc_number: string | null
          meter_number: string | null
          name: string
          pending_fields: Json
          point_type: string
          skipped_section_ids: Json
          started_at: string | null
          started_by: string | null
          template_id: string | null
          updated_at: string
          updated_by: string | null
          visit_id: string
        }
        Insert: {
          active?: boolean
          completed_at?: string | null
          completed_by?: string | null
          completion_status?: string
          created_at?: string
          created_by?: string | null
          environment_type_id?: string | null
          facade_id_ok?: boolean | null
          id?: string
          last_progress_at?: string | null
          location?: string | null
          luc_number?: string | null
          meter_number?: string | null
          name: string
          pending_fields?: Json
          point_type?: string
          skipped_section_ids?: Json
          started_at?: string | null
          started_by?: string | null
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_id: string
        }
        Update: {
          active?: boolean
          completed_at?: string | null
          completed_by?: string | null
          completion_status?: string
          created_at?: string
          created_by?: string | null
          environment_type_id?: string | null
          facade_id_ok?: boolean | null
          id?: string
          last_progress_at?: string | null
          location?: string | null
          luc_number?: string | null
          meter_number?: string | null
          name?: string
          pending_fields?: Json
          point_type?: string
          skipped_section_ids?: Json
          started_at?: string | null
          started_by?: string | null
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_visit_environments_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_environments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_environments_environment_type_id_fkey"
            columns: ["environment_type_id"]
            isOneToOne: false
            referencedRelation: "site_survey_environment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_environments_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_environments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_survey_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_environments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_environments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_visit_luc_history: {
        Row: {
          cancellation_reason_id: string | null
          cancelled_at: string | null
          changed_by: string | null
          completion_status: string
          created_at: string
          id: string
          luc_number: string
          shop_name: string
          valid_from: string
          valid_until: string | null
          visit_id: string
          visit_luc_id: string
        }
        Insert: {
          cancellation_reason_id?: string | null
          cancelled_at?: string | null
          changed_by?: string | null
          completion_status?: string
          created_at?: string
          id?: string
          luc_number: string
          shop_name: string
          valid_from?: string
          valid_until?: string | null
          visit_id: string
          visit_luc_id: string
        }
        Update: {
          cancellation_reason_id?: string | null
          cancelled_at?: string | null
          changed_by?: string | null
          completion_status?: string
          created_at?: string
          id?: string
          luc_number?: string
          shop_name?: string
          valid_from?: string
          valid_until?: string | null
          visit_id?: string
          visit_luc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_visit_luc_history_cancellation_reason_id_fkey"
            columns: ["cancellation_reason_id"]
            isOneToOne: false
            referencedRelation: "site_survey_cancellation_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_luc_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_luc_history_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_luc_history_visit_luc_id_fkey"
            columns: ["visit_luc_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_lucs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_visit_lucs: {
        Row: {
          active: boolean
          cancellation_reason_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          classification_type: string | null
          completed_at: string | null
          completed_by: string | null
          completion_status: string
          contract_name: string | null
          created_at: string
          created_by: string | null
          environment_type_id: string | null
          facade_id_ok: boolean | null
          id: string
          last_progress_at: string | null
          location: string | null
          luc_number: string
          meter_number: string | null
          pending_fields: Json
          point_type: string
          shop_name: string
          skipped_section_ids: Json
          started_at: string | null
          started_by: string | null
          template_id: string | null
          updated_at: string
          updated_by: string | null
          visit_id: string
        }
        Insert: {
          active?: boolean
          cancellation_reason_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          classification_type?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_status?: string
          contract_name?: string | null
          created_at?: string
          created_by?: string | null
          environment_type_id?: string | null
          facade_id_ok?: boolean | null
          id?: string
          last_progress_at?: string | null
          location?: string | null
          luc_number: string
          meter_number?: string | null
          pending_fields?: Json
          point_type?: string
          shop_name: string
          skipped_section_ids?: Json
          started_at?: string | null
          started_by?: string | null
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_id: string
        }
        Update: {
          active?: boolean
          cancellation_reason_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          classification_type?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_status?: string
          contract_name?: string | null
          created_at?: string
          created_by?: string | null
          environment_type_id?: string | null
          facade_id_ok?: boolean | null
          id?: string
          last_progress_at?: string | null
          location?: string | null
          luc_number?: string
          meter_number?: string | null
          pending_fields?: Json
          point_type?: string
          shop_name?: string
          skipped_section_ids?: Json
          started_at?: string | null
          started_by?: string | null
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_visit_lucs_cancellation_reason_id_fkey"
            columns: ["cancellation_reason_id"]
            isOneToOne: false
            referencedRelation: "site_survey_cancellation_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_lucs_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_lucs_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_lucs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_lucs_environment_type_id_fkey"
            columns: ["environment_type_id"]
            isOneToOne: false
            referencedRelation: "site_survey_environment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_lucs_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_lucs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_survey_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_lucs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_lucs_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_visit_materials: {
        Row: {
          catalog_item_id: string
          created_at: string
          custom_type_item_id: string | null
          id: string
          no_additional_material: boolean
          notes: string | null
          quantity: number
          recorded_by: string
          screwdriver_type_id: string | null
          updated_at: string
          visit_environment_id: string | null
          visit_id: string
          visit_luc_id: string | null
          wrench_size_id: string | null
        }
        Insert: {
          catalog_item_id: string
          created_at?: string
          custom_type_item_id?: string | null
          id?: string
          no_additional_material?: boolean
          notes?: string | null
          quantity?: number
          recorded_by: string
          screwdriver_type_id?: string | null
          updated_at?: string
          visit_environment_id?: string | null
          visit_id: string
          visit_luc_id?: string | null
          wrench_size_id?: string | null
        }
        Update: {
          catalog_item_id?: string
          created_at?: string
          custom_type_item_id?: string | null
          id?: string
          no_additional_material?: boolean
          notes?: string | null
          quantity?: number
          recorded_by?: string
          screwdriver_type_id?: string | null
          updated_at?: string
          visit_environment_id?: string | null
          visit_id?: string
          visit_luc_id?: string | null
          wrench_size_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_visit_materials_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "site_survey_material_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_materials_custom_type_item_id_fkey"
            columns: ["custom_type_item_id"]
            isOneToOne: false
            referencedRelation: "site_survey_custom_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_materials_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_materials_screwdriver_type_id_fkey"
            columns: ["screwdriver_type_id"]
            isOneToOne: false
            referencedRelation: "site_survey_screwdriver_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_materials_visit_environment_id_fkey"
            columns: ["visit_environment_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_materials_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_materials_visit_luc_id_fkey"
            columns: ["visit_luc_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_lucs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_materials_wrench_size_id_fkey"
            columns: ["wrench_size_id"]
            isOneToOne: false
            referencedRelation: "site_survey_wrench_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_visit_technicians: {
        Row: {
          created_at: string
          id: string
          mobile_phone: string
          recorded_by: string
          technician_id: string
          updated_at: string
          visit_environment_id: string | null
          visit_id: string
          visit_luc_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mobile_phone: string
          recorded_by: string
          technician_id: string
          updated_at?: string
          visit_environment_id?: string | null
          visit_id: string
          visit_luc_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mobile_phone?: string
          recorded_by?: string
          technician_id?: string
          updated_at?: string
          visit_environment_id?: string | null
          visit_id?: string
          visit_luc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_visit_technicians_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_technicians_visit_environment_id_fkey"
            columns: ["visit_environment_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_technicians_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visit_technicians_visit_luc_id_fkey"
            columns: ["visit_luc_id"]
            isOneToOne: false
            referencedRelation: "site_survey_visit_lucs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_visits: {
        Row: {
          address: string
          cancelled_at: string | null
          client_id: string | null
          client_unit_id: string | null
          completed_at: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          environments: Json
          id: string
          is_manual_entry: boolean
          luc_number: string | null
          notes: string | null
          project_id: string | null
          report_finalized_at: string | null
          report_time_summary: Json | null
          review_notes: string | null
          scheduled_end: string | null
          scheduled_start: string
          shop_name: string | null
          started_at: string | null
          status: string
          submitted_at: string | null
          survey_number: number
          technician_id: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          address: string
          cancelled_at?: string | null
          client_id?: string | null
          client_unit_id?: string | null
          completed_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          environments?: Json
          id?: string
          is_manual_entry?: boolean
          luc_number?: string | null
          notes?: string | null
          project_id?: string | null
          report_finalized_at?: string | null
          report_time_summary?: Json | null
          review_notes?: string | null
          scheduled_end?: string | null
          scheduled_start: string
          shop_name?: string | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          survey_number?: number
          technician_id: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          cancelled_at?: string | null
          client_id?: string | null
          client_unit_id?: string | null
          completed_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          environments?: Json
          id?: string
          is_manual_entry?: boolean
          luc_number?: string | null
          notes?: string | null
          project_id?: string | null
          report_finalized_at?: string | null
          report_time_summary?: Json | null
          review_notes?: string | null
          scheduled_end?: string | null
          scheduled_start?: string
          shop_name?: string | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          survey_number?: number
          technician_id?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visits_client_unit_id_fkey"
            columns: ["client_unit_id"]
            isOneToOne: false
            referencedRelation: "client_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visits_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_survey_visits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_wrench_sizes: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      stock_destinations: {
        Row: {
          active: boolean
          code: string
          created_at: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_inventories: {
        Row: {
          area: string
          completed_at: string | null
          counters: string[]
          created_at: string
          created_by: string
          id: string
          inventory_date: string
          items: Json
          name: string
          next_date: string | null
          recurrence_months: number
          status: string
        }
        Insert: {
          area: string
          completed_at?: string | null
          counters: string[]
          created_at?: string
          created_by: string
          id?: string
          inventory_date: string
          items?: Json
          name: string
          next_date?: string | null
          recurrence_months?: number
          status?: string
        }
        Update: {
          area?: string
          completed_at?: string | null
          counters?: string[]
          created_at?: string
          created_by?: string
          id?: string
          inventory_date?: string
          items?: Json
          name?: string
          next_date?: string | null
          recurrence_months?: number
          status?: string
        }
        Relationships: []
      }
      stock_inventory_signatures: {
        Row: {
          content_hash: string | null
          image: string | null
          inventory_id: string
          signed_at: string | null
          signer_name: string
          user_id: string
        }
        Insert: {
          content_hash?: string | null
          image?: string | null
          inventory_id: string
          signed_at?: string | null
          signer_name: string
          user_id: string
        }
        Update: {
          content_hash?: string | null
          image?: string | null
          inventory_id?: string
          signed_at?: string | null
          signer_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_inventory_signatures_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "stock_inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventory_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          entry_date: string | null
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
          entry_date?: string | null
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
          entry_date?: string | null
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
      supply_edit_notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          last_error: string | null
          log_id: string
          order_id: string
          requester_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          log_id: string
          order_id: string
          requester_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          log_id?: string
          order_id?: string
          requester_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_edit_notifications_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: true
            referencedRelation: "order_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_edit_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_order_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string | null
          order_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          file_name: string
          file_size?: number
          id?: string
          message_id?: string | null
          order_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string | null
          order_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_order_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "supply_order_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_order_messages: {
        Row: {
          author_id: string
          created_at: string
          id: string
          message: string
          message_type: string
          order_id: string
          parent_message_id: string | null
          recipient_id: string | null
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          message: string
          message_type: string
          order_id: string
          parent_message_id?: string | null
          recipient_id?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          order_id?: string
          parent_message_id?: string | null
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_order_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_order_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "supply_order_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_order_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_order_statuses: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          label: string
          position: number
          system_code: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          position?: number
          system_code?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          position?: number
          system_code?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: []
      }
      supply_tags: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
          stock_type_code: string | null
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
          stock_type_code?: string | null
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
          stock_type_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terceiros_materials_stock_type_code_fkey"
            columns: ["stock_type_code"]
            isOneToOne: false
            referencedRelation: "material_stock_types"
            referencedColumns: ["code"]
          },
        ]
      }
      terceiros_movements: {
        Row: {
          created_at: string
          created_by: string | null
          entry_date: string | null
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
          entry_date?: string | null
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
          entry_date?: string | null
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
          stock_type_code: string | null
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
          stock_type_code?: string | null
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
          stock_type_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_assets_stock_type_code_fkey"
            columns: ["stock_type_code"]
            isOneToOne: false
            referencedRelation: "material_stock_types"
            referencedColumns: ["code"]
          },
        ]
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
          destination_code: string | null
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
          destination_code?: string | null
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
          destination_code?: string | null
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
            foreignKeyName: "unit_products_destination_code_fkey"
            columns: ["destination_code"]
            isOneToOne: false
            referencedRelation: "stock_destinations"
            referencedColumns: ["code"]
          },
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
      user_additional_job_titles: {
        Row: {
          created_at: string
          id: string
          job_title_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_title_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_title_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_additional_job_titles_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
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
      user_operational_functions: {
        Row: {
          created_at: string
          id: string
          operational_function_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          operational_function_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          operational_function_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_operational_functions_operational_function_id_fkey"
            columns: ["operational_function_id"]
            isOneToOne: false
            referencedRelation: "operational_functions"
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
      user_signatures: {
        Row: {
          image: string
          updated_at: string
          user_id: string
        }
        Insert: {
          image: string
          updated_at?: string
          user_id: string
        }
        Update: {
          image?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlist_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          idea_id: string
          message_id: string | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          file_name: string
          file_size?: number
          id?: string
          idea_id: string
          message_id?: string | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          idea_id?: string
          message_id?: string | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_attachments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "wishlist_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "wishlist_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_ideas: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          expected_result: string
          id: string
          idealizer_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description: string
          expected_result?: string
          id?: string
          idealizer_id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          expected_result?: string
          id?: string
          idealizer_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_ideas_idealizer_id_fkey"
            columns: ["idealizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_logs: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          idea_id: string
          text: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          idea_id: string
          text: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          idea_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_logs_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "wishlist_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_messages: {
        Row: {
          author_id: string
          created_at: string
          id: string
          idea_id: string
          message: string
          message_type: string
          parent_message_id: string | null
          recipient_id: string | null
        }
        Insert: {
          author_id?: string
          created_at?: string
          id?: string
          idea_id: string
          message: string
          message_type: string
          parent_message_id?: string | null
          recipient_id?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          idea_id?: string
          message?: string
          message_type?: string
          parent_message_id?: string | null
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_messages_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "wishlist_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "wishlist_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_roadmap_steps: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          description: string
          due_date: string | null
          id: string
          idea_id: string
          position: number
          responsible_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          idea_id: string
          position?: number
          responsible_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          idea_id?: string
          position?: number
          responsible_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_roadmap_steps_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "wishlist_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_roadmap_steps_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      admin_delete_access_profile: {
        Args: { _destination_profile?: string; _source_profile: string }
        Returns: number
      }
      admin_delete_access_profile_individual: {
        Args: { _reallocations?: Json; _source_profile: string }
        Returns: number
      }
      admin_delete_request_type: { Args: { _code: string }; Returns: undefined }
      admin_edit_purchase_approval: {
        Args: { _changes: Json; _items: Json; _order_id: string }
        Returns: undefined
      }
      apply_verified_inventory_signature: {
        Args: {
          _expected_completed_at: string
          _inventory_id: string
          _user_id: string
        }
        Returns: string
      }
      apply_verified_legal_signature: {
        Args: {
          _expected_updated_at: string
          _participant_id: string
          _record_id: string
          _user_id: string
        }
        Returns: string
      }
      can_create_supply_new_item: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_edit_supply_purchase: { Args: never; Returns: boolean }
      can_inventory_area: { Args: { _area: string }; Returns: boolean }
      can_manage_cash_flow: { Args: { _user_id: string }; Returns: boolean }
      can_manage_limits: { Args: { _user_id: string }; Returns: boolean }
      can_manage_request_subtypes: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_manage_supply_tags: { Args: { _user_id: string }; Returns: boolean }
      can_request_type: {
        Args: { _request_type_code: string; _user_id: string }
        Returns: boolean
      }
      can_view_site_survey_visit: {
        Args: { _user_id: string; _visit_id: string }
        Returns: boolean
      }
      central_admin_snapshot: { Args: never; Returns: Json }
      central_source_exists: {
        Args: { i: string; k: string }
        Returns: boolean
      }
      code_can_open: { Args: never; Returns: boolean }
      code_conversation_users: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      code_question_participant: {
        Args: { _ticket_id: string }
        Returns: boolean
      }
      convert_client_to_unit: {
        Args: { _destination_client_id: string; _source_client_id: string }
        Returns: string
      }
      correct_site_survey_visit_luc: {
        Args: {
          _id: string
          _location: string
          _luc_number: string
          _shop_name: string
        }
        Returns: undefined
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
      crm_history_import_active: { Args: never; Returns: boolean }
      crm_import_history_batch: {
        Args: {
          _batch_key: string
          _originals?: Json
          _rows: Json
          _table: string
        }
        Returns: Json
      }
      crm_import_restore_lead_links: { Args: never; Returns: number }
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
      delete_code_observation: {
        Args: { _observation_id: string; _ticket_id: string }
        Returns: undefined
      }
      delete_site_survey_visit: {
        Args: { _delete_calls: boolean; _visit_id: string }
        Returns: number
      }
      edit_code_message: {
        Args: { _message_id: string; _text: string }
        Returns: undefined
      }
      edit_code_ticket_title: {
        Args: { _ticket_id: string; _title: string }
        Returns: undefined
      }
      get_client_deletion_links: {
        Args: { _client_id: string }
        Returns: {
          record_detail: string
          record_key: string
          record_label: string
          record_type: string
        }[]
      }
      get_diversos_deletion_links: {
        Args: { _registry: string; _source_code: string }
        Returns: {
          record_detail: string
          record_key: string
          record_label: string
          record_type: string
        }[]
      }
      get_project_deletion_links: {
        Args: { _project_id: string }
        Returns: {
          record_detail: string
          record_key: string
          record_label: string
          record_type: string
        }[]
      }
      get_site_survey_users: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
          mobile_phone: string
        }[]
      }
      has_job_title: {
        Args: { _job_title_id: string; _user_id: string }
        Returns: boolean
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
      has_site_survey_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      import_survey_client_report: {
        Args: {
          _edits: Json
          _file_name: string
          _items: Json
          _storage_path: string
          _visit_id: string
        }
        Returns: string
      }
      inventory_comparison: {
        Args: { _after?: string; _area: string; _until?: string }
        Returns: {
          factory_exits: number
          material_id: string
          purchases: number
        }[]
      }
      is_access_admin: { Args: { _user_id: string }; Returns: boolean }
      is_assigned_order_approver: {
        Args: { _order_id: string }
        Returns: boolean
      }
      is_customer_support_analyst: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_erp_admin: { Args: { _user_id: string }; Returns: boolean }
      is_inventory_signer: { Args: { _id: string }; Returns: boolean }
      is_supply_member: { Args: { _user_id: string }; Returns: boolean }
      is_supply_technician: { Args: { _user_id: string }; Returns: boolean }
      legal_attachment_visible: { Args: { _path: string }; Returns: boolean }
      legal_participant_users: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      legal_reorder_actions: {
        Args: {
          p_action_ids: string[]
          p_record_id: string
          p_subject_id: string
        }
        Returns: undefined
      }
      legal_subject_visible: {
        Args: { _record_id: string; _subject_id: string }
        Returns: boolean
      }
      legal_unsigned_content: { Args: { _content: Json }; Returns: Json }
      list_site_survey_visit_calls: {
        Args: { _visit_id: string }
        Returns: {
          call_number: string
          description: string
          id: string
          status: string
          title: string
        }[]
      }
      mark_code_question_alerts_read: {
        Args: { _ticket_id: string }
        Returns: undefined
      }
      mytosis_attachment_owned_object: {
        Args: { _path: string }
        Returns: boolean
      }
      mytosis_can_edit: { Args: { _user_id: string }; Returns: boolean }
      mytosis_can_post_kpi: {
        Args: { _kpi_id: string; _user_id: string }
        Returns: boolean
      }
      mytosis_node_can_converse: {
        Args: { _node_id: string; _user_id: string }
        Returns: boolean
      }
      mytosis_node_question_participant: {
        Args: { _node_id: string; _user_id: string }
        Returns: boolean
      }
      mytosis_pending_questions: {
        Args: never
        Returns: {
          author_name: string
          created_at: string
          message_id: string
          node_id: string
          node_title: string
          question_text: string
          task_id: string
          task_title: string
        }[]
      }
      mytosis_question_recipients: {
        Args: { _node_id: string; _task_id?: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      mytosis_role: { Args: { _user_id: string }; Returns: string }
      mytosis_segments: {
        Args: never
        Returns: {
          code: string
          id: string
          name: string
        }[]
      }
      mytosis_shape_format: { Args: { _shape: string }; Returns: Json }
      mytosis_task_can_converse: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      mytosis_users: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      normalize_site_survey_point_name: {
        Args: { _value: string }
        Returns: string
      }
      opdesk_add_observation: {
        Args: { _task_id: string; _text: string }
        Returns: string
      }
      opdesk_close_completed: { Args: never; Returns: number }
      opdesk_create_task: { Args: { _values: Json }; Returns: Json }
      opdesk_delete_task: {
        Args: { _expected_updated_at: string; _id: string }
        Returns: undefined
      }
      opdesk_directory: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      opdesk_flow_blocks: {
        Args: { _main: string; _rule: string; _sub: string }
        Returns: boolean
      }
      opdesk_has_access: { Args: never; Returns: boolean }
      opdesk_remove_responsible: {
        Args: { _user_id: string }
        Returns: undefined
      }
      opdesk_save_task: {
        Args: { _expected_updated_at?: string; _id: string; _values: Json }
        Returns: Json
      }
      personal_todo_users: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      pm_budget_catalog: {
        Args: never
        Returns: {
          code: string
          id: string
          name: string
          selected: boolean
        }[]
      }
      pm_bulk_tasks: {
        Args: { _changes: Json; _project: string }
        Returns: number
      }
      pm_can_create: { Args: never; Returns: boolean }
      pm_can_edit: { Args: { _project: string }; Returns: boolean }
      pm_can_manage: { Args: { _project: string }; Returns: boolean }
      pm_name_key: { Args: { n: string }; Returns: string }
      pm_pending_messages: {
        Args: never
        Returns: {
          created_at: string
          kind: string
          message_id: string
          project_id: string
          project_name: string
          task_id: string
          task_name: string
          text: string
        }[]
      }
      pm_reorder_phase_tasks: {
        Args: { _ids: string[]; _phase: string }
        Returns: undefined
      }
      pm_reorder_project_phases: {
        Args: { _ids: string[]; _project: string }
        Returns: undefined
      }
      pm_supply_catalog: {
        Args: never
        Returns: {
          id: string
          name: string
          project_type: string
        }[]
      }
      pm_team_candidates: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      public_app_order: { Args: never; Returns: string }
      reallocate_allocation_link: {
        Args: {
          _destination_id: string
          _destination_type: string
          _record_key: string
          _source_id: string
          _source_type: string
        }
        Returns: undefined
      }
      reallocate_client_link: {
        Args: {
          _destination_client_id: string
          _record_key: string
          _source_client_id: string
        }
        Returns: undefined
      }
      reallocate_diversos_link: {
        Args: {
          _destination_code: string
          _record_key: string
          _registry: string
          _source_code: string
        }
        Returns: undefined
      }
      reopen_code_ticket: {
        Args: { _reason: string; _ticket_id: string }
        Returns: undefined
      }
      reposition_mytosis_node: {
        Args: { _node_id: string; _target_id: string }
        Returns: undefined
      }
      request_user_deletion: {
        Args: { _target_user_id: string }
        Returns: string
      }
      reset_site_survey_visit: { Args: { _visit_id: string }; Returns: number }
      save_code_observation: {
        Args: { _observation_id?: string; _text: string; _ticket_id: string }
        Returns: string
      }
      save_stock_inventory: {
        Args: {
          _area: string
          _complete?: boolean
          _counters: string[]
          _date: string
          _id: string
          _items: Json
          _months: number
          _name: string
        }
        Returns: string
      }
      security_app_access: { Args: { _apps: string[] }; Returns: boolean }
      security_supply_menu_access: {
        Args: { _keys: string[] }
        Returns: boolean
      }
      set_technician_mobile_phone: {
        Args: { _mobile_phone: string; _technician_id: string }
        Returns: undefined
      }
      set_user_access_profile: {
        Args: {
          _profile: Database["public"]["Enums"]["access_profile"]
          _target_user_id: string
        }
        Returns: undefined
      }
      split_mytosis_node: {
        Args: { _count: number; _node_id: string }
        Returns: string[]
      }
      supply_conversation_users: {
        Args: { _order_id: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      supply_edit_purchase: {
        Args: {
          _changes: Json
          _items: Json
          _order_id: string
          _reason: string
        }
        Returns: Json
      }
      survey_point_edit_lease: {
        Args: {
          _acquire?: boolean
          _point_id: string
          _point_kind: string
          _release?: boolean
          _session_id: string
        }
        Returns: Json
      }
      wishlist_can_access: { Args: never; Returns: boolean }
      wishlist_users: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      wrap_mytosis_node: {
        Args: { _new_id: string; _node_id: string }
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
