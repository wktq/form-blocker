'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { copyToClipboard } from '@/lib/utils';
import { useFormContext } from '@/lib/forms/context';

export default function EmbedCodePage() {
  const [copied, setCopied] = useState(false);
  const { currentForm, loading, error } = useFormContext();

  const embedCode = `<!-- Form Blocker -->
<script src="${process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:3000'}/embed/form-blocker.min.js"></script>
<script>
  FormBlocker.init({
    apiKey: '${currentForm?.api_key || 'your_api_key_here'}'
  });
</script>`;

  const handleCopy = async () => {
    if (!currentForm) return;
    await copyToClipboard(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">埋め込みコード</h1>
        <p className="text-gray-500 mt-1">Webサイトに以下のコードを追加してください</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>スニペットコード</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            以下のコードをWebサイトの<code className="bg-gray-100 px-1 rounded">&lt;head&gt;</code>タグ内または<code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code>タグの直前に貼り付けてください。
          </p>

          {loading ? (
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm text-center">
              読み込み中...
            </div>
          ) : currentForm ? (
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
                <code>{embedCode}</code>
              </pre>
              <Button
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleCopy}
              >
                {copied ? '✓ コピーしました' : '📋 コピー'}
              </Button>
            </div>
          ) : (
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm text-center">
              フォームが選択されていません
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>設置手順</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 list-decimal list-inside text-sm text-gray-700">
            <li>上記のスニペットコードをコピー</li>
            <li>Webサイトの HTML ファイルを開く</li>
            <li><code className="bg-gray-100 px-1 rounded">&lt;head&gt;</code>タグ内または<code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code>タグの直前にコードを貼り付け</li>
            <li>ファイルを保存してWebサイトを公開</li>
            <li>下記のテストフォームで動作確認</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>テストフォーム</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            以下のフォームでForm Blockerの動作をテストできます
          </p>
          <div className="bg-gray-50 rounded-lg p-6">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お名前
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="山田太郎"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="yamada@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お問い合わせ内容
                </label>
                <textarea
                  rows={4}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="お問い合わせ内容を入力してください"
                />
              </div>
              <Button type="submit">送信</Button>
            </form>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ※ このフォームは実際には送信されません
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
