'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Slider } from '@/components/ui/Slider';
import { InfoIcon } from '@/components/ui/Tooltip';
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
    whitelist_keywords: '',
    allowed_domains: '',
  });
  const [activeTab, setActiveTab] = useState<'blacklist' | 'whitelist'>('blacklist');
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
        whitelist_keywords: formData.whitelist_keywords
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        allowed_domains: formData.allowed_domains
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
      router.push('/embed?new=true');
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
            <CardTitle className="flex items-center gap-2">
              検出機能
              <InfoIcon tooltip="フォーム送信内容を自動で分析するための基本機能です。これらのフラグはスコアに影響しますが、即ブロックにはなりません。" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <Checkbox
                label="URL検出を有効にする"
                checked={formData.enable_url_detection}
                onChange={(e) => setFormData({ ...formData, enable_url_detection: e.target.checked })}
              />
              <InfoIcon tooltip="フォーム内容にURLが含まれている場合、スコアが上昇します。営業・スパム送信でよく見られるパターンです。" />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                label="ペースト検出を有効にする"
                checked={formData.enable_paste_detection}
                onChange={(e) => setFormData({ ...formData, enable_paste_detection: e.target.checked })}
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
                value={formData.threshold_sales}
                onChange={(e) => setFormData({ ...formData, threshold_sales: Number(e.target.value) })}
                min={0}
                max={100}
              />
              <p className="text-xs text-gray-500 mt-2">
                現在の閾値: {formData.threshold_sales}%
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">スパムスコア閾値</label>
                <InfoIcon tooltip="スパム送信を検出するためのスコア閾値です。70%以上でチャレンジ、85%以上で自動ブロックされます。" />
              </div>
              <Slider
                value={formData.threshold_spam}
                onChange={(e) => setFormData({ ...formData, threshold_spam: Number(e.target.value) })}
                min={0}
                max={100}
              />
              <p className="text-xs text-gray-500 mt-2">
                現在の閾値: {formData.threshold_spam}%
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
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      ブラックリストキーワード
                    </label>
                    <InfoIcon tooltip="これらのキーワードが1つでも含まれていたら即ブロックします。全フィールドで部分一致判定を行います。" />
                  </div>
                  <textarea
                    value={formData.banned_keywords}
                    onChange={(e) => setFormData({ ...formData, banned_keywords: e.target.value })}
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
                    value={formData.blocked_domains}
                    onChange={(e) => setFormData({ ...formData, blocked_domains: e.target.value })}
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
                    value={formData.whitelist_keywords}
                    onChange={(e) => setFormData({ ...formData, whitelist_keywords: e.target.value })}
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
                    value={formData.allowed_domains}
                    onChange={(e) => setFormData({ ...formData, allowed_domains: e.target.value })}
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
