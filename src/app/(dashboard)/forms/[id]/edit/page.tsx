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
  form_configs?: FormConfig;  // オブジェクト（配列ではない）
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
  whitelist_keywords: string;
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
  whitelist_keywords: '',
  allowed_domains: '',
  blocked_domains: '',
  form_selector: 'form',
};

export default function EditFormPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { refreshForms, selectForm } = useFormContext();
  const [formData, setFormData] = useState<FormState>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<'blacklist' | 'whitelist'>('blacklist');
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
        console.log('[DEBUG] Fetched form data from API:', JSON.stringify(body, null, 2));

        const detail: FormDetail | null = body.form ?? null;
        const config = detail?.form_configs;  // オブジェクトとして直接アクセス

        console.log('[DEBUG] Extracted config from response:', JSON.stringify(config, null, 2));

        if (!cancelled) {
          const hasBlockedDomains = Boolean(config && 'blocked_domains' in config);
          const hasFormSelector = Boolean(config && 'form_selector' in config);
          setSupportsBlockedDomains(hasBlockedDomains);
          setSupportsFormSelector(hasFormSelector);

          const newFormData = {
            name: detail?.name ?? '',
            site_url: detail?.site_url ?? '',
            is_active: detail?.is_active ?? true,
            enable_url_detection: config?.enable_url_detection ?? true,
            enable_paste_detection: config?.enable_paste_detection ?? true,
            threshold_sales: Math.round((Number(config?.threshold_sales ?? 0.7)) * 100),
            threshold_spam: Math.round((Number(config?.threshold_spam ?? 0.85)) * 100),
            banned_keywords: (config?.banned_keywords ?? []).join(', '),
            whitelist_keywords: (config?.whitelist_keywords ?? []).join(', '),
            allowed_domains: (config?.allowed_domains ?? []).join(', '),
            blocked_domains: hasBlockedDomains ? (config?.blocked_domains ?? []).join(', ') : '',
            form_selector: hasFormSelector ? config?.form_selector ?? 'form' : 'form',
          };

          console.log('[DEBUG] Setting formData state to:', JSON.stringify(newFormData, null, 2));
          setFormData(newFormData);

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

    console.log('[DEBUG] Form submission - Current formData state:', JSON.stringify(formData, null, 2));

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
        whitelist_keywords: formData.whitelist_keywords
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

      console.log('[DEBUG] Config payload being sent:', JSON.stringify(configPayload, null, 2));

      const configResponse = await fetch(`/api/forms/${formId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload),
      });

      console.log('[DEBUG] Config API response status:', configResponse.status);

      if (!configResponse.ok) {
        const body = await configResponse.json().catch(() => ({}));
        console.error('[DEBUG] Config API error response:', body);
        const message =
          typeof body?.error === 'string'
            ? body.error
            : body?.error?.message || 'フォーム設定の更新に失敗しました';
        throw new Error(message);
      }

      const configResult = await configResponse.json();
      console.log('[DEBUG] Config API success response:', configResult);

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
            {supportsFormSelector ? (
              <Input
                label="監視するフォームセレクター"
                value={formData.form_selector}
                onChange={(e) => setFormData({ ...formData, form_selector: e.target.value })}
                placeholder="form.contact-form"
              />
            ) : (
              <p className="text-xs text-gray-500">
                この環境のスキーマには form_selector 列がありません。保存の対象外になります。
              </p>
            )}
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
            <CardTitle>キーワード・ドメイン管理</CardTitle>
          </CardHeader>
          <CardContent>
            {/* タブUI */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                type="button"
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'blacklist'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('blacklist')}
              >
                ブラックリスト
              </button>
              <button
                type="button"
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'whitelist'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('whitelist')}
              >
                ホワイトリスト
              </button>
            </div>

            {/* ブラックリストタブ */}
            {activeTab === 'blacklist' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ブラックリストキーワード
                  </label>
                  <textarea
                    value={formData.banned_keywords}
                    onChange={(e) => {
                      console.log('[DEBUG] Banned keywords onChange:', e.target.value);
                      setFormData({ ...formData, banned_keywords: e.target.value });
                    }}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="営業, セールス, 販売促進, 広告代理店"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    これらのキーワードが1つでも含まれていたら即ブロックします。カンマ区切りで入力してください。
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ブラックリストドメイン
                  </label>
                  {supportsBlockedDomains ? (
                    <>
                      <textarea
                        value={formData.blocked_domains}
                        onChange={(e) => {
                          console.log('[DEBUG] Blocked domains onChange:', e.target.value);
                          setFormData({ ...formData, blocked_domains: e.target.value });
                        }}
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="example.com, calendly.com"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        これらのドメインが1つでも含まれていたら即ブロックします。カンマ区切りで入力してください。
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">
                      この環境のスキーマには blocked_domains 列がありません。保存の対象外になります。
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ホワイトリストタブ */}
            {activeTab === 'whitelist' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ホワイトリストキーワード
                  </label>
                  <textarea
                    value={formData.whitelist_keywords}
                    onChange={(e) => {
                      console.log('[DEBUG] Whitelist keywords onChange:', e.target.value);
                      setFormData({ ...formData, whitelist_keywords: e.target.value });
                    }}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="採用, リクルート, 人材募集"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    これらのキーワードが1つでも含まれていたら、他のフラグに関係なく即許可します。カンマ区切りで入力してください。
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ホワイトリストドメイン
                  </label>
                  <textarea
                    value={formData.allowed_domains}
                    onChange={(e) => {
                      console.log('[DEBUG] Allowed domains onChange:', e.target.value);
                      setFormData({ ...formData, allowed_domains: e.target.value });
                    }}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="trusted-partner.com, company.co.jp"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    これらのドメインが1つでも含まれていたら、他のフラグに関係なく即許可します。カンマ区切りで入力してください。
                  </p>
                </div>
              </div>
            )}
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
