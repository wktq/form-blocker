import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import {
  ensureBillingAccount,
  ensureStripeCustomer,
  extractPlanLimits,
  loadPlanByCode,
  mapStripeInvoiceStatus,
  mapStripeSubscriptionStatus,
  updateBillingAccount,
  unixToIso,
  type SupabaseServerClient,
} from '../helpers';
import { getStripeClient } from '@/lib/stripe/server';

export const dynamic = 'force-dynamic';

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
};

function assertStripeSubscription(
  subscription: string | Stripe.Subscription | null
): subscription is Stripe.Subscription {
  return Boolean(subscription) && typeof subscription !== 'string';
}

async function upsertInvoiceRecord(
  supabase: SupabaseServerClient,
  accountId: string,
  invoice: Stripe.Invoice
) {
  if (!invoice.id) {
    return;
  }

  const payload = {
    account_id: accountId,
    stripe_invoice_id: invoice.id,
    status: mapStripeInvoiceStatus(invoice.status),
    amount_due: invoice.amount_due ?? 0,
    amount_paid: invoice.amount_paid ?? 0,
    currency: invoice.currency ?? 'jpy',
    hosted_invoice_url: invoice.hosted_invoice_url,
    invoice_pdf: invoice.invoice_pdf,
    billing_reason: invoice.billing_reason ?? undefined,
    period_start: unixToIso(invoice.period_start),
    period_end: unixToIso(invoice.period_end),
    metadata: invoice.metadata ?? {},
  };

  const { data: existing, error: selectError } = await supabase
    .from('billing_invoices')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError;
  }

  if (existing) {
    await supabase.from('billing_invoices').update(payload).eq('id', existing.id);
  } else {
    await supabase.from('billing_invoices').insert(payload);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId }: { sessionId?: string } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const stripe = getStripeClient();
    let account = await ensureBillingAccount(supabase, user);
    account = await ensureStripeCustomer(supabase, account, user, stripe);

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer', 'invoice'],
    });

    if (!assertStripeSubscription(checkoutSession.subscription)) {
      return NextResponse.json({ error: '有効なサブスクリプションが見つかりません' }, { status: 400 });
    }

    const subscription = checkoutSession.subscription as SubscriptionWithPeriod;
    const planCode =
      (checkoutSession.metadata?.plan_code as string | undefined) ??
      (subscription.metadata?.plan_code as string | undefined);

    if (!planCode) {
      return NextResponse.json({ error: 'プラン情報の取得に失敗しました' }, { status: 400 });
    }

    const plan = await loadPlanByCode(supabase, planCode);
    if (!plan) {
      return NextResponse.json({ error: 'プランが存在しません' }, { status: 404 });
    }

    const limits = extractPlanLimits(plan) || account.usage_limits;
    const previousSubscriptionId = account.stripe_subscription_id;

    const updatedAccount = await updateBillingAccount(supabase, account.id, {
      plan_code: plan.code,
      subscription_status: mapStripeSubscriptionStatus(subscription.status),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      trial_ends_at: unixToIso(subscription.trial_end),
      current_period_start: unixToIso(subscription.current_period_start),
      current_period_end: unixToIso(subscription.current_period_end),
      stripe_customer_id:
        typeof checkoutSession.customer === 'string'
          ? checkoutSession.customer
          : checkoutSession.customer?.id ?? account.stripe_customer_id,
      stripe_subscription_id: subscription.id,
      usage_limits: limits,
    });

    if (checkoutSession.invoice) {
      const invoice =
        typeof checkoutSession.invoice === 'string'
          ? await stripe.invoices.retrieve(checkoutSession.invoice)
          : checkoutSession.invoice;
      await upsertInvoiceRecord(supabase, updatedAccount.id, invoice);
    } else if (subscription.latest_invoice) {
      const invoice =
        typeof subscription.latest_invoice === 'string'
          ? await stripe.invoices.retrieve(subscription.latest_invoice)
          : subscription.latest_invoice;
      await upsertInvoiceRecord(supabase, updatedAccount.id, invoice);
    }

    if (
      previousSubscriptionId &&
      previousSubscriptionId !== subscription.id
    ) {
      try {
        await stripe.subscriptions.cancel(previousSubscriptionId);
      } catch (error) {
        console.error('Failed to cancel previous subscription', error);
      }
    }

    return NextResponse.json({ account: updatedAccount });
  } catch (error) {
    console.error('Billing session confirmation error', error);
    return NextResponse.json(
      { error: 'Checkoutセッションの処理に失敗しました' },
      { status: 500 }
    );
  }
}
