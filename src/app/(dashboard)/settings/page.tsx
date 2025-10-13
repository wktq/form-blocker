'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Slider } from '@/components/ui/Slider';
import { Checkbox } from '@/components/ui/Checkbox';
import { useFormStore } from '@/lib/store';

export default function SettingsPage() {
  const { currentForm, getCurrentFormConfig, updateFormConfig } = useFormStore();
  const formConfig = getCurrentFormConfig();
  const [bannedKeywords, setBannedKeywords] = useState(formConfig?.banned_keywords?.join(', ') || '');

  const handleSave = () => {
    if (!currentForm) return;
    updateFormConfig(currentForm.id, {
      banned_keywords: bannedKeywords.split(',').map(k => k.trim()).filter(k => k),
    });
    alert('設定を保存しました（モックアップ）');
  };

  if (!formConfig || !currentForm) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">フォームが選択されていません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-500 mt-1">フォームの判定設定</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>検出機能</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Checkbox
            label="URL検出を有効にする"
            checked={formConfig.enable_url_detection}
            onChange={(e) => currentForm && updateFormConfig(currentForm.id, { enable_url_detection: e.target.checked })}
          />

          <Checkbox
            label="ペースト検出を有効にする"
            checked={formConfig.enable_paste_detection}
            onChange={(e) => currentForm && updateFormConfig(currentForm.id, { enable_paste_detection: e.target.checked })}
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
              value={formConfig.threshold_sales * 100}
              onChange={(e) => currentForm && updateFormConfig(currentForm.id, { threshold_sales: Number(e.target.value) / 100 })}
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
              value={formConfig.threshold_spam * 100}
              onChange={(e) => currentForm && updateFormConfig(currentForm.id, { threshold_spam: Number(e.target.value) / 100 })}
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
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キーワードリスト
            </label>
            <textarea
              value={bannedKeywords}
              onChange={(e) => setBannedKeywords(e.target.value)}
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

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          設定を保存
        </Button>
      </div>
    </div>
  );
}
