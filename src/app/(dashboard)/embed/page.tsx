'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { copyToClipboard } from '@/lib/utils';
import { useFormContext } from '@/lib/forms/context';

export default function EmbedCodePage() {
  const [copied, setCopied] = useState(false);
  const [copiedAdvanced, setCopiedAdvanced] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { currentForm, loading, error } = useFormContext();
  const searchParams = useSearchParams();
  const isNewForm = searchParams.get('new') === 'true';

  const basicEmbedCode = `<!-- FormBlocker -->
<script src="${process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:3000'}/embed/form-blocker.min.js"></script>
<script>
  FormBlocker.init({
    apiKey: '${currentForm?.api_key || 'your_api_key_here'}'
  });
</script>`;

  const advancedEmbedCode = `<!-- FormBlocker (高度な設定) -->
<script src="${process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:3000'}/embed/form-blocker.min.js"></script>
<script>
  FormBlocker.init({
    apiKey: '${currentForm?.api_key || 'your_api_key_here'}',
    // フォーム要素を指定する（省略時は自動検出）
    select: 'form#contact-form',
    // DOMの変更を監視する（SPAなど動的にフォームが追加される場合）
    observeMutations: true
  });
</script>`;

  const handleCopy = async () => {
    if (!currentForm) return;
    await copyToClipboard(basicEmbedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAdvanced = async () => {
    if (!currentForm) return;
    await copyToClipboard(advancedEmbedCode);
    setCopiedAdvanced(true);
    setTimeout(() => setCopiedAdvanced(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">埋め込みコード</h1>
        <p className="text-gray-500 mt-1">Webサイトに以下のコードを追加してください</p>
      </div>

      {isNewForm && currentForm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">🎉</span>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-1">フォームの作成が完了しました！</h3>
              <p className="text-sm text-green-800 mb-4">
                次のステップとして、下記の埋め込みコードをあなたのWebサイトに追加しましょう！
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.href = `/forms/${currentForm.id}/edit`}
                >
                  📝 フォーム設定をカスタマイズ
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.href = `/forms/${currentForm.id}`}
                >
                  👁️ フォーム詳細を見る
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.href = '/submissions'}
                >
                  📊 送信履歴を確認
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* 基本の埋め込みコード */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>基本の埋め込みコード</CardTitle>
            <Badge variant="success">推奨</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            以下のコードをWebサイトに貼り付けると、FormBlockerが自動的にフォームを保護します。
          </p>

          {loading ? (
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm text-center">
              読み込み中...
            </div>
          ) : currentForm ? (
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
                <code>{basicEmbedCode}</code>
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

      {/* ステップバイステップガイド */}
      <Card>
        <CardHeader>
          <CardTitle>設置手順（初心者向け）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">上のコードをコピー</h4>
                <p className="text-sm text-gray-600">
                  「📋 コピー」ボタンをクリックして、埋め込みコードをクリップボードにコピーします。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">HTMLファイルを開く</h4>
                <p className="text-sm text-gray-600 mb-2">
                  あなたのWebサイトのHTMLファイルをテキストエディタで開きます。
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                  <strong>💡 ヒント：</strong> WordPressなどのCMSを使用している場合は、テーマの <code className="bg-blue-100 px-1 rounded">header.php</code> または <code className="bg-blue-100 px-1 rounded">footer.php</code> を編集します。
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">コードを貼り付け</h4>
                <p className="text-sm text-gray-600 mb-2">
                  以下のいずれかの場所にコードを貼り付けます：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                  <li><code className="bg-gray-100 px-1 rounded">&lt;/head&gt;</code> タグの直前（推奨）</li>
                  <li><code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> タグの直前</li>
                </ul>
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3">
                  <p className="text-xs text-gray-600 mb-2">例：</p>
                  <pre className="text-xs text-gray-800 overflow-x-auto">
{`<head>
  <title>お問い合わせ</title>
  <!-- 他のスクリプト -->

  <!-- FormBlocker をここに貼り付け -->
  <script src="..."></script>
</head>`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">保存して公開</h4>
                <p className="text-sm text-gray-600">
                  ファイルを保存し、Webサイトにアップロードします。これで設置完了です！
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
                ✓
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">動作確認</h4>
                <p className="text-sm text-gray-600">
                  Webサイトのフォームにテスト送信をして、正常に動作するか確認してください。送信データは「送信履歴」ページで確認できます。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 高度な設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>高度な設定（オプション）</CardTitle>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {showAdvanced ? '非表示' : '表示'}
            </button>
          </div>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              特定のフォームのみを保護したい場合や、SPAなど動的にフォームが追加される場合は、以下のオプションを使用できます。
            </p>

            {currentForm && (
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
                  <code>{advancedEmbedCode}</code>
                </pre>
                <Button
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleCopyAdvanced}
                >
                  {copiedAdvanced ? '✓ コピーしました' : '📋 コピー'}
                </Button>
              </div>
            )}

            <div className="space-y-4 mt-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">select</code> オプション
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  特定のフォームのみを保護したい場合に使用します。CSSセレクタでフォーム要素を指定できます。
                </p>
                <div className="bg-gray-50 rounded p-3 text-sm">
                  <p className="text-gray-700 mb-2"><strong>例：</strong></p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                    <li><code className="bg-gray-100 px-1 rounded">select: 'form#contact-form'</code> - IDが「contact-form」のフォームのみ</li>
                    <li><code className="bg-gray-100 px-1 rounded">select: 'form.protected'</code> - クラスが「protected」のフォームのみ</li>
                    <li><code className="bg-gray-100 px-1 rounded">select: 'form[data-protect="true"]'</code> - data-protect属性があるフォームのみ</li>
                  </ul>
                  <p className="text-gray-500 text-xs mt-2">
                    ※ 省略した場合は、ページ内のすべてのフォームが自動的に保護されます。
                  </p>
                </div>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">observeMutations</code> オプション
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  React、Vue、Angularなどのフレームワークで、ページ読み込み後に動的にフォームが追加される場合に有効にします。
                </p>
                <div className="bg-gray-50 rounded p-3 text-sm">
                  <p className="text-gray-700 mb-2"><strong>使用例：</strong></p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                    <li>React、Vue、AngularなどのSPA（シングルページアプリケーション）</li>
                    <li>モーダルやタブで表示されるフォーム</li>
                    <li>AjaxでHTMLが動的に追加される場合</li>
                  </ul>
                  <p className="text-gray-500 text-xs mt-2">
                    ※ デフォルトは <code className="bg-gray-100 px-1 rounded">false</code> です。静的なHTMLサイトでは不要です。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

    </div>
  );
}
