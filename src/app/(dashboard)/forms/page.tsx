'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useFormContext } from '@/lib/forms/context';
import { formatDate } from '@/lib/utils';

export default function FormsPage() {
  const { forms, selectForm, loading, error, refreshForms } = useFormContext();
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const handleCopy = useCallback(async (formId: string, apiKey: string) => {
    try {
      setCopyingId(formId);
      await navigator.clipboard.writeText(apiKey);
    } finally {
      setCopyingId(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">フォーム管理</h1>
          <p className="text-gray-500 mt-1">Webサイトのフォームを管理</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => refreshForms()}
          >
            再読み込み
          </button>
          <Link href="/forms/new">
            <Button>＋ 新規フォーム作成</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body text-center text-sm text-gray-500">
            フォーム情報を読み込み中です...
          </div>
        </div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">フォームがまだ作成されていません</p>
              <Link href="/forms/new">
                <Button>最初のフォームを作成</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {form.name}
                        </h3>
                        <Badge variant={form.is_active ? 'success' : 'default'}>
                          {form.is_active ? 'アクティブ' : '無効'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{form.site_url}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        作成日: {formatDate(form.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">API Key</p>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs font-mono text-gray-900 flex-1 truncate">
                        {form.api_key}
                      </code>
                      <button
                        onClick={() => handleCopy(form.id, form.api_key)}
                        className="text-primary-600 hover:text-primary-700 text-xs"
                      >
                        {copyingId === form.id ? 'コピー済み' : 'コピー'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <Link
                      href={`/forms/${form.id}`}
                      onClick={() => selectForm(form.id)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      詳細を見る
                    </Link>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/forms/${form.id}#embed`}
                        onClick={() => selectForm(form.id)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        埋め込みコード
                      </Link>
                      <Link
                        href={`/forms/${form.id}#settings`}
                        onClick={() => selectForm(form.id)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        設定
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
