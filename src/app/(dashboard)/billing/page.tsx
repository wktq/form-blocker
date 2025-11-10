'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type {
  BillingAccount,
  BillingOverviewResponse,
  BillingPlan,
  BillingInvoice,
} from '@/types';

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const statusLabels: Record<BillingAccount['subscription_status'], string> = {
  inactive: '未契約',
  trialing: 'トライアル中',
  active: '有効',
  past_due: '支払い遅延',
  canceled: '解約済み',
  unpaid: '未払い',
};

const statusVariants: Record<
  BillingAccount['subscription_status'],
  'default' | 'success' | 'warning' | 'danger' | 'info'
> = {
  inactive: 'default',
  trialing: 'info',
  active: 'success',
  past_due: 'warning',
  canceled: 'danger',
  unpaid: 'danger',
};

function formatPrice(plan: BillingPlan) {
  if (plan.amount === 0) return '無料';
  const suffix = plan.interval === 'month' ? '/ 月' : '/ 年';
  return `${currencyFormatter.format(plan.amount)} ${suffix}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedSessionsRef = useRef<Set<string>>(new Set());

  const fetchBilling = useCallback(
    async (withSpinner = true) => {
      if (withSpinner) {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await fetch('/api/billing');
        if (!response.ok) {
          throw new Error('課金情報の取得に失敗しました');
        }
        const body: BillingOverviewResponse = await response.json();
        setBilling(body);
      } catch (err) {
        setError(err instanceof Error ? err.message : '課金情報の取得に失敗しました');
        if (withSpinner) {
          setBilling(null);
        }
      } finally {
        if (withSpinner) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void fetchBilling();
  }, [fetchBilling]);

  const currentPlan = useMemo(() => {
    if (!billing) return null;
    return billing.account.plan ?? billing.plans.find((plan) => plan.code === billing.account.plan_code) ?? null;
  }, [billing]);

  const invoices = billing?.invoices ?? [];
  const paymentMethod = billing?.account.default_payment_method ?? null;

  const callSubscriptionAction = useCallback(
    async (body: Record<string, unknown>, successMessage?: string) => {
      setBanner(null);
      try {
        const response = await fetch('/api/billing/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            typeof result?.error === 'string'
              ? result.error
              : '課金設定の更新に失敗しました';
          throw new Error(message);
        }
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl as string;
          return;
        }
        await fetchBilling(false);
        if (successMessage) {
          setBanner({ type: 'success', text: successMessage });
        }
      } catch (err) {
        setBanner({
          type: 'error',
          text: err instanceof Error ? err.message : '課金設定の更新に失敗しました',
        });
      }
    },
    [fetchBilling]
  );

  const handlePlanChange = async (planCode: string) => {
    setActionTarget(planCode);
    await callSubscriptionAction(
      { action: 'change_plan', plan_code: planCode },
      'プランを更新しました'
    );
    setActionTarget(null);
  };

  const handleCancel = async () => {
    setActionTarget('cancel');
    await callSubscriptionAction({ action: 'cancel' }, 'サブスクリプションを解約しました');
    setActionTarget(null);
  };

  const handleResume = async () => {
    setActionTarget('resume');
    await callSubscriptionAction({ action: 'resume' }, 'サブスクリプションを再開しました');
    setActionTarget(null);
  };

  const handleOpenPortal = async () => {
    setActionTarget('portal');
    setBanner(null);
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result?.url !== 'string') {
        const message =
          typeof result?.error === 'string'
            ? result.error
            : 'Stripeポータルの生成に失敗しました';
        throw new Error(message);
      }
      window.location.href = result.url;
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Stripeポータルの生成に失敗しました',
      });
    } finally {
      setActionTarget(null);
    }
  };

  const finalizeCheckoutSession = useCallback(
    async (sessionId: string) => {
      setBanner(null);
      try {
        const response = await fetch('/api/billing/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            typeof result?.error === 'string'
              ? result.error
              : '決済処理に失敗しました';
          throw new Error(message);
        }
        await fetchBilling(false);
        setBanner({ type: 'success', text: '決済が完了しました' });
        router.replace('/billing');
      } catch (err) {
        setBanner({
          type: 'error',
          text: err instanceof Error ? err.message : '決済処理に失敗しました',
        });
      }
    },
    [fetchBilling, router]
  );

  const sessionId = searchParams?.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    if (processedSessionsRef.current.has(sessionId)) {
      return;
    }
    processedSessionsRef.current.add(sessionId);
    void finalizeCheckoutSession(sessionId);
  }, [sessionId, finalizeCheckoutSession]);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        課金情報を読み込んでいます...
      </div>
    );
  }

  if (error || !billing || !currentPlan) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-sm text-gray-500">{error ?? '課金情報を取得できませんでした'}</p>
        <Button variant="primary" onClick={() => fetchBilling()}>
          再読み込み
        </Button>
      </div>
    );
  }

  const isCancelling = billing.account.cancel_at_period_end;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">課金設定</h1>
        <p className="text-gray-500 mt-1">Stripe サブスクリプションを管理できます</p>
      </div>

      {banner && (
        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm',
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          )}
        >
          {banner.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>現在のプラン</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold">{currentPlan.name}</h2>
              <Badge variant={statusVariants[billing.account.subscription_status]}>
                {statusLabels[billing.account.subscription_status]}
              </Badge>
              {isCancelling && <Badge variant="warning">次回更新で解約予定</Badge>}
            </div>
            <p className="text-gray-600">{currentPlan.description}</p>
            <p className="text-xl font-bold">{formatPrice(currentPlan)}</p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">次回請求</dt>
                <dd className="text-sm text-gray-900">
                  {formatDate(billing.account.current_period_end) || '未設定'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">トライアル終了</dt>
                <dd className="text-sm text-gray-900">{formatDate(billing.account.trial_ends_at)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                disabled={actionTarget === 'portal'}
                onClick={() => void handleOpenPortal()}
              >
                {actionTarget === 'portal' ? 'Stripeポータルを開いています…' : 'Stripe ポータルを開く'}
              </Button>
              {currentPlan.amount > 0 && !isCancelling && (
                <Button
                  variant="danger"
                  disabled={actionTarget === 'cancel'}
                  onClick={() => void handleCancel()}
                >
                  {actionTarget === 'cancel' ? '解約処理中...' : 'サブスクリプションを解約'}
                </Button>
              )}
              {isCancelling && (
                <Button
                  variant="secondary"
                  disabled={actionTarget === 'resume'}
                  onClick={() => void handleResume()}
                >
                  {actionTarget === 'resume' ? '再開処理中...' : '解約予定を取り消す'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>利用上限</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-gray-700">
              {Object.entries(billing.account.usage_limits).map(([key, value]) => (
                <li key={key} className="flex items-center justify-between">
                  <span className="capitalize">{key}</span>
                  <span className="font-semibold">{value.toLocaleString('ja-JP')}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>プラン一覧</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {billing.plans.map((plan) => {
            const isActive = plan.code === billing.account.plan_code;
            return (
              <div
                key={plan.code}
                className={cn(
                  'rounded-2xl border p-4',
                  isActive ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {isActive && <Badge variant="success">適用中</Badge>}
                </div>
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                <p className="mt-4 text-xl font-bold">{formatPrice(plan)}</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  {plan.features.map((feature) => (
                    <li key={feature}>・{feature}</li>
                  ))}
                </ul>
                <Button
                  className="mt-4 w-full"
                  variant={isActive ? 'secondary' : 'primary'}
                  disabled={isActive || actionTarget === plan.code}
                  onClick={() => void handlePlanChange(plan.code)}
                >
                  {isActive
                    ? '現在のプラン'
                    : actionTarget === plan.code
                    ? '更新中...'
                    : 'このプランに変更'}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>支払い方法</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMethod ? (
              <>
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-900 uppercase">{paymentMethod.brand}</p>
                  <p>**** **** **** {paymentMethod.last4}</p>
                  <p>
                    期限: {paymentMethod.exp_month}/{paymentMethod.exp_year}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">登録済みのカード情報はありません</p>
            )}
            <Button
              variant="secondary"
              disabled={actionTarget === 'portal'}
              onClick={() => void handleOpenPortal()}
            >
              {actionTarget === 'portal' ? 'Stripeポータルを開いています…' : '支払い方法を更新'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>請求履歴</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500">まだ請求履歴はありません</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {currencyFormatter.format(invoice.amount_due)}（{invoice.currency.toUpperCase()}）
                      </span>
                      <Badge variant={invoice.status === 'paid' ? 'success' : 'info'}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                      <span>{invoice.billing_reason ?? 'subscription'}</span>
                      <span>{formatDate(invoice.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
