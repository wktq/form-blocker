-- Update billing plans to new pricing structure
-- This migration updates existing plans or adds new plans with proper limits

-- Insert new plans with updated pricing and limits (ON CONFLICT will update existing)
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
  -- Free Plan
  (
    'free',
    'Free',
    '基本的な営業・スパム行動検出とブロック機能',
    0,
    'jpy',
    'month',
    0,
    NULL,
    NULL,
    ARRAY[
      '最大2つのフォームのブロック',
      '月間ブロック数30回まで（全フォーム合計）',
      '基本的な営業・スパム行動検出'
    ],
    jsonb_build_object(
      'limits',
      jsonb_build_object(
        'max_forms', 2,
        'max_monthly_blocks', 30
      )
    ),
    true,
    1
  ),
  -- Starter Plan - Monthly
  (
    'starter_monthly',
    'スタータープラン（月額）',
    '小規模サイト向けの基本プラン',
    980,
    'jpy',
    'month',
    0,
    NULL,
    NULL,
    ARRAY[
      '最大2つのフォームのブロック',
      '月間ブロック数100回（全フォーム合計）',
      '基本的な営業・スパム行動検出とブロック機能'
    ],
    jsonb_build_object(
      'limits',
      jsonb_build_object(
        'max_forms', 2,
        'max_monthly_blocks', 100
      )
    ),
    false,
    2
  ),
  -- Starter Plan - Yearly
  (
    'starter_yearly',
    'スタータープラン（年間）',
    '小規模サイト向けの基本プラン（年間20%OFF）',
    9408,
    'jpy',
    'year',
    0,
    NULL,
    NULL,
    ARRAY[
      '最大2つのフォームのブロック',
      '月間ブロック数100回（全フォーム合計）',
      '基本的な営業・スパム行動検出とブロック機能',
      '年間20%OFF'
    ],
    jsonb_build_object(
      'limits',
      jsonb_build_object(
        'max_forms', 2,
        'max_monthly_blocks', 100
      )
    ),
    false,
    3
  ),
  -- Basic Plan - Monthly
  (
    'basic_monthly',
    'ベーシックプラン（月額）',
    '成長企業向けの標準プラン',
    9800,
    'jpy',
    'month',
    0,
    NULL,
    NULL,
    ARRAY[
      '最大20個のフォームのブロック',
      '月間ブロック数500回（全フォーム合計）',
      '高度な営業・スパム行動検出',
      'Webhook通知'
    ],
    jsonb_build_object(
      'limits',
      jsonb_build_object(
        'max_forms', 20,
        'max_monthly_blocks', 500
      )
    ),
    false,
    4
  ),
  -- Basic Plan - Yearly
  (
    'basic_yearly',
    'ベーシックプラン（年間）',
    '成長企業向けの標準プラン（年間20%OFF）',
    94080,
    'jpy',
    'year',
    0,
    NULL,
    NULL,
    ARRAY[
      '最大20個のフォームのブロック',
      '月間ブロック数500回（全フォーム合計）',
      '高度な営業・スパム行動検出',
      'Webhook通知',
      '年間20%OFF'
    ],
    jsonb_build_object(
      'limits',
      jsonb_build_object(
        'max_forms', 20,
        'max_monthly_blocks', 500
      )
    ),
    false,
    5
  ),
  -- Unlimited Plan - Monthly
  (
    'unlimited_monthly',
    'アンリミテッドプラン（月額）',
    '大規模サイト向けの無制限プラン',
    21800,
    'jpy',
    'month',
    0,
    NULL,
    NULL,
    ARRAY[
      'フォーム数：無制限',
      '月間ブロック数：無制限',
      '優先サポート',
      '高度な分析機能'
    ],
    jsonb_build_object(
      'limits',
      jsonb_build_object(
        'max_forms', NULL,
        'max_monthly_blocks', NULL
      )
    ),
    false,
    6
  ),
  -- Unlimited Plan - Yearly
  (
    'unlimited_yearly',
    'アンリミテッドプラン（年間）',
    '大規模サイト向けの無制限プラン（年間20%OFF）',
    209280,
    'jpy',
    'year',
    0,
    NULL,
    NULL,
    ARRAY[
      'フォーム数：無制限',
      '月間ブロック数：無制限',
      '優先サポート',
      '高度な分析機能',
      '年間20%OFF'
    ],
    jsonb_build_object(
      'limits',
      jsonb_build_object(
        'max_forms', NULL,
        'max_monthly_blocks', NULL
      )
    ),
    false,
    7
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  currency = EXCLUDED.currency,
  interval = EXCLUDED.interval,
  trial_period_days = EXCLUDED.trial_period_days,
  stripe_price_id = EXCLUDED.stripe_price_id,
  stripe_product_id = EXCLUDED.stripe_product_id,
  features = EXCLUDED.features,
  metadata = EXCLUDED.metadata,
  is_default = EXCLUDED.is_default,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Update existing billing_accounts to use the free plan if they were on old plans
UPDATE public.billing_accounts
SET plan_code = 'free'
WHERE plan_code IN ('pro', 'scale');
