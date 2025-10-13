'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { mockSubmissions } from '@/lib/mock-data';
import { formatDate, getStatusLabel, formatScore } from '@/lib/utils';
import Link from 'next/link';

export default function SubmissionDetailPage({ params }: { params: { id: string } }) {
  const submission = mockSubmissions.find(s => s.id === params.id);

  if (!submission) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">送信履歴が見つかりません</p>
        <Link href="/submissions" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          ← 送信履歴一覧に戻る
        </Link>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'allowed': return 'success';
      case 'challenged': return 'warning';
      case 'blocked': return 'danger';
      case 'held': return 'info';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/submissions" className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
            ← 送信履歴一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">送信詳細</h1>
          <p className="text-gray-500 mt-1">{formatDate(submission.created_at)}</p>
        </div>
        <Badge variant={getStatusVariant(submission.status)} className="text-lg px-4 py-2">
          {getStatusLabel(submission.status)}
        </Badge>
      </div>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-600">送信ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{submission.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">ステータス</dt>
              <dd className="mt-1">
                <Badge variant={getStatusVariant(submission.status)}>
                  {getStatusLabel(submission.status)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">日時</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(submission.created_at)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">IPアドレス</dt>
              <dd className="mt-1 text-sm text-gray-900">{submission.ip_address || 'N/A'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm font-medium text-gray-600">User-Agent</dt>
              <dd className="mt-1 text-sm text-gray-900 break-all">{submission.user_agent || 'N/A'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* スコア */}
      <Card>
        <CardHeader>
          <CardTitle>判定スコア</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">営業スコア</span>
              <span className={`text-lg font-bold ${
                submission.score_sales >= 0.85 ? 'text-red-600' :
                submission.score_sales >= 0.7 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {formatScore(submission.score_sales)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  submission.score_sales >= 0.85 ? 'bg-red-600' :
                  submission.score_sales >= 0.7 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${submission.score_sales * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">スパムスコア</span>
              <span className={`text-lg font-bold ${
                submission.score_spam >= 0.85 ? 'text-red-600' :
                submission.score_spam >= 0.7 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {formatScore(submission.score_spam)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  submission.score_spam >= 0.85 ? 'bg-red-600' :
                  submission.score_spam >= 0.7 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${submission.score_spam * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 検出理由 */}
      {submission.detection_reasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>検出理由</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {submission.detection_reasons.map((reason, idx) => (
                <Badge key={idx} variant="default">
                  {reason}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI判定理由 */}
      {submission.llm_reasoning && (
        <Card>
          <CardHeader>
            <CardTitle>AI判定理由</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">
              {submission.llm_reasoning}
            </p>
          </CardContent>
        </Card>
      )}

      {/* フォーム内容 */}
      <Card>
        <CardHeader>
          <CardTitle>フォーム送信内容</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            {Object.entries(submission.content).map(([key, value]) => (
              <div key={key}>
                <dt className="text-sm font-medium text-gray-600 capitalize">{key}</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                  {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* アクション */}
      <Card>
        <CardHeader>
          <CardTitle>アクション</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3">
            {submission.status === 'blocked' && (
              <>
                <Button variant="primary">誤検知として承認</Button>
                <Button variant="danger">IPを完全ブロック</Button>
              </>
            )}
            {submission.status === 'challenged' && (
              <>
                <Button variant="primary">手動で承認</Button>
                <Button variant="danger">ブロックに変更</Button>
              </>
            )}
            {submission.status === 'held' && (
              <>
                <Button variant="primary">許可</Button>
                <Button variant="danger">ブロック</Button>
              </>
            )}
            <Button variant="secondary">エクスポート</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
