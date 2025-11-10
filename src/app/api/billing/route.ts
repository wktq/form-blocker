import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureBillingAccount } from './helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await ensureBillingAccount(supabase, user);

    const { data: plans, error: plansError } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('is_archived', false)
      .order('sort_order', { ascending: true });

    if (plansError) {
      console.error('Failed to load billing plans', plansError);
      return NextResponse.json({ error: 'プランの取得に失敗しました' }, { status: 500 });
    }

    const { data: invoices, error: invoicesError } = await supabase
      .from('billing_invoices')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(12);

    if (invoicesError) {
      console.error('Failed to load billing invoices', invoicesError);
      return NextResponse.json({ error: '請求履歴の取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      account,
      plans: plans ?? [],
      invoices: invoices ?? [],
      portalUrl: null,
      checkoutUrl: null,
    });
  } catch (error) {
    console.error('Billing API error', error);
    return NextResponse.json({ error: '課金情報の取得に失敗しました' }, { status: 500 });
  }
}
