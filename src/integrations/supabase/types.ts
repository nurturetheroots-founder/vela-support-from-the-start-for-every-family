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
      assignments: {
        Row: {
          assigned_at: string
          doula_id: string
          family_id: string
          id: string
        }
        Insert: {
          assigned_at?: string
          doula_id: string
          family_id: string
          id?: string
        }
        Update: {
          assigned_at?: string
          doula_id?: string
          family_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_doula_id_fkey"
            columns: ["doula_id"]
            isOneToOne: false
            referencedRelation: "doulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      babies: {
        Row: {
          birth_date: string | null
          created_at: string
          id: string
          name: string
          parent_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string
        }
        Relationships: []
      }
      care_logs: {
        Row: {
          baby_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["care_event_type"]
          id: string
          logged_by: string
          payload: Json
          timestamp: string
        }
        Insert: {
          baby_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["care_event_type"]
          id?: string
          logged_by?: string
          payload?: Json
          timestamp?: string
        }
        Update: {
          baby_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["care_event_type"]
          id?: string
          logged_by?: string
          payload?: Json
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_logs_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          family_id: string
          feeding: string | null
          id: string
          local_date: string
          mood: number | null
          note: string | null
          overall: number | null
          sleep: string | null
          submitted_at: string
        }
        Insert: {
          family_id: string
          feeding?: string | null
          id?: string
          local_date: string
          mood?: number | null
          note?: string | null
          overall?: number | null
          sleep?: string | null
          submitted_at?: string
        }
        Update: {
          family_id?: string
          feeding?: string | null
          id?: string
          local_date?: string
          mood?: number | null
          note?: string | null
          overall?: number | null
          sleep?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          consent_type: string
          family_id: string
          granted_at: string
          id: string
          version: string
        }
        Insert: {
          consent_type: string
          family_id: string
          granted_at?: string
          id?: string
          version: string
        }
        Update: {
          consent_type?: string
          family_id?: string
          granted_at?: string
          id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      content_views: {
        Row: {
          content_id: string
          family_id: string
          id: string
          viewed_at: string
        }
        Insert: {
          content_id: string
          family_id: string
          id?: string
          viewed_at?: string
        }
        Update: {
          content_id?: string
          family_id?: string
          id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_views_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      derived_signals: {
        Row: {
          computed_at: string
          family_id: string
          id: string
          rule_version: string
          signal_type: string
        }
        Insert: {
          computed_at?: string
          family_id: string
          id?: string
          rule_version: string
          signal_type: string
        }
        Update: {
          computed_at?: string
          family_id?: string
          id?: string
          rule_version?: string
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "derived_signals_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      doulas: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          languages: string[]
          name: string
          specialties: string[]
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          languages?: string[]
          name: string
          specialties?: string[]
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          languages?: string[]
          name?: string
          specialties?: string[]
        }
        Relationships: []
      }
      epds_administrations: {
        Row: {
          administered_at: string
          family_id: string
          id: string
          local_date: string
          total_score: number | null
          trigger_reason: string | null
        }
        Insert: {
          administered_at?: string
          family_id: string
          id?: string
          local_date: string
          total_score?: number | null
          trigger_reason?: string | null
        }
        Update: {
          administered_at?: string
          family_id?: string
          id?: string
          local_date?: string
          total_score?: number | null
          trigger_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epds_administrations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      epds_responses: {
        Row: {
          administration_id: string
          id: string
          item_number: number
          response_value: number
        }
        Insert: {
          administration_id: string
          id?: string
          item_number: number
          response_value: number
        }
        Update: {
          administration_id?: string
          id?: string
          item_number?: number
          response_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "epds_responses_administration_id_fkey"
            columns: ["administration_id"]
            isOneToOne: false
            referencedRelation: "epds_administrations"
            referencedColumns: ["id"]
          },
        ]
      }
      escalations: {
        Row: {
          family_id: string
          id: string
          resolved_at: string | null
          status: string
          trigger_detail: string | null
          trigger_type: string
          triggered_at: string
        }
        Insert: {
          family_id: string
          id?: string
          resolved_at?: string | null
          status?: string
          trigger_detail?: string | null
          trigger_type: string
          triggered_at?: string
        }
        Update: {
          family_id?: string
          id?: string
          resolved_at?: string | null
          status?: string
          trigger_detail?: string | null
          trigger_type?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          due_or_birth_date: string | null
          email: string | null
          id: string
          timezone: string
        }
        Insert: {
          created_at?: string
          due_or_birth_date?: string | null
          email?: string | null
          id?: string
          timezone?: string
        }
        Update: {
          created_at?: string
          due_or_birth_date?: string | null
          email?: string | null
          id?: string
          timezone?: string
        }
        Relationships: []
      }
      family_invites: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          family_id: string
          id: string
          revoked: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          family_id: string
          id?: string
          revoked?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          family_id?: string
          id?: string
          revoked?: boolean
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string
          family_id: string
          id: string
          permissions: Json
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: []
      }
      parent_daily_checkins: {
        Row: {
          checkin_id: string
          created_at: string
          feeding_status: string | null
          logged_date: string
          mood_score: number | null
          overall_score: number | null
          parent_health_notes: string | null
          parent_id: string
          requires_support_flag: boolean
          sleep_quality: string | null
        }
        Insert: {
          checkin_id?: string
          created_at?: string
          feeding_status?: string | null
          logged_date?: string
          mood_score?: number | null
          overall_score?: number | null
          parent_health_notes?: string | null
          parent_id: string
          requires_support_flag?: boolean
          sleep_quality?: string | null
        }
        Update: {
          checkin_id?: string
          created_at?: string
          feeding_status?: string | null
          logged_date?: string
          mood_score?: number | null
          overall_score?: number | null
          parent_health_notes?: string | null
          parent_id?: string
          requires_support_flag?: boolean
          sleep_quality?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_daily_checkins_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["parent_id"]
          },
        ]
      }
      parents: {
        Row: {
          birth_date: string | null
          consented_at: string | null
          created_at: string
          display_name: string
          due_date: string | null
          focuses: string[]
          insurance: string | null
          parent_id: string
          role: Database["public"]["Enums"]["member_role"]
          stage: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          birth_date?: string | null
          consented_at?: string | null
          created_at?: string
          display_name?: string
          due_date?: string | null
          focuses?: string[]
          insurance?: string | null
          parent_id: string
          role?: Database["public"]["Enums"]["member_role"]
          stage?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          birth_date?: string | null
          consented_at?: string | null
          created_at?: string
          display_name?: string
          due_date?: string | null
          focuses?: string[]
          insurance?: string | null
          parent_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          stage?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      review_queue: {
        Row: {
          approved_at: string | null
          category: string | null
          clinical_context: string | null
          created_at: string
          family_id: string
          id: string
          outreach_draft: string
          pattern_noticed: string
          responded_at: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          category?: string | null
          clinical_context?: string | null
          created_at?: string
          family_id: string
          id?: string
          outreach_draft: string
          pattern_noticed: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          category?: string | null
          clinical_context?: string | null
          created_at?: string
          family_id?: string
          id?: string
          outreach_draft?: string
          pattern_noticed?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_queue_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handovers: {
        Row: {
          baby_id: string
          caregiver_id: string
          caregiver_notes: string | null
          created_at: string
          id: string
          shift_end: string
          shift_start: string
          status: Database["public"]["Enums"]["shift_handover_status"]
          summary_metrics: Json
        }
        Insert: {
          baby_id: string
          caregiver_id?: string
          caregiver_notes?: string | null
          created_at?: string
          id?: string
          shift_end: string
          shift_start: string
          status?: Database["public"]["Enums"]["shift_handover_status"]
          summary_metrics?: Json
        }
        Update: {
          baby_id?: string
          caregiver_id?: string
          caregiver_notes?: string | null
          created_at?: string
          id?: string
          shift_end?: string
          shift_start?: string
          status?: Database["public"]["Enums"]["shift_handover_status"]
          summary_metrics?: Json
        }
        Relationships: [
          {
            foreignKeyName: "shift_handovers_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_family_invite: { Args: never; Returns: string }
      is_family_caregiver: { Args: { _family_id: string }; Returns: boolean }
      redeem_family_invite: {
        Args: { _code: string; _display_name: string }
        Returns: string
      }
    }
    Enums: {
      care_event_type: "feed" | "diaper" | "sleep" | "observation"
      member_role: "parent" | "caregiver"
      shift_handover_status: "draft" | "published"
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
      care_event_type: ["feed", "diaper", "sleep", "observation"],
      member_role: ["parent", "caregiver"],
      shift_handover_status: ["draft", "published"],
    },
  },
} as const
