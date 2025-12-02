-- Billing schema for Stripe subscriptions

-- Enum definitions with error handling to avoid "already exists" errors
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_plan_interval') THEN
        CREATE TYPE billing_plan_interval AS ENUM ('month', 'year');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_subscription_status') THEN
        CREATE TYPE billing_subscription_status AS ENUM ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_invoice_status') THEN
        CREATE TYPE billing_invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');
    END IF;
END $$;

-- Plans master
CREATE TABLE IF NOT EXISTS public.billing_plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'jpy',
  interval billing_plan_interval NOT NULL DEFAULT 'month',
  trial_period_days INTEGER DEFAULT 0,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial plans
INSERT INTO public.billing_plans (
  code,
  name,
  description,
  amount,
  currency,
  interval,
  trial_period_days,
  stripe_price_id,
  stripe_product_id,
  features,
  metadata,
  is_default,
  sort_order
)
VALUES
  (
    'free',
    'Free',
    '小規模サイト向けのスタータープラン',
    0,
    'jpy',
    'month',
    0,
    NULL,
    NULL,
    ARRAY[
      '最大1フォーム',
      '月間500送信まで',
      '基本的な行動検出'
    ],
    jsonb_build_object(
      'limits',
      jsonb_build_object(
        'forms', 1,
        'submissions', 500,
        'members', 1,
        'retention_days', 30
      )
    ),
    true,
    1
  ),
  (
    'pro',
    'Pro',
    '成長チーム向けの標準プラン',
    12000,
    'jpy',
    'month',
    14,
    NULL,
    NULL,
    ARRAY[
      '最大5フォーム',
      '月間5,000送信まで',
      '行動検出強化 + Webhook',
      '通知・レポートの高度化'
    ],
    jsonb_build_object(
      'limits',
      jsonb_build_object(
        'forms', 5,
        'submissions', 5000,
        'members', 5,
        'retention_days', 90
      )
    ),
    false,
    2
  ),
  (
    'scale',
    'Scale',
    '本番導入企業向けの上位プラン',
    36000,
    'jpy',
    'month',
    14,
    NULL,
    NULL,
    ARRAY[
      '最大20フォーム',
      '月間25,000送信まで',
      '優先サポート + SLA',
      '監査ログ・高度な制限機能'
    ],
    jsonb_build_object(
      'limits',
      jsonb_build_object(
        'forms', 20,
        'submissions', 25000,
        'members', 10,
        'retention_days', 365
      )
    ),
    false,
    3
  )
ON CONFLICT (code) DO NOTHING;

-- Billing account per user
CREATE TABLE IF NOT EXISTS public.billing_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES public.billing_plans(code) ON UPDATE CASCADE,
  subscription_status billing_subscription_status NOT NULL DEFAULT 'inactive',
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  billing_email TEXT,
  default_payment_method JSONB,
  usage_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Billing invoices / receipts
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.billing_accounts(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  status billing_invoice_status NOT NULL DEFAULT 'draft',
  amount_due INTEGER NOT NULL CHECK (amount_due >= 0),
  amount_paid INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  currency TEXT NOT NULL DEFAULT 'jpy',
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  billing_reason TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_accounts_user_id ON public.billing_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_accounts_plan_code ON public.billing_accounts(plan_code);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_account_id ON public.billing_invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_created_at ON public.billing_invoices(created_at DESC);

-- updated_at triggers reuse shared function
DROP TRIGGER IF EXISTS update_billing_plans_updated_at ON public.billing_plans;
CREATE TRIGGER update_billing_plans_updated_at
  BEFORE UPDATE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_billing_accounts_updated_at ON public.billing_accounts;
CREATE TRIGGER update_billing_accounts_updated_at
  BEFORE UPDATE ON public.billing_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- Billing plans readable by everyone (auth required)
DROP POLICY IF EXISTS "Billing plans are readable" ON public.billing_plans;
CREATE POLICY "Billing plans are readable"
  ON public.billing_plans FOR SELECT
  USING (true);

-- Billing accounts policies
DROP POLICY IF EXISTS "Users can view their billing account" ON public.billing_accounts;
CREATE POLICY "Users can view their billing account"
  ON public.billing_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their billing account" ON public.billing_accounts;
CREATE POLICY "Users can create their billing account"
  ON public.billing_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their billing account" ON public.billing_accounts;
CREATE POLICY "Users can update their billing account"
  ON public.billing_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Billing invoices policies
DROP POLICY IF EXISTS "Users can view their invoices" ON public.billing_invoices;
CREATE POLICY "Users can view their invoices"
  ON public.billing_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.billing_accounts
      WHERE billing_accounts.id = billing_invoices.account_id
        AND billing_accounts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert invoices for their account" ON public.billing_invoices;
CREATE POLICY "Users can insert invoices for their account"
  ON public.billing_invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.billing_accounts
      WHERE billing_accounts.id = billing_invoices.account_id
        AND billing_accounts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their invoices" ON public.billing_invoices;
CREATE POLICY "Users can update their invoices"
  ON public.billing_invoices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.billing_accounts
      WHERE billing_accounts.id = billing_invoices.account_id
        AND billing_accounts.user_id = auth.uid()
    )
  );
