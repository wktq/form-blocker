'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useFormContext } from '@/lib/forms/context';
import { formatDate, getStatusLabel, formatScore } from '@/lib/utils';
import type { AnalyticsSummary, Submission } from '@/types';

interface AnalyticsResponse {
  summary: AnalyticsSummary;
  time_series: Array<{
    date: string;
    allowed: number;
    challenged: number;
    held: number;
    blocked: number;
  }>;
}

interface SubmissionsResponse {
  submissions: Submission[];
}

export default function DashboardPage() {
  const { currentForm } = useFormContext();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentForm) return;

    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [analyticsRes, submissionsRes] = await Promise.all([
          fetch(`/api/analytics?form_id=${currentForm.id}&period=7d`, {
            signal: controller.signal,
          }),
          fetch(`/api/submissions?form_id=${currentForm.id}&limit=50`, {
            signal: controller.signal,
          }),
        ]);

        if (!analyticsRes.ok) {
          throw new Error('統計情報の取得に失敗しました');
        }
        if (!submissionsRes.ok) {
          throw new Error('送信履歴の取得に失敗しました');
        }

        const analyticsBody = (await analyticsRes.json()) as AnalyticsResponse;
        const submissionsBody = (await submissionsRes.json()) as SubmissionsResponse;

        if (!cancelled) {
          setAnalytics(analyticsBody.summary);
          setSubmissions(submissionsBody.submissions ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
          setAnalytics(null);
          setSubmissions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentForm]);

  const stats = useMemo(() => {
    if (analytics) {
      return {
        total: analytics.total_submissions,
        allowed: analytics.allowed,
        blocked: analytics.blocked,
        challenged: analytics.challenged,
        held: analytics.held,
      };
    }

    return {
      total: submissions.length,
      allowed: submissions.filter((s) => s.status === 'allowed').length,
      blocked: submissions.filter((s) => s.status === 'blocked').length,
      challenged: submissions.filter((s) => s.status === 'challenged').length,
      held: submissions.filter((s) => s.status === 'held').length,
    };
  }, [analytics, submissions]);

  const recentBlocked = useMemo(
    () =>
      submissions
        .filter((submission) => submission.status === 'blocked')
        .slice(0, 5),
    [submissions]
  );

  if (!currentForm) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">フォームを選択してください</p>
      </div>
    );
  }

  const blockRate =
    stats.total > 0 ? ((stats.blocked / stats.total) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">{currentForm.name} の送信状況</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">総送信数</div>
            <div className="stat-value text-primary">
              {loading ? '...' : stats.total}
            </div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">ブロック数</div>
            <div className="stat-value text-error">
              {loading ? '...' : stats.blocked}
            </div>
            <div className="stat-desc">ブロック率: {loading ? '...' : `${blockRate}%`}</div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">許可数</div>
            <div className="stat-value text-success">
              {loading ? '...' : stats.allowed}
            </div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">チャレンジ</div>
            <div className="stat-value text-warning">
              {loading ? '...' : stats.challenged}
            </div>
          </div>
        </div>
      </div>

      {/* 最近のブロック */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>最近ブロックされた送信</CardTitle>
            <Link href="/submissions?status=blocked" className="link link-primary">
              すべて表示 →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 opacity-60">
                <p>読み込み中...</p>
              </div>
            ) : recentBlocked.length === 0 ? (
              <div className="text-center py-8 opacity-60">
                <p>ブロックされた送信はありません</p>
              </div>
            ) : (
              recentBlocked.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/submissions/${submission.id}`}
                  className="card bg-base-100 border border-base-300 hover:shadow-md transition-shadow"
                >
                  <div className="card-body">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="danger">{getStatusLabel(submission.status)}</Badge>
                      <span className="text-sm opacity-60">
                        {formatDate(submission.created_at)}
                      </span>
                    </div>
                    <p className="font-medium mb-1">
                      {submission.content.name || '名前なし'} (
                      {submission.content.email || 'メールアドレスなし'})
                    </p>
                    <p className="text-sm opacity-70 line-clamp-2">
                      {submission.content.message || ''}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs">
                        営業スコア:{' '}
                        <span className="font-medium text-error">
                          {formatScore(submission.score_sales)}
                        </span>
                      </span>
                      <span className="text-xs">
                        スパムスコア:{' '}
                        <span className="font-medium text-error">
                          {formatScore(submission.score_spam)}
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
