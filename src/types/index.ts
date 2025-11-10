// ユーザー関連
export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

// フォーム（プロジェクトの代わり）
export interface Form {
  id: string;
  user_id: string;
  name: string;
  site_url: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  form_configs?: FormConfig[];
}

// フォーム設定
export interface FormConfig {
  id: string;
  form_id: string;
  enable_url_detection: boolean;
  enable_paste_detection: boolean;
  threshold_sales: number; // 0.0-1.0
  threshold_spam: number; // 0.0-1.0
  banned_keywords: string[];
  allowed_domains: string[];
  blocked_domains: string[];
  form_selector: string;
  created_at: string;
  updated_at: string;
}

// 送信ステータス
export type SubmissionStatus = 'allowed' | 'challenged' | 'held' | 'blocked';

// 送信データ
export interface Submission {
  id: string;
  form_id: string;
  status: SubmissionStatus;
  score_sales: number;
  score_spam: number;
  final_decision: string;
  content: Record<string, any>;
  metadata: SubmissionMetadata;
  detection_reasons: string[];
  llm_reasoning?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface SubmissionMetadata {
  url: string;
  user_agent: string;
  ip_address?: string;
  timestamp: number;
  form_selector?: string;
}

export interface BehavioralData {
  paste_detected: boolean;
  suspicious_paste?: boolean;
  avg_typing_speed?: number;
  time_to_submit?: number;
}

// 通知設定
export type NotificationType = 'email' | 'webhook' | 'dashboard';

export interface Notification {
  id: string;
  form_id: string;
  type: NotificationType;
  enabled: boolean;
  condition: NotificationCondition;
  config: NotificationConfig;
  created_at: string;
  updated_at: string;
}

export interface NotificationCondition {
  score_sales?: {
    gte?: number;
    lte?: number;
  };
  score_spam?: {
    gte?: number;
    lte?: number;
  };
  status?: SubmissionStatus[];
}

export interface NotificationConfig {
  email?: string;
  webhook_url?: string;
  webhook_secret?: string;
}

// 異議申立て
export type AppealStatus = 'pending' | 'approved' | 'rejected';

export interface Appeal {
  id: string;
  submission_id: string;
  reason: string;
  contact_info?: {
    email?: string;
    phone?: string;
  };
  status: AppealStatus;
  admin_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

// API リクエスト/レスポンス型
export interface EvaluateRequest {
  api_key: string;
  form_data: Record<string, string | string[]>;
  metadata: SubmissionMetadata;
  behavioral_data?: BehavioralData;
}

export interface EvaluateResponse {
  success: boolean;
  submission_id: string;
  decision: 'allowed' | 'challenged' | 'held' | 'blocked';
  scores: {
    sales: number;
    spam: number;
  };
  reasons: string[];
  message: string;
  challenge?: {
    type: 'self_report' | 'captcha';
    question?: string;
  };
}

// 分析データ
export interface AnalyticsSummary {
  total_submissions: number;
  allowed: number;
  challenged: number;
  held: number;
  blocked: number;
  avg_score_sales: number;
  avg_score_spam: number;
}

// 課金・Stripe
export type BillingPlanInterval = 'month' | 'year';
export type BillingSubscriptionStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
export type BillingInvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface BillingPlan {
  code: string;
  name: string;
  description?: string | null;
  amount: number;
  currency: string;
  interval: BillingPlanInterval;
  trial_period_days?: number | null;
  stripe_price_id?: string | null;
  features: string[];
  metadata?: Record<string, unknown>;
  is_default: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BillingPaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface BillingAccount {
  id: string;
  user_id: string;
  plan_code: string;
  subscription_status: BillingSubscriptionStatus;
  cancel_at_period_end: boolean;
  trial_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  billing_email?: string | null;
  default_payment_method?: BillingPaymentMethod | null;
  usage_limits: Record<string, number>;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  plan?: BillingPlan | null;
}

export interface BillingInvoice {
  id: string;
  account_id: string;
  status: BillingInvoiceStatus;
  amount_due: number;
  amount_paid: number;
  currency: string;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  billing_reason?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface BillingOverviewResponse {
  account: BillingAccount;
  plans: BillingPlan[];
  invoices: BillingInvoice[];
  portalUrl: string | null;
  checkoutUrl: string | null;
}
