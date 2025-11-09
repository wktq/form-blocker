'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, getStatusLabel, formatScore } from '@/lib/utils';
import type { Submission, SubmissionStatus } from '@/types';

interface SubmissionDetail extends Submission {
  forms?: {
    id: string;
    name: string;
    site_url: string;
  };
}

export default function SubmissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/submissions/${params.id}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('送信履歴が見つかりませんでした');
          }
          throw new Error('送信履歴の取得に失敗しました');
        }

        const body = await response.json();
        if (!cancelled) {
          setSubmission(body.submission ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '送信履歴の取得に失敗しました');
          setSubmission(null);
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
  }, [params.id]);

  const statusVariant = useMemo(() => {
    if (!submission) return 'default';
    switch (submission.status as SubmissionStatus) {
      case 'allowed':
        return 'success';
      case 'challenged':
        return 'warning';
      case 'blocked':
        return 'danger';
      case 'held':
        return 'info';
      default:
        return 'default';
    }
  }, [submission]);

  if (loading) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        読み込み中です...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-red-500">{error}</p>
        <Link
          href="/submissions"
          className="text-primary-600 hover:text-primary-700 inline-block"
        >
          ← 送信履歴一覧に戻る
        </Link>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">送信履歴が見つかりません</p>
        <Link
          href="/submissions"
          className="text-primary-600 hover:text-primary-700 mt-4 inline-block"
        >
          ← 送信履歴一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/submissions"
            className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block"
          >
            ← 送信履歴一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">送信詳細</h1>
          <p className="text-gray-500 mt-1">{formatDate(submission.created_at)}</p>
          {submission.forms && (
            <p className="text-xs text-gray-500 mt-1">
              フォーム: {submission.forms.name} ({submission.forms.site_url})
            </p>
          )}
        </div>
        <Badge variant={statusVariant} className="text-lg px-4 py-2">
          {getStatusLabel(submission.status)}
        </Badge>
      </div>

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
                <Badge variant={statusVariant}>{getStatusLabel(submission.status)}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">日時</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(submission.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">IPアドレス</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {submission.ip_address || '記録なし'}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm font-medium text-gray-600">User-Agent</dt>
              <dd className="mt-1 text-sm text-gray-900 break-all">
                {submission.user_agent || '記録なし'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>判定スコア</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">営業スコア</span>
              <span
                className={`text-lg font-bold ${
                  submission.score_sales >= 0.85
                    ? 'text-red-600'
                    : submission.score_sales >= 0.7
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}
              >
                {formatScore(submission.score_sales)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  submission.score_sales >= 0.85
                    ? 'bg-red-600'
                    : submission.score_sales >= 0.7
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${submission.score_sales * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">スパムスコア</span>
              <span
                className={`text-lg font-bold ${
                  submission.score_spam >= 0.85
                    ? 'text-red-600'
                    : submission.score_spam >= 0.7
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}
              >
                {formatScore(submission.score_spam)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  submission.score_spam >= 0.85
                    ? 'bg-red-600'
                    : submission.score_spam >= 0.7
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${submission.score_spam * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {submission.detection_reasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>検出理由</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {submission.detection_reasons.map((reason) => (
                <Badge key={reason} variant="default">
                  {reason}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      <Card>
        <CardHeader>
          <CardTitle>対応メモ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            自動判定の結果は上記の通りです。今後、誤検知の承認や通知連携などを追加予定です。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
