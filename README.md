# Form Blocker - スパム・営業目的送信ブロックシステム

Webフォームへの営業目的・スパム送信を自動でブロックするNext.jsアプリケーションのモックアップです。

## 特徴

- 📊 **リアルタイム判定**: フォーム送信をリアルタイムで分析し、営業・スパムを自動検出
- 🎯 **高精度スコアリング**: ルールベース + AI(Gemini Flash Lite)による2段階判定
- 🔧 **簡単な導入**: スニペットコードを貼り付けるだけで利用可能
- 📈 **詳細な分析**: ダッシュボードで送信履歴やブロック率を可視化
- ⚙️ **柔軟な設定**: 閾値・キーワード・通知などをカスタマイズ可能

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), React, TypeScript
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand
- **グラフ**: Recharts
- **AI**: Gemini Flash Lite (予定)

## ディレクトリ構造

```
form-blocker/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (dashboard)/          # ダッシュボードレイアウト
│   │   │   ├── dashboard/        # ダッシュボード画面
│   │   │   ├── projects/         # プロジェクト管理
│   │   │   ├── submissions/      # 送信履歴
│   │   │   └── settings/         # 設定画面
│   │   ├── api/                  # APIルート
│   │   │   └── v1/
│   │   │       └── evaluate/     # 評価APIエンドポイント
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                   # 共通UIコンポーネント
│   │   └── layout/               # レイアウトコンポーネント
│   ├── lib/
│   │   ├── store.ts              # Zustand状態管理
│   │   ├── utils.ts              # ユーティリティ関数
│   │   └── mock-data.ts          # モックデータ
│   └── types/
│       └── index.ts              # TypeScript型定義
├── public/
│   └── embed/
│       └── form-blocker.min.js   # 埋め込みスクリプト
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example`をコピーして`.env.local`を作成:

```bash
cp .env.local.example .env.local
```

`.env.local`を編集:

```env
# Gemini API (実装時に必要)
GEMINI_API_KEY=your_gemini_api_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CDN_URL=http://localhost:3000

# Stripe (本番/テストキーを指定)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx  # Webhook受信用（任意）
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## 画面構成

### 1. ダッシュボード (`/dashboard`)
- 送信数の統計（総数、ブロック数、許可数、チャレンジ数）
- 送信数の推移グラフ（過去7日間）
- 最近ブロックされた送信一覧

### 2. プロジェクト管理 (`/projects`)
- プロジェクト一覧表示
- プロジェクトごとのAPI Key管理
- 埋め込みコードへのアクセス

### 3. 埋め込みコード (`/projects/:id/embed`)
- スニペットコードの表示とコピー
- 設置手順の説明
- カスタムオプションの例
- テストフォーム

### 4. 送信履歴 (`/submissions`)
- フィルタリング（ステータス、日時）
- 送信一覧表示
- スコア表示
- 検出理由の表示

### 5. 送信詳細 (`/submissions/:id`)
- 基本情報（ID、ステータス、日時、IP）
- 判定スコア（営業スコア、スパムスコア）
- 検出理由
- AI判定理由
- フォーム送信内容
- アクション（承認、ブロック等）

### 6. 設定 (`/settings`)
- フォーム設定
  - 検出機能の有効/無効
  - 判定閾値の調整
  - 禁止キーワード
  - 許可ドメイン
- 通知設定
  - メール通知
  - Webhook通知
  - ダッシュボード通知
- プロジェクト設定
  - プロジェクト名・ドメイン編集
  - API Key再生成
  - プロジェクト削除

## 埋め込みスクリプトの使い方

### 基本的な使い方

Webサイトに以下のコードを追加:

```html
<script src="http://localhost:3000/embed/form-blocker.min.js"></script>
<script>
  FormBlocker.init({
    apiKey: 'fb_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
  });
</script>
```

### カスタムオプション

```javascript
FormBlocker.init({
  apiKey: 'your_api_key',
  selector: 'form.contact-form',  // 特定のフォームのみ監視
  debug: true,                    // デバッグモード
  onBlock: function(result) {
    // ブロック時のカスタム処理
    console.log('Blocked:', result);
  },
  onAllow: function(result) {
    // 許可時のカスタム処理
    console.log('Allowed:', result);
  },
  onChallenge: function(result) {
    // チャレンジ時のカスタムUI
    return showCustomChallenge(result);
  }
});
```

## APIエンドポイント

### POST /api/v1/evaluate

フォーム送信内容を評価します。

**リクエスト:**

```json
{
  "api_key": "fb_live_xxxxxxxxxxxx",
  "form_data": {
    "name": "山田太郎",
    "email": "yamada@example.com",
    "message": "お問い合わせ内容..."
  },
  "metadata": {
    "url": "https://example.com/contact",
    "user_agent": "Mozilla/5.0...",
    "timestamp": 1697123456789
  },
  "behavioral_data": {
    "paste_detected": false,
    "time_to_submit": 30
  }
}
```

**レスポンス:**

```json
{
  "success": true,
  "submission_id": "sub-1697123456789",
  "decision": "allow",
  "scores": {
    "sales": 0.15,
    "spam": 0.1
  },
  "reasons": [],
  "message": "送信が許可されました"
}
```

**判定結果:**
- `allow`: 送信を許可
- `challenge`: 追加確認が必要
- `hold`: 保留（手動確認待ち）
- `block`: ブロック

## モックデータ

開発用のモックデータは `src/lib/mock-data.ts` に定義されています:

- **ユーザー**: デモユーザー（demo@example.com）
- **プロジェクト**: 2つのサンプルプロジェクト
- **送信履歴**: 4件のサンプル送信（許可、チャレンジ、ブロック）
- **フォーム設定**: 1つのサンプル設定
- **通知設定**: 1つのメール通知設定

## 判定ロジック（モック実装）

現在のモック実装では以下のルールで判定しています:

### 営業スコアの計算
- URL検出: +0.3
- 営業キーワード（営業、セールス、提案、御社、貴社など）: +0.2 × 検出数
- ペースト検出: +0.2

### スパムスコアの計算
- スパムキーワード（今すぐ、限定、無料、特別、クリック）: +0.3 × 検出数
- 高速送信（5秒未満）: +0.3

### 判定基準
- `スコア >= 0.85`: ブロック
- `スコア >= 0.7`: チャレンジ
- `スコア >= 0.5`: 保留
- `スコア < 0.5`: 許可

## 今後の実装予定

- [ ] Supabase統合（データベース、認証）
- [ ] Gemini Flash Lite統合（AI判定）
- [ ] 実際の送信データの保存
- [ ] メール通知機能
- [ ] Webhook通知機能
- [ ] 分析機能の拡充
- [ ] エクスポート機能（CSV、JSON）
- [ ] 異議申立て機能
- [ ] IPブラックリスト機能
- [ ] レート制限

## ライセンス

MIT License

## 作成者

Form Blocker Development Team
