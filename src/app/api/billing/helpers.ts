import type Stripe from 'stripe';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type {
  BillingAccount,
  BillingPlan,
  BillingInvoiceStatus,
  BillingSubscriptionStatus,
} from '@/types';

export type SupabaseServerClient = SupabaseClient<Database>;

const DEFAULT_PLAN_CODE = 'free';
const DEFAULT_USAGE_LIMITS: Record<string, number> = {
  forms: 1,
  submissions: 500,
  members: 1,
  retention_days: 30,
};

type BillingAccountRow = Omit<BillingAccount, 'usage_limits'> & {
  usage_limits: Record<string, number> | null;
  plan: BillingPlan | null;
};

type BillingAccountUpdatePayload =
  Database['public']['Tables']['billing_accounts']['Update'];

export function normalizeLimits(source: unknown): Record<string, number> | null {
  if (!source || typeof source !== 'object') {
    return null;
  }
  const limits: Record<string, number> = {};
  Object.entries(source as Record<string, unknown>).forEach(([key, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      limits[key] = value;
    }
  });
  return Object.keys(limits).length > 0 ? limits : null;
}

export function extractPlanLimits(plan?: BillingPlan | null): Record<string, number> | null {
  if (!plan || !plan.metadata || typeof plan.metadata !== 'object') {
    return null;
  }
  const metadata = plan.metadata as {
    limits?: Record<string, number>;
  };
  if (!metadata.limits) {
    return null;
  }
  return normalizeLimits(metadata.limits);
}

export async function loadPlanByCode(
  supabase: SupabaseServerClient,
  code: string
): Promise<BillingPlan | null> {
  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('code', code)
    .eq('is_archived', false)
    .maybeSingle<BillingPlan>();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data ?? null;
}

export async function loadDefaultPlan(supabase: SupabaseServerClient): Promise<BillingPlan | null> {
  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('is_default', true)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle<BillingPlan>();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (data) {
    return data;
  }

  return loadPlanByCode(supabase, DEFAULT_PLAN_CODE);
}

function hydrateAccountPayload(account: BillingAccountRow): BillingAccount {
  const normalizedLimits =
    normalizeLimits(account.usage_limits) ||
    extractPlanLimits(account.plan) ||
    DEFAULT_USAGE_LIMITS;

  return {
    ...account,
    usage_limits: normalizedLimits,
  };
}

export async function ensureBillingAccount(
  supabase: SupabaseServerClient,
  user: User
): Promise<BillingAccount> {
  const { data: account, error } = await supabase
    .from('billing_accounts')
    .select('*, plan:billing_plans(*)')
    .eq('user_id', user.id)
    .maybeSingle<BillingAccountRow>();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (account) {
    return hydrateAccountPayload(account);
  }

  const defaultPlan = await loadDefaultPlan(supabase);
  const limits = extractPlanLimits(defaultPlan) || DEFAULT_USAGE_LIMITS;

  const { data: inserted, error: insertError } = await supabase
    .from('billing_accounts')
    .insert({
      user_id: user.id,
      plan_code: defaultPlan?.code ?? DEFAULT_PLAN_CODE,
      subscription_status: 'active',
      billing_email: user.email,
      usage_limits: limits,
    })
    .select('*, plan:billing_plans(*)')
    .single<BillingAccountRow>();

  if (insertError) {
    throw insertError;
  }

  return hydrateAccountPayload(inserted);
}

export async function updateBillingAccount(
  supabase: SupabaseServerClient,
  accountId: string,
  payload: Partial<BillingAccountUpdatePayload>
): Promise<BillingAccount> {
  const { data, error } = await supabase
    .from('billing_accounts')
    .update(payload)
    .eq('id', accountId)
    .select('*, plan:billing_plans(*)')
    .single<BillingAccountRow>();

  if (error) {
    throw error;
  }

  return hydrateAccountPayload(data);
}

export async function ensureStripeCustomer(
  supabase: SupabaseServerClient,
  account: BillingAccount,
  user: User,
  stripe: Stripe
): Promise<BillingAccount> {
  if (account.stripe_customer_id) {
    return account;
  }

  const metadata = {
    user_id: user.id,
    billing_account_id: account.id,
    plan_code: account.plan_code,
  };

  const customer = await stripe.customers.create({
    email: user.email ?? account.billing_email ?? undefined,
    name: (user.user_metadata as Record<string, unknown>)?.name as string | undefined,
    metadata,
  });

  return updateBillingAccount(supabase, account.id, {
    stripe_customer_id: customer.id,
    billing_email: customer.email ?? account.billing_email ?? user.email ?? null,
  });
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): BillingSubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    case 'canceled':
      return 'canceled';
    default:
      return 'inactive';
  }
}

export function mapStripeInvoiceStatus(
  status: Stripe.Invoice.Status | null | undefined
): BillingInvoiceStatus {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'open':
      return 'open';
    case 'paid':
      return 'paid';
    case 'void':
      return 'void';
    case 'uncollectible':
      return 'uncollectible';
    default:
      return 'open';
  }
}

export function unixToIso(timestamp?: number | null): string | null {
  if (!timestamp) {
    return null;
  }
  return new Date(timestamp * 1000).toISOString();
}

export type BillingAccountUpdate = BillingAccountUpdatePayload;

export { DEFAULT_PLAN_CODE, DEFAULT_USAGE_LIMITS };
