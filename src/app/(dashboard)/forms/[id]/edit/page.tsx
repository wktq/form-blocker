'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Slider } from '@/components/ui/Slider';
import { useFormContext } from '@/lib/forms/context';
import type { Form, FormConfig } from '@/types';

type FormDetail = Form & {
  form_configs?: FormConfig[];
};

type FormState = {
  name: string;
  site_url: string;
  is_active: boolean;
  enable_url_detection: boolean;
  enable_paste_detection: boolean;
  threshold_sales: number;
  threshold_spam: number;
  banned_keywords: string;
  allowed_domains: string;
  blocked_domains: string;
  form_selector: string;
};

const DEFAULT_STATE: FormState = {
  name: '',
  site_url: '',
  is_active: true,
  enable_url_detection: true,
  enable_paste_detection: true,
  threshold_sales: 70,
  threshold_spam: 85,
  banned_keywords: '',
  allowed_domains: '',
  blocked_domains: '',
  form_selector: 'form',
};

export default function EditFormPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { refreshForms, selectForm } = useFormContext();
  const [formData, setFormData] = useState<FormState>(DEFAULT_STATE);
  const [supportsBlockedDomains, setSupportsBlockedDomains] = useState(false);
  const [supportsFormSelector, setSupportsFormSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formId = useMemo(() => params.id, [params.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/forms/${formId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('フォームが見つかりませんでした');
          }
          throw new Error('フォーム情報の取得に失敗しました');
        }

        const body = await response.json();
        const detail: FormDetail | null = body.form ?? null;
        const config = detail?.form_configs?.[0];
        if (!cancelled) {
          const hasBlockedDomains = Boolean(config && 'blocked_domains' in config);
          const hasFormSelector = Boolean(config && 'form_selector' in config);
          setSupportsBlockedDomains(hasBlockedDomains);
          setSupportsFormSelector(hasFormSelector);
          setFormData({
            name: detail?.name ?? '',
            site_url: detail?.site_url ?? '',
            is_active: detail?.is_active ?? true,
            enable_url_detection: config?.enable_url_detection ?? true,
            enable_paste_detection: config?.enable_paste_detection ?? true,
            threshold_sales: Math.round((Number(config?.threshold_sales ?? 0.7)) * 100),
            threshold_spam: Math.round((Number(config?.threshold_spam ?? 0.85)) * 100),
            banned_keywords: (config?.banned_keywords ?? []).join(', '),
            allowed_domains: (config?.allowed_domains ?? []).join(', '),
            blocked_domains: hasBlockedDomains ? (config?.blocked_domains ?? []).join(', ') : '',
            form_selector: hasFormSelector ? config?.form_selector ?? 'form' : 'form',
          });
          if (detail) {
            selectForm(detail.id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'フォーム情報の取得に失敗しました');
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
    };
  }, [formId, selectForm]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || loading) return;

    setSubmitting(true);
    setError(null);

    try {
      const formPayload = {
        name: formData.name.trim(),
        site_url: formData.site_url.trim(),
        is_active: formData.is_active,
      };

      const updateResponse = await fetch(`/api/forms/${formId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formPayload),
      });

      if (!updateResponse.ok) {
        const body = await updateResponse.json().catch(() => ({}));
        const message =
          typeof body?.error === 'string'
            ? body.error
            : body?.error?.message || 'フォームの更新に失敗しました';
        throw new Error(message);
      }

      const configPayload = {
        enable_url_detection: formData.enable_url_detection,
        enable_paste_detection: formData.enable_paste_detection,
        threshold_sales: formData.threshold_sales / 100,
        threshold_spam: formData.threshold_spam / 100,
        banned_keywords: formData.banned_keywords
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        allowed_domains: formData.allowed_domains
          .split(',')
          .map((domain) => domain.trim())
          .filter(Boolean),
        ...(supportsBlockedDomains && {
          blocked_domains: formData.blocked_domains
            .split(',')
            .map((domain) => domain.trim())
            .filter(Boolean),
        }),
        ...(supportsFormSelector && {
          form_selector: formData.form_selector?.trim() || 'form',
        }),
      };

      const configResponse = await fetch(`/api/forms/${formId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload),
      });

      if (!configResponse.ok) {
        const body = await configResponse.json().catch(() => ({}));
        const message =
          typeof body?.error === 'string'
            ? body.error
            : body?.error?.message || 'フォーム設定の更新に失敗しました';
        throw new Error(message);
      }

      await refreshForms();
      router.push(`/forms/${formId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フォームの更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        フォーム情報を読み込み中です...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/forms/${formId}`} className="text-sm text-primary-600 hover:text-primary-700">
            ← フォーム詳細へ戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">フォームを編集</h1>
          <p className="text-gray-500 mt-1">
            基本情報と検出ルールを更新できます。保存するとプレビューと埋め込みに即時反映されます。
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push(`/forms/${formId}`)}>
          変更を破棄
        </Button>
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
            <Checkbox
              label="フォームをアクティブにする"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>フォーム検出設定</CardTitle>
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
              onChange={(e) =>
                setFormData({ ...formData, enable_paste_detection: e.target.checked })
              }
            />
            <Input
              label="監視するフォームセレクター"
              value={formData.form_selector}
              onChange={(e) => setFormData({ ...formData, form_selector: e.target.value })}
              placeholder="form.contact-form"
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
                onChange={(e) =>
                  setFormData({ ...formData, threshold_sales: Number(e.target.value) })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, threshold_spam: Number(e.target.value) })
                }
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
            <CardTitle>禁止キーワード・ドメイン</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">禁止キーワード</label>
              <textarea
                value={formData.banned_keywords}
                onChange={(e) => setFormData({ ...formData, banned_keywords: e.target.value })}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="営業, セールス, 販売促進, 広告代理店"
              />
              <p className="text-xs text-gray-500 mt-1">
                カンマ区切りで入力してください。空欄の場合はデフォルト判定ルールのみが適用されます。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                許可ドメイン (ホワイトリスト)
              </label>
              <textarea
                value={formData.allowed_domains}
                onChange={(e) => setFormData({ ...formData, allowed_domains: e.target.value })}
                rows={2}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                これらのドメインは検出結果に関わらず許可されます。
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
                カンマ区切りで入力してください。サブドメインもまとめて指定できます。
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button type="button" variant="secondary" onClick={() => router.push(`/forms/${formId}`)}>
            キャンセル
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? '更新中...' : '変更を保存'}
          </Button>
        </div>
      </form>
    </div>
  );
}
