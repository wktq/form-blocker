import type Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ensureBillingAccount,
  ensureStripeCustomer,
  extractPlanLimits,
  loadPlanByCode,
  mapStripeSubscriptionStatus,
  updateBillingAccount,
  unixToIso,
  type BillingAccountUpdate,
} from '../helpers';
import { getStripeClient, getAppBaseUrl } from '@/lib/stripe/server';

export const dynamic = 'force-dynamic';

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
};

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

    let payload: { action?: string; plan_code?: string } = {};
    try {
      payload = await request.json();
    } catch {
      // no-op, handled below
    }

    const action = payload.action;
    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    let account = await ensureBillingAccount(supabase, user);
    const hasStripeSecret = Boolean(process.env.STRIPE_SECRET_KEY);

    switch (action) {
      case 'change_plan': {
        if (!payload.plan_code) {
          return NextResponse.json({ error: 'plan_code is required' }, { status: 400 });
        }
        if (payload.plan_code === account.plan_code) {
          return NextResponse.json({ account, message: 'すでに選択済みのプランです' });
        }

        const plan = await loadPlanByCode(supabase, payload.plan_code);
        if (!plan) {
          return NextResponse.json({ error: '指定されたプランが見つかりません' }, { status: 404 });
        }

        if (plan.amount === 0) {
          if (hasStripeSecret && account.stripe_subscription_id) {
            try {
              const stripe = getStripeClient();
              await stripe.subscriptions.cancel(account.stripe_subscription_id);
            } catch (stripeError) {
              console.error('Failed to cancel Stripe subscription before downgrading', stripeError);
            }
          }

          const limits = extractPlanLimits(plan) || account.usage_limits;
          const now = new Date().toISOString();
          const updatedAccount = await updateBillingAccount(supabase, account.id, {
            plan_code: plan.code,
            subscription_status: 'active',
            cancel_at_period_end: false,
            trial_ends_at: null,
            current_period_start: now,
            current_period_end: null,
            stripe_subscription_id: null,
            usage_limits: limits,
          });
          return NextResponse.json({ account: updatedAccount });
        }

        if (!hasStripeSecret) {
          return NextResponse.json(
            { error: 'Stripeの秘密鍵が設定されていません。STRIPE_SECRET_KEY を確認してください。' },
            { status: 500 }
          );
        }

        const stripe = getStripeClient();
        account = await ensureStripeCustomer(supabase, account, user, stripe);

        const metadata = {
          plan_code: plan.code,
          account_id: account.id,
          user_id: user.id,
        };

        const successUrl = `${getAppBaseUrl()}/billing?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${getAppBaseUrl()}/billing`;

        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer: account.stripe_customer_id || undefined,
          allow_promotion_codes: true,
          line_items: plan.stripe_price_id
            ? [{ price: plan.stripe_price_id, quantity: 1 }]
            : [
                {
                  price_data: {
                    currency: plan.currency,
                    unit_amount: plan.amount,
                    recurring: {
                      interval: plan.interval,
                    },
                    product_data: {
                      name: plan.name,
                      description: plan.description ?? undefined,
                      metadata,
                    },
                  },
                  quantity: 1,
                },
              ],
          subscription_data: {
            metadata,
            trial_period_days: plan.trial_period_days ?? undefined,
          },
          metadata,
          success_url: successUrl,
          cancel_url: cancelUrl,
        });

        return NextResponse.json({
          checkoutUrl: session.url,
          message: 'Stripe Checkout にリダイレクトします',
        });
      }
      case 'cancel': {
        if (account.subscription_status === 'canceled') {
          return NextResponse.json({ account, message: 'すでに解約済みです' });
        }

        let cancelPayload: Partial<BillingAccountUpdate> = {
          cancel_at_period_end: true,
          subscription_status: 'canceled',
        };

        if (hasStripeSecret && account.stripe_subscription_id) {
          const stripe = getStripeClient();
          const subscriptionResponse = await stripe.subscriptions.update(
            account.stripe_subscription_id,
            {
              cancel_at_period_end: true,
            }
          );
          const subscription = subscriptionResponse as SubscriptionWithPeriod;
          cancelPayload = {
            cancel_at_period_end: subscription.cancel_at_period_end ?? true,
            subscription_status: mapStripeSubscriptionStatus(subscription.status),
            current_period_end: unixToIso(subscription.current_period_end),
          };
        } else if (!account.current_period_end) {
          cancelPayload.current_period_end = new Date().toISOString();
        }

        const updatedAccount = await updateBillingAccount(
          supabase,
          account.id,
          cancelPayload
        );
        return NextResponse.json({ account: updatedAccount });
      }
      case 'resume': {
        if (!account.cancel_at_period_end) {
          return NextResponse.json({ account, message: '既に有効です' });
        }

        let resumePayload: Partial<BillingAccountUpdate> = {
          cancel_at_period_end: false,
          subscription_status: 'active',
        };

        if (hasStripeSecret && account.stripe_subscription_id) {
          const stripe = getStripeClient();
          const subscriptionResponse = await stripe.subscriptions.update(
            account.stripe_subscription_id,
            {
              cancel_at_period_end: false,
            }
          );
          const subscription = subscriptionResponse as SubscriptionWithPeriod;
          resumePayload = {
            cancel_at_period_end: subscription.cancel_at_period_end ?? false,
            subscription_status: mapStripeSubscriptionStatus(subscription.status),
            current_period_end: unixToIso(subscription.current_period_end),
          };
        }

        const updatedAccount = await updateBillingAccount(
          supabase,
          account.id,
          resumePayload
        );
        return NextResponse.json({ account: updatedAccount });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Billing subscription API error', error);
    return NextResponse.json({ error: '課金設定の更新に失敗しました' }, { status: 500 });
  }
}
