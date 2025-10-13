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
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総送信数</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ブロック数</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.blocked}</p>
                <p className="text-xs text-gray-500 mt-1">ブロック率: {blockRate}%</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🚫</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">許可数</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.allowed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">チャレンジ</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.challenged}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近のブロック */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>最近ブロックされた送信</CardTitle>
            <Link href="/submissions?status=blocked" className="text-sm text-primary-600 hover:text-primary-700">
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
                className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="danger">{getStatusLabel(submission.status)}</Badge>
                      <span className="text-sm text-gray-600">{formatDate(submission.created_at)}</span>
                    </div>
                    <p className="font-medium text-gray-900 mb-1">
                      {submission.content.name} ({submission.content.email})
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {submission.content.message}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-gray-500">
                        営業スコア: <span className="font-medium text-red-600">{formatScore(submission.score_sales)}</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        スパムスコア: <span className="font-medium text-red-600">{formatScore(submission.score_spam)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {recentBlocked.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>ブロックされた送信はありません</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
