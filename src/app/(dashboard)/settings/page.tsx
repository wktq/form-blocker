'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Checkbox } from '@/components/ui/Checkbox';
import { useFormContext } from '@/lib/forms/context';
import type { FormConfig } from '@/types';

const sanitizeSelector = (value?: string | null) => {
  if (!value) return 'form';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'form';
};

export default function SettingsPage() {
  const { currentForm, refreshForms } = useFormContext();
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [bannedKeywords, setBannedKeywords] = useState('');
  const [blockedDomains, setBlockedDomains] = useState('');
  const [formSelector, setFormSelector] = useState('form');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!currentForm) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const response = await fetch(`/api/forms/${currentForm.id}`);
        if (!response.ok) {
          throw new Error('フォーム設定の取得に失敗しました');
        }
        const body = await response.json();
        const conf: FormConfig | null = body.form?.form_configs?.[0] ?? null;
        if (!cancelled) {
          const normalizedConfig = conf
            ? {
                ...conf,
                form_selector: sanitizeSelector(conf.form_selector),
              }
            : null;
          setConfig(normalizedConfig);
          setBannedKeywords(conf?.banned_keywords?.join(', ') ?? '');
          setBlockedDomains(conf?.blocked_domains?.join(', ') ?? '');
          setFormSelector(normalizedConfig?.form_selector ?? 'form');
        }
      } catch (err) {
        if (!cancelled) {
          setMessage({
            type: 'error',
            text: err instanceof Error ? err.message : 'フォーム設定の取得に失敗しました',
          });
          setConfig(null);
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
  }, [currentForm]);

  const thresholds = useMemo(
    () => ({
      sales: Math.round((config?.threshold_sales ?? 0.7) * 100),
      spam: Math.round((config?.threshold_spam ?? 0.7) * 100),
    }),
    [config]
  );

  const handleSave = async () => {
    if (!currentForm || !config) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/forms/${currentForm.id}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enable_url_detection: config.enable_url_detection,
          enable_paste_detection: config.enable_paste_detection,
          threshold_sales: config.threshold_sales,
          threshold_spam: config.threshold_spam,
          banned_keywords: bannedKeywords
            .split(',')
            .map((keyword) => keyword.trim())
            .filter(Boolean),
          blocked_domains: blockedDomains
            .split(',')
            .map((domain) => domain.trim())
            .filter(Boolean),
          form_selector: sanitizeSelector(formSelector),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const text =
          typeof body?.error === 'string'
            ? body.error
            : body?.error?.message || '設定の保存に失敗しました';
        throw new Error(text);
      }

      const body = await response.json();
      const normalizedConfig = body.config
        ? {
            ...body.config,
            form_selector: sanitizeSelector(body.config.form_selector),
          }
        : body.config;
      setConfig(normalizedConfig);
      setFormSelector(normalizedConfig?.form_selector ?? 'form');
      setMessage({ type: 'success', text: '設定を保存しました' });
      await refreshForms();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '設定の保存に失敗しました',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!currentForm) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">フォームが選択されていません</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        設定を読み込み中です...
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-gray-500">設定情報を取得できませんでした</p>
        {message?.type === 'error' && <p className="text-red-500 text-sm">{message.text}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-500 mt-1">{currentForm.name} の判定設定</p>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{message.text}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>検出機能</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Checkbox
            label="URL検出を有効にする"
            checked={config.enable_url_detection}
            onChange={(event) =>
              setConfig((prev) =>
                prev ? { ...prev, enable_url_detection: event.target.checked } : prev
              )
            }
          />

          <Checkbox
            label="ペースト検出を有効にする"
            checked={config.enable_paste_detection}
            onChange={(event) =>
              setConfig((prev) =>
                prev ? { ...prev, enable_paste_detection: event.target.checked } : prev
              )
            }
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
              value={thresholds.sales}
              onChange={(event) =>
                setConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        threshold_sales: Number(event.target.value) / 100,
                      }
                    : prev
                )
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
              value={thresholds.spam}
              onChange={(event) =>
                setConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        threshold_spam: Number(event.target.value) / 100,
                      }
                    : prev
                )
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
          <CardTitle>監視対象フォーム</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              フォーム CSS セレクター
            </label>
            <input
              type="text"
              value={formSelector}
              onChange={(event) => {
                const value = event.target.value;
                setFormSelector(value);
                setConfig((prev) => (prev ? { ...prev, form_selector: value } : prev));
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="form.contact-form"
            />
            <p className="text-xs text-gray-500 mt-1">
              監視したいフォーム要素を CSS セレクターで指定します。空の場合はページ内のすべての
              <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-[10px] uppercase">form</code>
              が対象になります。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>追加禁止キーワード</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キーワードリスト
            </label>
            <textarea
              value={bannedKeywords}
              onChange={(event) => setBannedKeywords(event.target.value)}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="営業, セールス, 販売促進, 広告"
            />
            <p className="text-xs text-gray-500 mt-1">
              サービス側で標準的な禁止キーワードは用意されています。ここでは追加で禁止したいキーワードをカンマ区切りで入力してください。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ブロック対象ドメイン
            </label>
            <textarea
              value={blockedDomains}
              onChange={(event) => setBlockedDomains(event.target.value)}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="example.com, calendly.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              営業・スパム送信に使われがちなドメインがあればカンマ区切りで指定してください。該当ドメインを含むURLやメールアドレスが送信された場合にスコアが大きく上昇します。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '設定を保存'}
        </Button>
      </div>
    </div>
  );
}
