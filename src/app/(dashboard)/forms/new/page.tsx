'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Slider } from '@/components/ui/Slider';

export default function NewFormPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    site_url: '',
    enable_url_detection: true,
    enable_paste_detection: true,
    threshold_sales: 70,
    threshold_spam: 85,
    banned_keywords: '営業, セールス, 販売促進, 広告代理店',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 実際のAPI呼び出しをここに実装
    alert('フォームを作成しました（モックアップ）');
    router.push('/forms');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">新規フォーム作成</h1>
        <p className="text-gray-500 mt-1">監視するフォームを登録します</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="営業, セールス, 販売促進, 広告"
              />
              <p className="text-xs text-gray-500 mt-1">
                基本的な禁止キーワードは閾値に応じてバックエンド側で自動設定されます。ここでは追加で禁止したいキーワードをカンマ区切りで入力してください。
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
          <Button type="submit">
            フォームを作成
          </Button>
        </div>
      </form>
    </div>
  );
}
