import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ensureBillingAccount,
  ensureStripeCustomer,
} from '../helpers';
import { getStripeClient, getAppBaseUrl } from '@/lib/stripe/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = getStripeClient();
    let account = await ensureBillingAccount(supabase, user);
    account = await ensureStripeCustomer(supabase, account, user, stripe);

    if (!account.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe客情報の作成に失敗しました' },
        { status: 500 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${getAppBaseUrl()}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error', error);
    return NextResponse.json(
      { error: 'Stripeポータルの作成に失敗しました' },
      { status: 500 }
    );
  }
}
