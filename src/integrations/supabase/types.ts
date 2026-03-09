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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          balance: number
          created_at: string
          family_id: string
          id: string
          institution: string
          is_featured: boolean
          monthly_balances: Json
          name: string
          savings_goal: number | null
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          family_id: string
          id?: string
          institution: string
          is_featured?: boolean
          monthly_balances?: Json
          name: string
          savings_goal?: number | null
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          family_id?: string
          id?: string
          institution?: string
          is_featured?: boolean
          monthly_balances?: Json
          name?: string
          savings_goal?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          connected: boolean
          created_at: string
          email: string
          family_id: string
          id: string
          member_id: string
          provider: string
        }
        Insert: {
          connected?: boolean
          created_at?: string
          email?: string
          family_id: string
          id?: string
          member_id: string
          provider: string
        }
        Update: {
          connected?: boolean
          created_at?: string
          email?: string
          family_id?: string
          id?: string
          member_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_connections_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          date: string
          description: string | null
          end_time: string
          family_id: string
          id: string
          is_task: boolean | null
          member_id: string
          recurrence: string
          start_time: string
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          end_time: string
          family_id: string
          id?: string
          is_task?: boolean | null
          member_id: string
          recurrence?: string
          start_time: string
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          end_time?: string
          family_id?: string
          id?: string
          is_task?: boolean | null
          member_id?: string
          recurrence?: string
          start_time?: string
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          avatar_url: string | null
          color_index: number
          created_at: string
          email: string | null
          family_id: string
          id: string
          invite_status: string | null
          is_owner: boolean
          name: string
          role: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          color_index?: number
          created_at?: string
          email?: string | null
          family_id: string
          id?: string
          invite_status?: string | null
          is_owner?: boolean
          name: string
          role: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          color_index?: number
          created_at?: string
          email?: string | null
          family_id?: string
          id?: string
          invite_status?: string | null
          is_owner?: boolean
          name?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan: {
        Row: {
          created_at: string
          date: string
          family_id: string
          id: string
          meal_type: string
          recipe_id: string
        }
        Insert: {
          created_at?: string
          date: string
          family_id: string
          id?: string
          meal_type: string
          recipe_id: string
        }
        Update: {
          created_at?: string
          date?: string
          family_id?: string
          id?: string
          meal_type?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          color_index: number
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          color_index?: number
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          color_index?: number
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          cook_time: number | null
          created_at: string
          description: string | null
          family_id: string
          id: string
          image_url: string | null
          ingredients: Json
          prep_time: number | null
          servings: number | null
          source_url: string | null
          steps: Json
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          cook_time?: number | null
          created_at?: string
          description?: string | null
          family_id: string
          id?: string
          image_url?: string | null
          ingredients?: Json
          prep_time?: number | null
          servings?: number | null
          source_url?: string | null
          steps?: Json
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          cook_time?: number | null
          created_at?: string
          description?: string | null
          family_id?: string
          id?: string
          image_url?: string | null
          ingredients?: Json
          prep_time?: number | null
          servings?: number | null
          source_url?: string | null
          steps?: Json
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list: {
        Row: {
          amount: string
          category: string
          checked: boolean
          created_at: string
          family_id: string
          id: string
          name: string
          unit: string
        }
        Insert: {
          amount: string
          category: string
          checked?: boolean
          created_at?: string
          family_id: string
          id?: string
          name: string
          unit: string
        }
        Update: {
          amount?: string
          category?: string
          checked?: boolean
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          member_id: string
          task_id: string
        }
        Insert: {
          member_id: string
          task_id: string
        }
        Update: {
          member_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          created_at: string
          family_id: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          family_id: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          family_id?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category_id: string | null
          created_at: string
          deadline: string | null
          deadline_time: string | null
          description: string | null
          family_id: string
          id: string
          recurrence: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deadline?: string | null
          deadline_time?: string | null
          description?: string | null
          family_id: string
          id?: string
          recurrence?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deadline?: string | null
          deadline_time?: string | null
          description?: string | null
          family_id?: string
          id?: string
          recurrence?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          family_id: string
          id: string
        }
        Insert: {
          account_id: string
          amount: number
          category: string
          created_at?: string
          date: string
          description: string
          family_id: string
          id?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          family_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_family_member: { Args: { _family_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
