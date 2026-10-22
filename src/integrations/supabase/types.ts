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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          detail: Json
          id: string
          target: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          detail?: Json
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          detail?: Json
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      assessment_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          level: string
          questions: Json
          score: number
          topic: string
          total: number
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          level: string
          questions: Json
          score: number
          topic: string
          total: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          level?: string
          questions?: Json
          score?: number
          topic?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      code_submissions: {
        Row: {
          code: string
          created_at: string
          id: string
          language: string
          problem: string
          review: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          language: string
          problem: string
          review?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          language?: string
          problem?: string
          review?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          answers: Json
          created_at: string
          experience: string | null
          id: string
          mode: string
          package: string | null
          proctor: Json | null
          questions: Json
          result: Json | null
          target_role: string | null
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          experience?: string | null
          id?: string
          mode: string
          package?: string | null
          proctor?: Json | null
          questions?: Json
          result?: Json | null
          target_role?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          experience?: string | null
          id?: string
          mode?: string
          package?: string | null
          proctor?: Json | null
          questions?: Json
          result?: Json | null
          target_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applied_on: string | null
          company: string
          created_at: string
          deadline: string | null
          id: string
          next_action: string | null
          notes: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          applied_on?: string | null
          company: string
          created_at?: string
          deadline?: string | null
          id?: string
          next_action?: string | null
          notes?: string | null
          role: string
          status?: string
          user_id: string
        }
        Update: {
          applied_on?: string | null
          company?: string
          created_at?: string
          deadline?: string | null
          id?: string
          next_action?: string | null
          notes?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      mentor_messages: {
        Row: {
          created_at: string
          id: string
          message: Json
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: Json
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: Json
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "mentor_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          education_level: string | null
          email: string | null
          full_name: string | null
          id: string
          skills: string | null
          target_role: string | null
          updated_at: string
          weekly_hours: number | null
        }
        Insert: {
          created_at?: string
          education_level?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          skills?: string | null
          target_role?: string | null
          updated_at?: string
          weekly_hours?: number | null
        }
        Update: {
          created_at?: string
          education_level?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          skills?: string | null
          target_role?: string | null
          updated_at?: string
          weekly_hours?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          link: string | null
          status: string
          tech: string | null
          title: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          status?: string
          tech?: string | null
          title: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          status?: string
          tech?: string | null
          title?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      resume_analyses: {
        Row: {
          created_at: string
          id: string
          result: Json
          target_role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result: Json
          target_role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result?: Json
          target_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resume_chunks: {
        Row: {
          analysis_id: string | null
          content: string
          created_at: string
          embedding: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          content: string
          created_at?: string
          embedding: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      signup_codes: {
        Row: {
          attempts: number
          code_hash: string
          email: string
          expires_at: string
          sent_at: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          email: string
          expires_at: string
          sent_at?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          email?: string
          expires_at?: string
          sent_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_resume_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
