'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Slider } from '@/components/ui/Slider';
import { useFormContext } from '@/lib/forms/context';

export default function NewFormPage() {
  const router = useRouter();
  const { refreshForms, selectForm } = useFormContext();
  const [formData, setFormData] = useState({
    name: '',
    site_url: '',
    enable_url_detection: true,
    enable_paste_detection: true,
    threshold_sales: 70,
    threshold_spam: 85,
    banned_keywords: '営業, セールス, 販売促進, 広告代理店',
    blocked_domains: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const createResponse = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          site_url: formData.site_url,
        }),
      });

      if (!createResponse.ok) {
        const body = await createResponse.json().catch(() => ({}));
        const message =
          typeof body?.error === 'string'
            ? body.error
            : body?.error?.message || 'フォームの作成に失敗しました';
        throw new Error(message);
      }

      const { form } = await createResponse.json();

      const configPayload = {
        enable_url_detection: formData.enable_url_detection,
        enable_paste_detection: formData.enable_paste_detection,
        threshold_sales: formData.threshold_sales / 100,
        threshold_spam: formData.threshold_spam / 100,
        banned_keywords: formData.banned_keywords
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        blocked_domains: formData.blocked_domains
          .split(',')
          .map((domain) => domain.trim())
          .filter(Boolean),
      };

      await fetch(`/api/forms/${form.id}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload),
      });

      await refreshForms();
      selectForm(form.id);
      router.push(`/forms/${form.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フォームの作成に失敗しました');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">新規フォーム作成</h1>
        <p className="text-gray-500 mt-1">監視するフォームを登録します</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="フォーム名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="お問い合わせフォーム"
              required
            />

            <Input
              label="サイトURL"
              value={formData.site_url}
              onChange={(e) => setFormData({ ...formData, site_url: e.target.value })}
              placeholder="https://example.com"
              required
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>検出機能</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Checkbox
              label="URL検出を有効にする"
              checked={formData.enable_url_detection}
              onChange={(e) => setFormData({ ...formData, enable_url_detection: e.target.checked })}
            />

            <Checkbox
              label="ペースト検出を有効にする"
              checked={formData.enable_paste_detection}
              onChange={(e) => setFormData({ ...formData, enable_paste_detection: e.target.checked })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>判定閾値</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Slider
                label="営業スコア閾値"
                value={formData.threshold_sales}
                onChange={(e) => setFormData({ ...formData, threshold_sales: Number(e.target.value) })}
                min={0}
                max={100}
              />
              <p className="text-xs text-gray-500 mt-2">
                この値以上の営業スコアでチャレンジまたはブロックされます
              </p>
            </div>

            <div>
              <Slider
                label="スパムスコア閾値"
                value={formData.threshold_spam}
                onChange={(e) => setFormData({ ...formData, threshold_spam: Number(e.target.value) })}
                min={0}
                max={100}
              />
              <p className="text-xs text-gray-500 mt-2">
                この値以上のスパムスコアでブロックされます
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>追加禁止キーワード</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                キーワードリスト
              </label>
              <textarea
                value={formData.banned_keywords}
                onChange={(e) => setFormData({ ...formData, banned_keywords: e.target.value })}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="営業, セールス, 販売促進, 広告"
              />
            <p className="text-xs text-gray-500 mt-1">
              基本的な禁止キーワードは閾値に応じてバックエンド側で自動設定されます。ここでは追加で禁止したいキーワードをカンマ区切りで入力してください。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ブロック対象ドメイン
            </label>
            <textarea
              value={formData.blocked_domains}
              onChange={(e) => setFormData({ ...formData, blocked_domains: e.target.value })}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="example.com, calendly.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              営業やスパム送信でよく使われるドメインがあればカンマ区切りで入力してください。
            </p>
          </div>
        </CardContent>
      </Card>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/forms')}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? '作成中...' : 'フォームを作成'}
          </Button>
        </div>
      </form>
    </div>
  );
}
