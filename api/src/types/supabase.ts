export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      data_source_connections: {
        Row: {
          account_identifier: string | null
          created_at: string
          credentials: Json | null
          id: string
          preferences: Json | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_identifier?: string | null
          created_at?: string
          credentials?: Json | null
          id?: string
          preferences?: Json | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_identifier?: string | null
          created_at?: string
          credentials?: Json | null
          id?: string
          preferences?: Json | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_calendar_events: {
        Row: {
          connection_id: string
          created_at: string
          description: string | null
          event_date: string
          id: string
          is_all_day: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          is_all_day?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          is_all_day?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_calendar_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "data_source_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_finance_entries: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          entry_date: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_finance_settings: {
        Row: {
          created_at: string
          currency: string | null
          current_balance: number | null
          daily_allowance_goal: number | null
          id: string
          salary_schedule: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          current_balance?: number | null
          daily_allowance_goal?: number | null
          id?: string
          salary_schedule?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          current_balance?: number | null
          daily_allowance_goal?: number | null
          id?: string
          salary_schedule?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_habit_entries: {
        Row: {
          completed: boolean
          created_at: string
          entry_date: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          entry_date: string
          habit_id: string
          id?: string
          user_id?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          entry_date?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_habit_entries_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "manual_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_habits: {
        Row: {
          created_at: string
          enable_notification: boolean
          id: string
          log_type: Database["public"]["Enums"]["habit_log_type"]
          name: string
          reminder_time: string | null
          type: Database["public"]["Enums"]["habit_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enable_notification?: boolean
          id?: string
          log_type?: Database["public"]["Enums"]["habit_log_type"]
          name: string
          reminder_time?: string | null
          type: Database["public"]["Enums"]["habit_type"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          enable_notification?: boolean
          id?: string
          log_type?: Database["public"]["Enums"]["habit_log_type"]
          name?: string
          reminder_time?: string | null
          type?: Database["public"]["Enums"]["habit_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_health_entries: {
        Row: {
          connection_id: string
          created_at: string
          entry_date: string
          id: string
          type: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          connection_id: string
          created_at?: string
          entry_date: string
          id?: string
          type: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          connection_id?: string
          created_at?: string
          entry_date?: string
          id?: string
          type?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_health_entries_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "data_source_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_health_settings: {
        Row: {
          created_at: string
          daily_steps_goal: number
          id: string
          updated_at: string
          user_id: string
          weight_goal: number | null
        }
        Insert: {
          created_at?: string
          daily_steps_goal?: number
          id?: string
          updated_at?: string
          user_id: string
          weight_goal?: number | null
        }
        Update: {
          created_at?: string
          daily_steps_goal?: number
          id?: string
          updated_at?: string
          user_id?: string
          weight_goal?: number | null
        }
        Relationships: []
      }
      manual_todo_items: {
        Row: {
          connection_id: string
          created_at: string
          due_date: string | null
          id: string
          is_completed: boolean
          level: number
          parent_id: string | null
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          level?: number
          parent_id?: string | null
          position: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          level?: number
          parent_id?: string | null
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_manual_todo_items_parent"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "manual_todo_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_todo_items_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "data_source_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          read_at: string | null
          related_entity_id: string | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          related_entity_id?: string | null
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          related_entity_id?: string | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quest_criteria: {
        Row: {
          config: Json | null
          created_at: string
          current_progress: number
          description: string
          id: string
          is_met: boolean
          quest_id: string
          target_count: number
          type: Database["public"]["Enums"]["quest_criteria_type"]
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          current_progress?: number
          description: string
          id?: string
          is_met?: boolean
          quest_id: string
          target_count?: number
          type: Database["public"]["Enums"]["quest_criteria_type"]
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          current_progress?: number
          description?: string
          id?: string
          is_met?: boolean
          quest_id?: string
          target_count?: number
          type?: Database["public"]["Enums"]["quest_criteria_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_criteria_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          activated_at: string | null
          cancelled_at: string | null
          claimable_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          generated_at: string
          id: string
          llm_prompt_context: Json | null
          llm_response_raw: Json | null
          source: Database["public"]["Enums"]["quest_source"]
          status: Database["public"]["Enums"]["quest_status"]
          type: Database["public"]["Enums"]["quest_type"]
          updated_at: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          activated_at?: string | null
          cancelled_at?: string | null
          claimable_at?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          generated_at?: string
          id?: string
          llm_prompt_context?: Json | null
          llm_response_raw?: Json | null
          source?: Database["public"]["Enums"]["quest_source"]
          status?: Database["public"]["Enums"]["quest_status"]
          type?: Database["public"]["Enums"]["quest_type"]
          updated_at?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          activated_at?: string | null
          cancelled_at?: string | null
          claimable_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          generated_at?: string
          id?: string
          llm_prompt_context?: Json | null
          llm_response_raw?: Json | null
          source?: Database["public"]["Enums"]["quest_source"]
          status?: Database["public"]["Enums"]["quest_status"]
          type?: Database["public"]["Enums"]["quest_type"]
          updated_at?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      user_dashboard_layouts: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          layout: Json | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          layout?: Json | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          layout?: Json | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          created_at: string
          level: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          level?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          level?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_quest_state: {
        Row: {
          created_at: string
          last_daily_generated_at: string | null
          last_weekly_generated_at: string | null
          next_weekly_reset_allowed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_daily_generated_at?: string | null
          last_weekly_generated_at?: string | null
          next_weekly_reset_allowed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_daily_generated_at?: string | null
          last_weekly_generated_at?: string | null
          next_weekly_reset_allowed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          notification_permission: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notification_permission?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          notification_permission?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_habit_log_type: {
        Args: { h_id: string }
        Returns: Database["public"]["Enums"]["habit_log_type"]
      }
      move_todo_item: {
        Args: { p_user_id: string; p_item_id: string; p_direction: string }
        Returns: undefined
      }
    }
    Enums: {
      habit_log_type: "once_daily" | "multiple_daily"
      habit_type: "positive" | "negative"
      quest_criteria_type:
        | "habit_check"
        | "steps_reach"
        | "finance_under_allowance"
        | "pomodoro_session"
        | "todo_complete"
      quest_source: "manual" | "llm_generated"
      quest_status:
        | "available"
        | "active"
        | "claimable"
        | "completed"
        | "cancelled"
      quest_type: "daily" | "weekly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      habit_log_type: ["once_daily", "multiple_daily"],
      habit_type: ["positive", "negative"],
      quest_criteria_type: [
        "habit_check",
        "steps_reach",
        "finance_under_allowance",
        "pomodoro_session",
        "todo_complete",
      ],
      quest_source: ["manual", "llm_generated"],
      quest_status: [
        "available",
        "active",
        "claimable",
        "completed",
        "cancelled",
      ],
      quest_type: ["daily", "weekly"],
    },
  },
} as const
