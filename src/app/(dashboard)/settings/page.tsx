'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Checkbox } from '@/components/ui/Checkbox';
import { InfoIcon } from '@/components/ui/Tooltip';
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
  const [whitelistKeywords, setWhitelistKeywords] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [formSelector, setFormSelector] = useState('form');
  const [activeTab, setActiveTab] = useState<'blacklist' | 'whitelist'>('blacklist');
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
        const conf: FormConfig | null = body.form?.form_configs ?? null;
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
          setWhitelistKeywords(conf?.whitelist_keywords?.join(', ') ?? '');
          setAllowedDomains(conf?.allowed_domains?.join(', ') ?? '');
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
          whitelist_keywords: whitelistKeywords
            .split(',')
            .map((keyword) => keyword.trim())
            .filter(Boolean),
          allowed_domains: allowedDomains
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
          <CardTitle className="flex items-center gap-2">
            検出機能
            <InfoIcon tooltip="フォーム送信内容を自動で分析するための基本機能です。これらのフラグはスコアに影響しますが、即ブロックにはなりません。" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2">
            <Checkbox
              label="URL検出を有効にする"
              checked={config.enable_url_detection}
              onChange={(event) =>
                setConfig((prev) =>
                  prev ? { ...prev, enable_url_detection: event.target.checked } : prev
                )
              }
            />
            <InfoIcon tooltip="フォーム内容にURLが含まれている場合、スコアが上昇します。営業・スパム送信でよく見られるパターンです。" />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              label="ペースト検出を有効にする"
              checked={config.enable_paste_detection}
              onChange={(event) =>
                setConfig((prev) =>
                  prev ? { ...prev, enable_paste_detection: event.target.checked } : prev
                )
              }
            />
            <InfoIcon tooltip="コピー&ペーストで入力された内容を検出します。大量のテキストを一度に貼り付ける営業・スパム行為に対応します。" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            判定閾値
            <InfoIcon tooltip="ホワイトリスト・ブラックリストに該当しない場合に、スコアベースで判定を行うための閾値です。スコアが高いほど営業・スパムの可能性が高いと判定されます。" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-700">営業スコア閾値</label>
              <InfoIcon tooltip="営業目的の送信を検出するためのスコア閾値です。70%以上でチャレンジ、85%以上で自動ブロックされます。" />
            </div>
            <Slider
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
              現在の閾値: {thresholds.sales}%
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-700">スパムスコア閾値</label>
              <InfoIcon tooltip="スパム送信を検出するためのスコア閾値です。70%以上でチャレンジ、85%以上で自動ブロックされます。" />
            </div>
            <Slider
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
              現在の閾値: {thresholds.spam}%
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
          <CardTitle className="flex items-center gap-2">
            キーワード・ドメイン管理
            <InfoIcon tooltip="ブラックリストに一致したら即ブロック、ホワイトリストに一致したら他のフラグが立っていても即許可されます。ホワイトリストが優先されます。" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* タブUI */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
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
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    ブラックリストキーワード
                  </label>
                  <InfoIcon tooltip="これらのキーワードが1つでも含まれていたら即ブロックします。全フィールドで部分一致判定を行います。" />
                </div>
                <textarea
                  value={bannedKeywords}
                  onChange={(event) => setBannedKeywords(event.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="営業, セールス, 販売促進, 広告"
                />
                <p className="text-xs text-gray-500 mt-1">
                  カンマ区切りで入力してください。例: 営業, セールス
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    ブラックリストドメイン
                  </label>
                  <InfoIcon tooltip="これらのドメインが1つでも含まれていたら即ブロックします。URL・メールアドレス両方で判定し、サブドメインも含みます。" />
                </div>
                <textarea
                  value={blockedDomains}
                  onChange={(event) => setBlockedDomains(event.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="example.com, spam-domain.net"
                />
                <p className="text-xs text-gray-500 mt-1">
                  カンマ区切りで入力してください。例: calendly.com, spam-domain.net
                </p>
              </div>
            </div>
          )}

          {/* ホワイトリストタブ */}
          {activeTab === 'whitelist' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    ホワイトリストキーワード
                  </label>
                  <InfoIcon tooltip="これらのキーワードが1つでも含まれていたら、他のフラグに関係なく即許可します。全フィールドで部分一致判定を行います。" />
                </div>
                <textarea
                  value={whitelistKeywords}
                  onChange={(event) => setWhitelistKeywords(event.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="採用, リクルート, 人材募集"
                />
                <p className="text-xs text-gray-500 mt-1">
                  カンマ区切りで入力してください。例: 採用, 人材募集
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    ホワイトリストドメイン
                  </label>
                  <InfoIcon tooltip="これらのドメインが1つでも含まれていたら、他のフラグに関係なく即許可します。URL・メールアドレス両方で判定し、サブドメインも含みます。" />
                </div>
                <textarea
                  value={allowedDomains}
                  onChange={(event) => setAllowedDomains(event.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="trusted-partner.com, company.co.jp"
                />
                <p className="text-xs text-gray-500 mt-1">
                  カンマ区切りで入力してください。例: trusted-partner.com
                </p>
              </div>
            </div>
          )}
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
