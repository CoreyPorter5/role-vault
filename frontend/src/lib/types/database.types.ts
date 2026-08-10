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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      jobs: {
        Row: {
          added_at: string
          company_logo: string | null
          company_name: string
          date_synced: string
          id: string
          job_description: string
          job_pay: string | null
          job_title: string
          job_type: string | null
          location: string
          resume_category: string | null
          resume_category_classifier_model: string | null
          resume_category_classifier_version: number | null
          resume_category_confidence: number | null
          resume_category_failure_code: string | null
          resume_category_resolved_at: string | null
          resume_category_source: string | null
          resume_category_started_at: string | null
          resume_category_status: string
          seek_job_id: string
          status: Database["public"]["Enums"]["job_status"]
          user_id: string
        }
        Insert: {
          added_at?: string
          company_logo?: string | null
          company_name: string
          date_synced?: string
          id?: string
          job_description: string
          job_pay?: string | null
          job_title: string
          job_type?: string | null
          location: string
          resume_category?: string | null
          resume_category_classifier_model?: string | null
          resume_category_classifier_version?: number | null
          resume_category_confidence?: number | null
          resume_category_failure_code?: string | null
          resume_category_resolved_at?: string | null
          resume_category_source?: string | null
          resume_category_started_at?: string | null
          resume_category_status?: string
          seek_job_id: string
          status?: Database["public"]["Enums"]["job_status"]
          user_id?: string
        }
        Update: {
          added_at?: string
          company_logo?: string | null
          company_name?: string
          date_synced?: string
          id?: string
          job_description?: string
          job_pay?: string | null
          job_title?: string
          job_type?: string | null
          location?: string
          resume_category?: string | null
          resume_category_classifier_model?: string | null
          resume_category_classifier_version?: number | null
          resume_category_confidence?: number | null
          resume_category_failure_code?: string | null
          resume_category_resolved_at?: string | null
          resume_category_source?: string | null
          resume_category_started_at?: string | null
          resume_category_status?: string
          seek_job_id?: string
          status?: Database["public"]["Enums"]["job_status"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          last_name: string
          plan: string
          resume_generations_limit: number
          resume_generations_used: number
          resume_usage_period_end: string
          resume_usage_period_start: string
          stripe_customer_id: string | null
          stripe_last_event_id: string | null
          stripe_payment_status: string | null
          stripe_state_event_created_at: number
          stripe_state_event_priority: number
          stripe_subscription_id: string | null
          subscription_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          last_name: string
          plan?: string
          resume_generations_limit?: number
          resume_generations_used?: number
          resume_usage_period_end?: string
          resume_usage_period_start?: string
          stripe_customer_id?: string | null
          stripe_last_event_id?: string | null
          stripe_payment_status?: string | null
          stripe_state_event_created_at?: number
          stripe_state_event_priority?: number
          stripe_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          last_name?: string
          plan?: string
          resume_generations_limit?: number
          resume_generations_used?: number
          resume_usage_period_end?: string
          resume_usage_period_start?: string
          stripe_customer_id?: string | null
          stripe_last_event_id?: string | null
          stripe_payment_status?: string | null
          stripe_state_event_created_at?: number
          stripe_state_event_priority?: number
          stripe_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_generation_attempts: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          credit_charged: boolean
          failure_code: string | null
          failure_detail: string | null
          id: string
          model: string
          profile_version: number
          refunded_at: string | null
          repair_attempted: boolean
          resume_category: string
          result_json: Json | null
          seek_job_id: string
          status: string
          template_version: string
          token_usage: Json | null
          updated_at: string
          usage_period_start: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          credit_charged?: boolean
          failure_code?: string | null
          failure_detail?: string | null
          id: string
          model: string
          profile_version: number
          refunded_at?: string | null
          repair_attempted?: boolean
          resume_category: string
          result_json?: Json | null
          seek_job_id: string
          status?: string
          template_version: string
          token_usage?: Json | null
          updated_at?: string
          usage_period_start: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          credit_charged?: boolean
          failure_code?: string | null
          failure_detail?: string | null
          id?: string
          model?: string
          profile_version?: number
          refunded_at?: string | null
          repair_attempted?: boolean
          resume_category?: string
          result_json?: Json | null
          seek_job_id?: string
          status?: string
          template_version?: string
          token_usage?: Json | null
          updated_at?: string
          usage_period_start?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          event_created_at: number
          event_id: string
          event_type: string
          object_id: string | null
          processed_at: string
        }
        Insert: {
          event_created_at: number
          event_id: string
          event_type: string
          object_id?: string | null
          processed_at?: string
        }
        Update: {
          event_created_at?: number
          event_id?: string
          event_type?: string
          object_id?: string | null
          processed_at?: string
        }
        Relationships: []
      }
      user_generated_resume_drafts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          profile_version: number
          resume_json: Json
          resume_category: string
          seek_job_id: string
          updated_at: string
          template_version: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          profile_version: number
          resume_json: Json
          resume_category: string
          seek_job_id: string
          updated_at?: string
          template_version: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          profile_version?: number
          resume_json?: Json
          resume_category?: string
          seek_job_id?: string
          updated_at?: string
          template_version?: string
          user_id?: string
        }
        Relationships: []
      }
      user_generated_resumes: {
        Row: {
          created_at: string
          id: number
          mime_type: string
          original_filename: string
          profile_version: number
          resume_json: Json
          resume_category: string
          seek_job_id: string
          storage_path: string
          updated_at: string
          template_version: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          mime_type: string
          original_filename: string
          profile_version: number
          resume_json: Json
          resume_category: string
          seek_job_id: string
          storage_path: string
          updated_at?: string
          template_version: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          mime_type?: string
          original_filename?: string
          profile_version?: number
          resume_json?: Json
          resume_category?: string
          seek_job_id?: string
          storage_path?: string
          updated_at?: string
          template_version?: string
          user_id?: string
        }
        Relationships: []
      }
      user_master_resumes: {
        Row: {
          created_at: string
          mime_type: string
          original_filename: string
          plaintext: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          mime_type?: string
          original_filename: string
          plaintext: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          mime_type?: string
          original_filename?: string
          plaintext?: string
          storage_path?: string
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
      [_ in never]: never
    }
    Enums: {
      job_status:
        | "Saved"
        | "Applied"
        | "Interviewing"
        | "Offer"
        | "Rejected"
        | "Accepted"
      mime_type: "application/pdf" | "application/docx" | "application/doc"
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
      job_status: [
        "Saved",
        "Applied",
        "Interviewing",
        "Offer",
        "Rejected",
        "Accepted",
      ],
      mime_type: ["application/pdf", "application/docx", "application/doc"],
    },
  },
} as const
