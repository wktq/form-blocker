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
          blocked_domains: string[]
          form_selector: string
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
          blocked_domains?: string[]
          form_selector?: string
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
          blocked_domains?: string[]
          form_selector?: string
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
      billing_plans: {
        Row: {
          code: string
          name: string
          description: string | null
          amount: number
          currency: string
          interval: Database['public']['Enums']['billing_plan_interval']
          trial_period_days: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          features: string[]
          metadata: Json
          is_default: boolean
          is_archived: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          code: string
          name: string
          description?: string | null
          amount: number
          currency?: string
          interval?: Database['public']['Enums']['billing_plan_interval']
          trial_period_days?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          features?: string[]
          metadata?: Json
          is_default?: boolean
          is_archived?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          code?: string
          name?: string
          description?: string | null
          amount?: number
          currency?: string
          interval?: Database['public']['Enums']['billing_plan_interval']
          trial_period_days?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          features?: string[]
          metadata?: Json
          is_default?: boolean
          is_archived?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_accounts: {
        Row: {
          id: string
          user_id: string
          plan_code: string
          subscription_status: Database['public']['Enums']['billing_subscription_status']
          cancel_at_period_end: boolean
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          billing_email: string | null
          default_payment_method: Json | null
          usage_limits: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_code: string
          subscription_status?: Database['public']['Enums']['billing_subscription_status']
          cancel_at_period_end?: boolean
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          billing_email?: string | null
          default_payment_method?: Json | null
          usage_limits?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_code?: string
          subscription_status?: Database['public']['Enums']['billing_subscription_status']
          cancel_at_period_end?: boolean
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          billing_email?: string | null
          default_payment_method?: Json | null
          usage_limits?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_accounts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_accounts_plan_code_fkey"
            columns: ["plan_code"]
            referencedRelation: "billing_plans"
            referencedColumns: ["code"]
          }
        ]
      }
      billing_invoices: {
        Row: {
          id: string
          account_id: string
          stripe_invoice_id: string | null
          status: Database['public']['Enums']['billing_invoice_status']
          amount_due: number
          amount_paid: number
          currency: string
          hosted_invoice_url: string | null
          invoice_pdf: string | null
          billing_reason: string | null
          period_start: string | null
          period_end: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          stripe_invoice_id?: string | null
          status?: Database['public']['Enums']['billing_invoice_status']
          amount_due: number
          amount_paid?: number
          currency?: string
          hosted_invoice_url?: string | null
          invoice_pdf?: string | null
          billing_reason?: string | null
          period_start?: string | null
          period_end?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          stripe_invoice_id?: string | null
          status?: Database['public']['Enums']['billing_invoice_status']
          amount_due?: number
          amount_paid?: number
          currency?: string
          hosted_invoice_url?: string | null
          invoice_pdf?: string | null
          billing_reason?: string | null
          period_start?: string | null
          period_end?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "billing_accounts"
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
      generate_api_key: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      submission_status: 'allowed' | 'challenged' | 'held' | 'blocked'
      notification_type: 'email' | 'webhook' | 'dashboard'
      appeal_status: 'pending' | 'approved' | 'rejected'
      billing_plan_interval: 'month' | 'year'
      billing_subscription_status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
      billing_invoice_status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
