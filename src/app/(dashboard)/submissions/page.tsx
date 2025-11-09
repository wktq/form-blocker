'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { useFormContext } from '@/lib/forms/context';
import { formatDate, getStatusLabel, formatScore } from '@/lib/utils';
import type { Submission, SubmissionStatus } from '@/types';

export default function SubmissionsPage() {
  const { currentForm } = useFormContext();
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
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
        const response = await fetch(
          `/api/submissions?form_id=${currentForm.id}&limit=200`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error('送信履歴の取得に失敗しました');
        }
        const body = await response.json();
        if (!cancelled) {
          setSubmissions(body.submissions ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '送信履歴の取得に失敗しました');
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

  const filteredSubmissions = useMemo(() => {
    let result = submissions;

    if (statusFilter !== 'all') {
      result = result.filter((submission) => submission.status === statusFilter);
    }

    if (sortBy === 'date') {
      result = [...result].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else {
      result = [...result].sort((a, b) => b.score_sales - a.score_sales);
    }

    return result;
  }, [submissions, statusFilter, sortBy]);

  const getStatusVariant = (status: SubmissionStatus) => {
    switch (status) {
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
  };

  if (!currentForm) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">フォームを選択してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">送信履歴</h1>
        <p className="text-gray-500 mt-1">{currentForm.name} のフォーム送信履歴</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* フィルター */}
      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
            <div className="flex-1">
              <Select
                label="ステータス"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SubmissionStatus | 'all')}
              >
                <option value="all">すべて</option>
                <option value="allowed">許可</option>
                <option value="challenged">チャレンジ</option>
                <option value="held">保留</option>
                <option value="blocked">ブロック</option>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                label="並び替え"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'score')}
              >
                <option value="date">日時順</option>
                <option value="score">スコア順</option>
              </Select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setStatusFilter('all');
                  setSortBy('date');
                }}
              >
                リセット
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 送信リスト */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent>
              <div className="text-center py-12 text-sm text-gray-500">
                読み込み中です...
              </div>
            </CardContent>
          </Card>
        ) : filteredSubmissions.length === 0 ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-gray-500">該当する送信履歴がありません</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredSubmissions.map((submission) => (
            <Link
              key={submission.id}
              href={`/submissions/${submission.id}`}
              className="block"
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge variant={getStatusVariant(submission.status)}>
                          {getStatusLabel(submission.status)}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {formatDate(submission.created_at)}
                        </span>
                        {submission.ip_address && (
                          <span className="text-xs text-gray-500">
                            IP: {submission.ip_address}
                          </span>
                        )}
                      </div>

                      <div className="mb-2">
                        <p className="font-medium text-gray-900">
                          {submission.content.name || '名前なし'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {submission.content.email || 'メールアドレスなし'}
                        </p>
                      </div>

                      <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                        {submission.content.message || ''}
                      </p>

                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-600">営業スコア:</span>
                          <span
                            className={`text-sm font-semibold ${
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
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-600">スパムスコア:</span>
                          <span
                            className={`text-sm font-semibold ${
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
                      </div>

                      {submission.detection_reasons.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {submission.detection_reasons.map((reason) => (
                            <span
                              key={reason}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
