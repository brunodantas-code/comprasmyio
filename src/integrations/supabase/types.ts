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
      materials: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          link: string | null
          location: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          location?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          location?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          order_id: string | null
          quantity: number
          reason: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          order_id?: string | null
          quantity: number
          reason?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          order_id?: string | null
          quantity?: number
          reason?: string | null
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
      app_role: "admin" | "comprador" | "solicitante"
      deadline_type: "urgente" | "esta_semana" | "este_mes" | "customizado"
      myio_order_status:
        | "pendente"
        | "produzindo"
        | "pronto_entrega"
        | "entregue_cliente"
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
      app_role: ["admin", "comprador", "solicitante"],
      deadline_type: ["urgente", "esta_semana", "este_mes", "customizado"],
      myio_order_status: [
        "pendente",
        "produzindo",
        "pronto_entrega",
        "entregue_cliente",
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
