// Generated types from Supabase
// This file will be updated once the database schema is created

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      forms: {
        Row: {
          id: string
          user_id: string
          name: string
          site_url: string
          api_key: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          site_url: string
          api_key?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          site_url?: string
          api_key?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      form_configs: {
        Row: {
          id: string
          form_id: string
          enable_url_detection: boolean
          enable_paste_detection: boolean
          threshold_sales: number
          threshold_spam: number
          banned_keywords: string[]
          allowed_domains: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          enable_url_detection?: boolean
          enable_paste_detection?: boolean
          threshold_sales?: number
          threshold_spam?: number
          banned_keywords?: string[]
          allowed_domains?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          enable_url_detection?: boolean
          enable_paste_detection?: boolean
          threshold_sales?: number
          threshold_spam?: number
          banned_keywords?: string[]
          allowed_domains?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_configs_form_id_fkey"
            columns: ["form_id"]
            referencedRelation: "forms"
            referencedColumns: ["id"]
          }
        ]
      }
      submissions: {
        Row: {
          id: string
          form_id: string
          status: 'allowed' | 'challenged' | 'held' | 'blocked'
          score_sales: number
          score_spam: number
          final_decision: string
          content: Json
          metadata: Json
          detection_reasons: string[]
          llm_reasoning: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          status: 'allowed' | 'challenged' | 'held' | 'blocked'
          score_sales: number
          score_spam: number
          final_decision: string
          content: Json
          metadata: Json
          detection_reasons?: string[]
          llm_reasoning?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          status?: 'allowed' | 'challenged' | 'held' | 'blocked'
          score_sales?: number
          score_spam?: number
          final_decision?: string
          content?: Json
          metadata?: Json
          detection_reasons?: string[]
          llm_reasoning?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_form_id_fkey"
            columns: ["form_id"]
            referencedRelation: "forms"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          form_id: string
          type: 'email' | 'webhook' | 'dashboard'
          enabled: boolean
          condition: Json
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          type: 'email' | 'webhook' | 'dashboard'
          enabled?: boolean
          condition: Json
          config: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          type?: 'email' | 'webhook' | 'dashboard'
          enabled?: boolean
          condition?: Json
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_form_id_fkey"
            columns: ["form_id"]
            referencedRelation: "forms"
            referencedColumns: ["id"]
          }
        ]
      }
      appeals: {
        Row: {
          id: string
          submission_id: string
          reason: string
          contact_info: Json | null
          status: 'pending' | 'approved' | 'rejected'
          admin_notes: string | null
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          reason: string
          contact_info?: Json | null
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          reason?: string
          contact_info?: Json | null
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_submission_id_fkey"
            columns: ["submission_id"]
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      submission_status: 'allowed' | 'challenged' | 'held' | 'blocked'
      notification_type: 'email' | 'webhook' | 'dashboard'
      appeal_status: 'pending' | 'approved' | 'rejected'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
