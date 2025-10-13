'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockSubmissions } from '@/lib/mock-data';
import { useFormStore } from '@/lib/store';
import { formatDate, getStatusLabel, formatScore } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { currentForm } = useFormStore();

  if (!currentForm) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">フォームを選択してください</p>
      </div>
    );
  }

  // 現在のフォームの送信データのみ
  const formSubmissions = mockSubmissions.filter(s => s.form_id === currentForm.id);

  // 統計データの計算
  const stats = {
    total: formSubmissions.length,
    allowed: formSubmissions.filter(s => s.status === 'allowed').length,
    blocked: formSubmissions.filter(s => s.status === 'blocked').length,
    challenged: formSubmissions.filter(s => s.status === 'challenged').length,
    held: formSubmissions.filter(s => s.status === 'held').length,
  };

  const blockRate = stats.total > 0 ? ((stats.blocked / stats.total) * 100).toFixed(1) : '0.0';

  // 最近のブロック
  const recentBlocked = formSubmissions
    .filter(s => s.status === 'blocked')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">{currentForm.name} の送信状況</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">総送信数</div>
            <div className="stat-value text-primary">{stats.total}</div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">ブロック数</div>
            <div className="stat-value text-error">{stats.blocked}</div>
            <div className="stat-desc">ブロック率: {blockRate}%</div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">許可数</div>
            <div className="stat-value text-success">{stats.allowed}</div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">チャレンジ</div>
            <div className="stat-value text-warning">{stats.challenged}</div>
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
            {recentBlocked.map((submission) => (
              <Link
                key={submission.id}
                href={`/submissions/${submission.id}`}
                className="card bg-base-100 border border-base-300 hover:shadow-md transition-shadow"
              >
                <div className="card-body">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="danger">{getStatusLabel(submission.status)}</Badge>
                    <span className="text-sm opacity-60">{formatDate(submission.created_at)}</span>
                  </div>
                  <p className="font-medium mb-1">
                    {submission.content.name} ({submission.content.email})
                  </p>
                  <p className="text-sm opacity-70 line-clamp-2">
                    {submission.content.message}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs">
                      営業スコア: <span className="font-medium text-error">{formatScore(submission.score_sales)}</span>
                    </span>
                    <span className="text-xs">
                      スパムスコア: <span className="font-medium text-error">{formatScore(submission.score_spam)}</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {recentBlocked.length === 0 && (
              <div className="text-center py-8 opacity-60">
                <p>ブロックされた送信はありません</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
