# Form Blocker - プロジェクト概要

このドキュメントは、Form Blocker プロジェクトの実装状況と設計思想を記録したものです。

## プロジェクトの目的

Webフォームへの営業目的・スパム送信を自動で検出しブロックするシステムのMVPを構築する。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand
- **AI**: Gemini Flash Lite (予定)
- **バックエンド**: Supabase (予定)

## アーキテクチャの設計思想

### フォーム中心のアーキテクト

当初は「プロジェクト」という概念で設計されていたが、ユーザーフィードバックにより「フォーム管理」という概念に変更。複数のフォームを管理できる構成となっている。

**主要な変更点:**
- `Project` → `Form` への用語変更
- 各フォームは独自の `api_key` を持つ
- 各フォームは独立した設定 (`FormConfig`) を持つ
- すべての送信データ (`Submission`) は `form_id` で紐付けられる
- サイドバーにフォーム切り替えドロップダウンを配置

### データモデル

#### Form (フォーム)
```typescript
interface Form {
  id: string;
  user_id: string;
  name: string;              // フォーム名
  site_url: string;          // 設置サイトのURL
  api_key: string;           // API認証キー
  is_active: boolean;        // 有効/無効
  created_at: string;
  updated_at: string;
}
```

#### FormConfig (フォーム設定)
```typescript
interface FormConfig {
  id: string;
  form_id: string;
  enable_url_detection: boolean;      // URL検出を有効にするか
  enable_paste_detection: boolean;    // ペースト検出を有効にするか
  threshold_sales: number;            // 営業スコア閾値 (0.0-1.0)
  threshold_spam: number;             // スパムスコア閾値 (0.0-1.0)
  banned_keywords: string[];          // 追加禁止キーワード
  allowed_domains: string[];          // 許可ドメイン
  created_at: string;
  updated_at: string;
}
```

**重要な設計判断:**
- `banned_keywords` は「追加禁止キーワード」として位置づけ
- 基本的な禁止キーワードは閾値に応じてバックエンド側で自動設定される
- ユーザーは追加で禁止したいキーワードのみを指定

#### Submission (送信データ)
```typescript
interface Submission {
  id: string;
  form_id: string;                    // 所属フォーム
  status: SubmissionStatus;           // 'allowed' | 'challenged' | 'held' | 'blocked'
  score_sales: number;                // 営業スコア (0.0-1.0)
  score_spam: number;                 // スパムスコア (0.0-1.0)
  final_decision: string;             // 最終判定
  content: Record<string, any>;       // フォーム送信内容
  metadata: SubmissionMetadata;       // メタデータ
  detection_reasons: string[];        // 検出理由
  llm_reasoning?: string;             // AI判定理由
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}
```

### 状態管理

Zustandを使用した2つのストア:

#### AuthStore (認証)
```typescript
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}
```

#### FormStore (フォーム管理)
```typescript
interface FormStore {
  forms: Form[];                                      // 全フォームリスト
  currentForm: Form | null;                           // 現在選択中のフォーム
  formConfigs: Record<string, FormConfig>;            // フォームごとの設定
  setCurrentForm: (form: Form) => void;               // フォーム切り替え
  getCurrentFormConfig: () => FormConfig | null;      // 現在のフォーム設定取得
  updateFormConfig: (formId: string, config: Partial<FormConfig>) => void;  // 設定更新
}
```

**設計のポイント:**
- `currentForm` でアクティブなフォームを管理
- すべてのダッシュボード画面は `currentForm` を基準にデータをフィルタリング
- フォームが未選択の場合は「フォームを選択してください」と表示

## ディレクトリ構造

```
form-blocker/
├── src/
│   ├── app/
│   │   ├── (dashboard)/                # ダッシュボードレイアウトグループ
│   │   │   ├── layout.tsx              # サイドバー + ヘッダー
│   │   │   ├── dashboard/              # ダッシュボード画面
│   │   │   │   └── page.tsx
│   │   │   ├── forms/                  # フォーム管理
│   │   │   │   ├── page.tsx            # フォーム一覧
│   │   │   │   └── new/                # フォーム作成
│   │   │   │       └── page.tsx
│   │   │   ├── submissions/            # 送信履歴
│   │   │   │   ├── page.tsx            # 一覧
│   │   │   │   └── [id]/              # 詳細
│   │   │   │       └── page.tsx
│   │   │   ├── settings/               # 設定
│   │   │   │   └── page.tsx
│   │   │   └── embed/                  # 埋め込みコード
│   │   │       └── page.tsx
│   │   ├── api/                        # APIルート (未実装)
│   │   ├── layout.tsx                  # ルートレイアウト
│   │   ├── page.tsx                    # ランディングページ
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                         # UIコンポーネント
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   └── Slider.tsx
│   │   └── layout/                     # レイアウトコンポーネント
│   │       ├── Sidebar.tsx             # サイドバー (フォーム選択含む)
│   │       └── Header.tsx              # ヘッダー (現在のフォーム情報表示)
│   ├── lib/
│   │   ├── store.ts                    # Zustand ストア
│   │   ├── utils.ts                    # ユーティリティ関数
│   │   └── mock-data.ts                # モックデータ
│   └── types/
│       └── index.ts                    # TypeScript型定義
├── public/
│   └── embed/
│       └── form-blocker.min.js         # 埋め込みスクリプト (予定)
└── (設定ファイル群)
```

## 画面構成と実装状況

### 1. ダッシュボード (`/dashboard`)
**実装状況**: ✅ 完了

**機能:**
- 4つの統計カード (総送信数、ブロック数、許可数、チャレンジ数)
- ブロック率の計算と表示
- 最近ブロックされた送信一覧 (上位5件)
- 現在選択中のフォームに基づくデータフィルタリング

**実装場所**: `src/app/(dashboard)/dashboard/page.tsx`

**重要なコード:**
```typescript
// 現在のフォームの送信データのみをフィルタリング
const formSubmissions = mockSubmissions.filter(s => s.form_id === currentForm.id);
```

### 2. フォーム管理 (`/forms`)
**実装状況**: ✅ 完了

**機能:**
- フォーム一覧をグリッド表示
- 各フォームカードに以下を表示:
  - フォーム名とステータスバッジ
  - サイトURL
  - API Key (コピー機能付き)
  - 作成日時
- クイックアクション:
  - フォーム選択
  - 埋め込みコード表示
  - 設定画面へ遷移
- 新規フォーム作成ボタン

**実装場所**: `src/app/(dashboard)/forms/page.tsx`

### 3. フォーム作成 (`/forms/new`)
**実装状況**: ✅ 完了

**機能:**
- 基本情報入力 (フォーム名、サイトURL)
- 検出機能の有効/無効設定
  - URL検出
  - ペースト検出
- 判定閾値の調整 (スライダー)
  - 営業スコア閾値 (0-100%)
  - スパムスコア閾値 (0-100%)
- 追加禁止キーワードの設定
  - テキストエリア (カンマ区切り)
  - 説明文: 「基本的な禁止キーワードは閾値に応じてバックエンド側で自動設定されます」

**実装場所**: `src/app/(dashboard)/forms/new/page.tsx`

### 4. 送信履歴 (`/submissions`)
**実装状況**: ✅ 完了

**機能:**
- ステータスフィルタリング (すべて、許可、チャレンジ、保留、ブロック)
- 並び替え (日時順、スコア順)
- 送信一覧表示
  - ステータスバッジ
  - 日時、IP アドレス
  - 送信者情報 (名前、メールアドレス)
  - メッセージの抜粋
  - 営業スコア、スパムスコア (色分け表示)
  - 検出理由のタグ
- クリックで詳細ページへ遷移

**実装場所**: `src/app/(dashboard)/submissions/page.tsx`

**フィルタリングロジック:**
```typescript
// 現在のフォームの送信データのみ
let filteredSubmissions = mockSubmissions.filter(s => s.form_id === currentForm.id);

// ステータスフィルタリング
if (statusFilter !== 'all') {
  filteredSubmissions = filteredSubmissions.filter(s => s.status === statusFilter);
}
```

### 5. 送信詳細 (`/submissions/[id]`)
**実装状況**: ✅ 完了

**機能:**
- 基本情報の表示 (ID、ステータス、日時、IP、User Agent)
- 判定スコアの可視化 (営業スコア、スパムスコア)
- 検出理由の一覧
- AI判定理由の表示
- フォーム送信内容の表示
- アクションボタン (承認、ブロック等)

**実装場所**: `src/app/(dashboard)/submissions/[id]/page.tsx`

### 6. 設定 (`/settings`)
**実装状況**: ✅ 完了

**機能:**
- 検出機能の有効/無効切り替え
- 判定閾値の調整 (スライダー)
- 追加禁止キーワードの編集
- 設定保存ボタン

**実装場所**: `src/app/(dashboard)/settings/page.tsx`

**重要な実装:**
```typescript
const { getCurrentFormConfig, updateFormConfig } = useFormStore();
const formConfig = getCurrentFormConfig();

// 現在選択中のフォームの設定を取得・更新
```

### 7. 埋め込みコード (`/embed`)
**実装状況**: ✅ 完了

**機能:**
- JavaScriptスニペットコードの表示
- コピー機能
- 現在のフォームのAPI Keyを自動挿入

**実装場所**: `src/app/(dashboard)/embed/page.tsx`

### 8. レイアウトコンポーネント

#### Sidebar
**実装場所**: `src/components/layout/Sidebar.tsx`

**機能:**
- アプリケーションロゴ
- フォーム選択ドロップダウン (アクティブなフォームのみ表示)
- ナビゲーションメニュー
  - ダッシュボード
  - フォーム管理
  - 送信履歴
  - 設定
- ユーザー情報表示

**重要な実装:**
```typescript
<select
  value={currentForm?.id || ''}
  onChange={(e) => {
    const form = forms.find(f => f.id === e.target.value);
    if (form) setCurrentForm(form);
  }}
>
  {forms.filter(f => f.is_active).map((form) => (
    <option key={form.id} value={form.id}>
      {form.name}
    </option>
  ))}
</select>
```

#### Header
**実装場所**: `src/components/layout/Header.tsx`

**機能:**
- 現在選択中のフォーム名を表示
- サイトURLの表示
- API Key の表示とコピー機能
- フォーム未選択時のハンドリング

## UIコンポーネント

すべてのUIコンポーネントは `src/components/ui/` に配置され、再利用可能な形で実装されています。

### Button
**Props:**
- `variant`: 'primary' | 'secondary' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- その他の標準button属性

### Card, CardHeader, CardTitle, CardContent
カード型レイアウトコンポーネント。ダッシュボード全体で統一的に使用。

### Badge
**Props:**
- `variant`: 'default' | 'success' | 'warning' | 'danger' | 'info'

ステータス表示に使用。

### Input, Select, Checkbox, Slider
フォーム入力コンポーネント。`label` プロップで統一的なラベル表示が可能。

## モックデータ

現在はバックエンド未実装のため、すべてのデータは `src/lib/mock-data.ts` で定義されています。

### mockForms
3つのサンプルフォーム:
- お問い合わせフォーム (`form-1`)
- 採用応募フォーム (`form-2`)
- 資料請求フォーム (`form-3`)

### mockFormConfigs
各フォームの設定を `Record<string, FormConfig>` 形式で管理。

### mockSubmissions
各フォームに紐づく送信データ。様々なステータスのサンプルを含む。

## 判定ロジック (予定)

### 2段階判定システム

1. **ルールベース判定** (Phase 1)
   - URL検出
   - キーワードマッチング
   - ペースト検出
   - 行動分析 (送信速度など)

2. **AI判定** (Phase 2 - Gemini Flash Lite)
   - コンテキストを考慮した総合判断
   - 微妙なケースの判定
   - 判定理由の自然言語生成

### スコアリング

- **営業スコア (score_sales)**: 0.0 - 1.0
- **スパムスコア (score_spam)**: 0.0 - 1.0

### 判定結果

| スコア範囲 | 判定 | 説明 |
|-----------|------|------|
| >= 0.85 | `blocked` | 自動ブロック |
| >= 0.7 | `challenged` | 追加確認が必要 |
| >= 0.5 | `held` | 手動レビュー待ち |
| < 0.5 | `allowed` | 許可 |

## 今後の実装予定

### フェーズ1: バックエンド統合
- [ ] Supabase プロジェクト作成
- [ ] データベーススキーマ実装
- [ ] 認証機能の実装
- [ ] API エンドポイントの実装
  - `POST /api/v1/evaluate` - フォーム評価
  - `GET /api/v1/submissions` - 送信履歴取得
  - `POST /api/v1/forms` - フォーム作成
  - `PUT /api/v1/forms/:id` - フォーム更新

### フェーズ2: AI統合
- [ ] Gemini Flash Lite API統合
- [ ] プロンプトエンジニアリング
- [ ] AI判定結果の保存とUI表示
- [ ] フォールバック処理 (AI障害時)

### フェーズ3: 埋め込みスクリプト
- [ ] `form-blocker.min.js` の実装
- [ ] フォーム送信のインターセプト
- [ ] 行動データの収集
- [ ] チャレンジUIの実装

### フェーズ4: 追加機能
- [ ] 通知機能 (メール、Webhook)
- [ ] 分析・レポート機能
- [ ] エクスポート機能 (CSV, JSON)
- [ ] 異議申立て機能
- [ ] IPブラックリスト
- [ ] レート制限

## 設計上の重要な判断

### 1. プロジェクトからフォームへの変更
**背景**: 当初は「プロジェクト」という概念で設計したが、ユーザーから「プロジェクトという概念は不自然」とフィードバック。

**判断**:
- より直感的な「フォーム」という概念に変更
- 複数フォームの管理を前提とした設計
- フォーム切り替えをサイドバーに配置

### 2. 禁止キーワードの扱い
**背景**: 当初は禁止キーワードをユーザーが完全に管理する設計だった。

**判断**:
- 基本的な禁止キーワードはバックエンドで自動設定
- ユーザーは「追加禁止キーワード」のみを指定
- UI上で明確に説明文を表示

**理由**:
- ユーザーの設定負担を軽減
- 閾値に応じた動的なキーワード管理が可能
- より柔軟な判定ロジックを実現

### 3. モックデータでのMVP開発
**判断**: バックエンド実装前にフロントエンドを完全にモックで実装

**メリット**:
- UI/UXの早期検証
- ユーザーフィードバックの取得
- バックエンド設計への反映

### 4. Zustandによる状態管理
**判断**: Reduxではなく Zustand を採用

**理由**:
- シンプルなAPI
- ボイラープレートが少ない
- TypeScriptとの相性が良い
- MVPに適した軽量さ

## コーディング規約

### TypeScript
- すべてのコンポーネントとファイルでTypeScriptを使用
- `any` 型の使用は最小限に
- インターフェースは `src/types/index.ts` に集約

### React
- 関数コンポーネントのみを使用
- 'use client' ディレクティブを適切に配置
- カスタムフックは `use` プレフィックスを付ける

### スタイリング
- Tailwind CSS のユーティリティクラスを使用
- カスタムCSSは最小限に
- レスポンシブデザインを考慮 (md:, lg: などのブレークポイント)

### ファイル命名
- コンポーネント: PascalCase (例: `Button.tsx`)
- ユーティリティ: camelCase (例: `utils.ts`)
- Next.js ルート: kebab-case (例: `forms/new/page.tsx`)

## テスト戦略 (今後)

### ユニットテスト
- ユーティリティ関数のテスト
- コンポーネントの単体テスト
- ストアのロジックテスト

### 統合テスト
- API エンドポイントのテスト
- フォーム送信フローのE2Eテスト
- 判定ロジックの統合テスト

## デプロイメント (予定)

- **フロントエンド**: Vercel
- **バックエンド**: Supabase
- **CDN**: Vercel Edge Network (埋め込みスクリプト配信)

## 開発メモ

### 注意点
- `currentForm` が `null` の場合のハンドリングを忘れずに
- すべてのデータフィルタリングは `form_id` を基準に行う
- API Key は秘匿情報として扱う (本番環境では適切な権限管理が必要)

### パフォーマンス考慮事項
- 大量の送信データを扱う場合のページネーション実装が必要
- 統計データのキャッシング戦略
- リアルタイム更新の実装 (WebSocket または Polling)

### セキュリティ考慮事項
- API Key の適切な管理
- CORS設定の適切な実装
- レート制限の実装
- XSS対策 (ユーザー入力のサニタイズ)

## まとめ

Form Blocker は、シンプルで直感的なUIを持つフォームスパム対策システムです。現在はモックデータを使用したMVP段階ですが、フロントエンドの実装は完了しており、バックエンド統合とAI機能の追加により完全なシステムとなります。

フォーム中心の設計により、複数のWebサイトのフォームを一元管理でき、それぞれに最適化された設定と判定を提供できる柔軟な構造になっています。
