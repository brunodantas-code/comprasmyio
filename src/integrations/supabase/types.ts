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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
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
          client_name: string
          created_at: string
          created_by: string | null
          delivery_date: string
          id: string
          is_replacement: boolean
          notes: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["myio_order_status"]
          title: string
          updated_at: string
        }
        Insert: {
          client_name?: string
          created_at?: string
          created_by?: string | null
          delivery_date: string
          id?: string
          is_replacement?: boolean
          notes?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["myio_order_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          id?: string
          is_replacement?: boolean
          notes?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["myio_order_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "myio_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          created_at: string
          email: string | null
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_cnpj: string | null
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          client_cnpj?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          client_cnpj?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
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
          attachments: Json
          buyer_notes: string | null
          created_at: string
          deadline_date: string | null
          deadline_type: Database["public"]["Enums"]["deadline_type"]
          delivery_forecast: string | null
          delivery_point: string
          id: string
          item_link: string | null
          item_name: string
          material_id: string | null
          passphrase: string | null
          project_id: string
          quantity: number
          recipient: string
          requester_id: string
          requester_notes: string | null
          status: Database["public"]["Enums"]["order_status"]
          terceiros_material_id: string | null
          tool_asset_id: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json
          buyer_notes?: string | null
          created_at?: string
          deadline_date?: string | null
          deadline_type?: Database["public"]["Enums"]["deadline_type"]
          delivery_forecast?: string | null
          delivery_point: string
          id?: string
          item_link?: string | null
          item_name: string
          material_id?: string | null
          passphrase?: string | null
          project_id: string
          quantity?: number
          recipient?: string
          requester_id: string
          requester_notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          terceiros_material_id?: string | null
          tool_asset_id?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json
          buyer_notes?: string | null
          created_at?: string
          deadline_date?: string | null
          deadline_type?: Database["public"]["Enums"]["deadline_type"]
          delivery_forecast?: string | null
          delivery_point?: string
          id?: string
          item_link?: string | null
          item_name?: string
          material_id?: string | null
          passphrase?: string | null
          project_id?: string
          quantity?: number
          recipient?: string
          requester_id?: string
          requester_notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          terceiros_material_id?: string | null
          tool_asset_id?: string | null
          updated_at?: string
        }
        Relationships: [
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
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "comprador" | "solicitante" | "fabrica"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "comprador", "solicitante", "fabrica"],
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
