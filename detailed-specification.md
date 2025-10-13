# 詳細仕様書 - Form Blocker System (MVP)

## ドキュメント情報

- **バージョン**: 1.0.0 (MVP)
- **作成日**: 2025-10-13
- **対象**: MVP版 - 最小限の機能で早期リリース

---

## 目次

1. [システムアーキテクチャ](#1-システムアーキテクチャ)
2. [データベース設計](#2-データベース設計)
3. [API仕様](#3-api仕様)
4. [フロントエンド詳細仕様](#4-フロントエンド詳細仕様)
5. [埋め込みスクリプト詳細仕様](#5-埋め込みスクリプト詳細仕様)
6. [判定エンジン詳細仕様](#6-判定エンジン詳細仕様)
7. [認証・セキュリティ](#7-認証セキュリティ)
8. [MVP実装の優先順位](#8-mvp実装の優先順位)

---

## 1. システムアーキテクチャ

### 1.1 全体構成図

```
┌─────────────────┐
│   User's Web    │
│      Site       │
│  ┌───────────┐  │
│  │ Embedded  │  │
│  │  Script   │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────┐
│       Backend API (Node.js)      │
│                                  │
│  - POST /api/evaluate            │
│  - POST /api/challenge/verify    │
│  - POST /api/appeal              │
└────────┬─────────┬──────────────┘
         │         │
         ▼         ▼
┌─────────────┐  ┌──────────────┐
│  Supabase   │  │  OpenAI API  │
│  - Auth     │  │  (LLM判定)    │
│  - Database │  │              │
└─────────────┘  └──────────────┘
```

### 1.2 技術スタック (MVP)

#### フロントエンド
- **フレームワーク**: Next.js 14+ (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **UIコンポーネント**: shadcn/ui
- **状態管理**: React Query (サーバー状態のみ)

#### バックエンド
- **ランタイム**: Node.js 20+
- **フレームワーク**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth

#### 埋め込みスクリプト
- **言語**: TypeScript → JavaScript
- **バンドラー**: Vite
- **サイズ目標**: < 50KB (gzipped)

#### インフラ
- **ホスティング**: Vercel
- **監視**: Vercel Analytics (最小限)

---

## 2. データベース設計

### 2.1 ER図 (MVP簡略版)

```
┌─────────────────┐       ┌─────────────────┐
│     users       │───┐   │    projects     │
│  (Supabase Auth)│   │   ├─────────────────┤
│                 │   └──<│ user_id (FK)    │
└─────────────────┘       │ id (PK)         │
                          │ name            │
                          │ api_key         │
                          └────────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
         ┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐
         │  form_configs   │ │ submissions  │ │     appeals     │
         │  (MVP: 簡略)     │ │              │ │   (MVP: 簡略)   │
         └─────────────────┘ └──────────────┘ └─────────────────┘
```

### 2.2 テーブル定義 (MVP)

#### users テーブル
```sql
-- Supabase Authを利用するため、カスタムテーブルは不要
-- auth.users テーブルを直接参照
```

#### projects テーブル
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_api_key ON projects(api_key);
```

#### form_configs テーブル (MVP: 1プロジェクト1設定のみ)
```sql
CREATE TABLE form_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  enable_url_detection BOOLEAN DEFAULT TRUE,
  threshold_sales DECIMAL(3,2) DEFAULT 0.70,
  threshold_spam DECIMAL(3,2) DEFAULT 0.85,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id) -- MVP: 1プロジェクト1設定
);

CREATE INDEX idx_form_configs_project_id ON form_configs(project_id);
```

#### submissions テーブル
```sql
CREATE TYPE submission_status AS ENUM ('allowed', 'challenged', 'held', 'blocked');

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status submission_status NOT NULL,
  score_sales DECIMAL(3,2),
  score_spam DECIMAL(3,2),
  final_decision VARCHAR(20) NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB,
  detection_reasons TEXT[],
  llm_reasoning TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_submissions_project_id ON submissions(project_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
```

#### appeals テーブル (MVP: 基本機能のみ)
```sql
CREATE TABLE appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  contact_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_appeals_submission_id ON appeals(submission_id);
```

---

## 3. API仕様

### 3.1 認証方式

1. **管理画面API**: Supabase Auth JWT (Bearer Token)
2. **埋め込みスクリプトAPI**: API Key (ヘッダーまたはクエリパラメータ)

### 3.2 コアAPI (MVP)

#### 3.2.1 評価API

**POST /api/v1/evaluate**

**リクエスト**:
```typescript
interface EvaluateRequest {
  api_key: string;
  form_data: {
    [field_name: string]: string;
  };
  metadata: {
    url: string;
    user_agent: string;
    timestamp: number;
  };
}
```

**レスポンス**:
```typescript
interface EvaluateResponse {
  success: boolean;
  submission_id: string;
  decision: 'allow' | 'challenge' | 'hold' | 'block';
  scores: {
    sales: number;
    spam: number;
  };
  reasons: string[];
  message: string;
  challenge?: {
    type: 'self_report';
    question: string;
  };
}
```

**例**:
```json
POST /api/v1/evaluate
{
  "api_key": "fb_xxxxxxxxxxxx",
  "form_data": {
    "name": "山田太郎",
    "email": "yamada@example.com",
    "message": "貴社の〇〇についてご提案があります"
  },
  "metadata": {
    "url": "https://example.com/contact",
    "user_agent": "Mozilla/5.0...",
    "timestamp": 1697123456789
  }
}
```

---

#### 3.2.2 チャレンジ検証API

**POST /api/v1/challenge/verify**

**リクエスト**:
```typescript
interface ChallengeVerifyRequest {
  api_key: string;
  submission_id: string;
  answer: 'not_sales' | 'is_sales';
}
```

**レスポンス**:
```typescript
interface ChallengeVerifyResponse {
  success: boolean;
  decision: 'allow' | 'block';
  message: string;
}
```

---

#### 3.2.3 異議申立てAPI

**POST /api/v1/appeal**

**リクエスト**:
```typescript
interface AppealRequest {
  submission_id: string;
  reason: string;
  contact_email: string;
}
```

**レスポンス**:
```typescript
interface AppealResponse {
  success: boolean;
  appeal_id: string;
  message: string;
}
```

---

### 3.3 管理画面API (MVP)

#### プロジェクト管理

**GET /api/v1/projects**
- ユーザーのプロジェクト一覧を取得

**POST /api/v1/projects**
- 新規プロジェクト作成
- レスポンスにAPI Keyを含める

**PUT /api/v1/projects/:id**
- プロジェクト情報更新

**DELETE /api/v1/projects/:id**
- プロジェクト削除

---

#### フォーム設定

**GET /api/v1/projects/:project_id/config**
- フォーム設定を取得

**PUT /api/v1/projects/:project_id/config**
- フォーム設定を更新
```typescript
interface UpdateConfigRequest {
  enable_url_detection: boolean;
  threshold_sales: number; // 0.0-1.0
  threshold_spam: number;  // 0.0-1.0
}
```

---

#### 送信履歴

**GET /api/v1/projects/:project_id/submissions**

クエリパラメータ:
- `status`: allowed | challenged | held | blocked
- `page`: number (default: 1)
- `limit`: number (default: 50)

**レスポンス**:
```typescript
interface SubmissionsResponse {
  submissions: Submission[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
```

**GET /api/v1/submissions/:id**
- 送信詳細を取得

---

#### 簡易統計 (MVP)

**GET /api/v1/projects/:project_id/stats**

**レスポンス**:
```typescript
interface StatsResponse {
  total: number;
  allowed: number;
  challenged: number;
  held: number;
  blocked: number;
  today: {
    total: number;
    blocked: number;
  };
}
```

---

## 4. フロントエンド詳細仕様

### 4.1 画面構成 (MVP)

```
/
├── /login                    # ログイン
├── /signup                   # サインアップ
├── /dashboard                # ダッシュボード (統計概要)
├── /projects
│   ├── /new                  # 新規プロジェクト作成
│   └── /:id
│       ├── /                 # プロジェクト詳細
│       ├── /embed            # 埋め込みコード
│       ├── /config           # フォーム設定
│       ├── /submissions      # 送信履歴
│       └── /submissions/:id  # 送信詳細
└── /appeals                  # 異議申立て一覧 (全プロジェクト)
```

### 4.2 主要画面の詳細

#### 4.2.1 ダッシュボード (`/dashboard`)

**表示内容**:
- プロジェクト一覧カード
- 各プロジェクトの今日の統計
  - 総送信数
  - ブロック数
  - ブロック率
- 最近のブロック (5件)

**UI要素**:
```typescript
interface DashboardView {
  projects: Array<{
    id: string;
    name: string;
    todayStats: {
      total: number;
      blocked: number;
      blockRate: number;
    };
  }>;
  recentBlocks: Array<{
    id: string;
    projectName: string;
    timestamp: Date;
    score: number;
  }>;
}
```

---

#### 4.2.2 埋め込みコード画面 (`/projects/:id/embed`)

**表示内容**:
- スニペットコード (コピー可能)
- セットアップ手順
- テスト用サンプルフォーム

**スニペットコード**:
```html
<script src="https://cdn.formblocker.com/v1/form-blocker.min.js"></script>
<script>
  FormBlocker.init({
    apiKey: 'fb_xxxxxxxxxxxx'
  });
</script>
```

---

#### 4.2.3 フォーム設定画面 (`/projects/:id/config`)

**設定項目**:

1. **URL検出**
   - 有効/無効 (トグル)

2. **判定閾値**
   - 営業スコア閾値: 0-100のスライダー (デフォルト: 70)
   - スパムスコア閾値: 0-100のスライダー (デフォルト: 85)

**UI**:
```typescript
interface ConfigFormData {
  enableUrlDetection: boolean;
  thresholdSales: number;    // 0-100
  thresholdSpam: number;     // 0-100
}
```

---

#### 4.2.4 送信履歴画面 (`/projects/:id/submissions`)

**表示項目**:
- フィルター
  - ステータス (all, allowed, challenged, held, blocked)
  - 日付範囲 (オプション)
- テーブル
  - 日時
  - ステータスバッジ
  - 営業スコア
  - スパムスコア
  - IPアドレス
  - 詳細ボタン

**テーブルカラム**:
```typescript
interface SubmissionListItem {
  id: string;
  created_at: Date;
  status: 'allowed' | 'challenged' | 'held' | 'blocked';
  score_sales: number;
  score_spam: number;
  ip_address: string;
}
```

---

#### 4.2.5 送信詳細画面 (`/projects/:id/submissions/:id`)

**表示内容**:

1. **基本情報**
   - 日時
   - ステータス
   - 営業スコア / スパムスコア
   - IPアドレス
   - User-Agent

2. **フォーム内容**
   - 各フィールドの値を表示

3. **判定詳細**
   - 検出理由リスト
   - LLM判定理由 (あれば)

4. **アクション**
   - 異議申立てフォームへのリンク (blocked の場合)

---

### 4.3 コンポーネント設計 (MVP)

```typescript
// components/ui/ (shadcn/ui)
- Button
- Input
- Card
- Table
- Badge
- Switch
- Slider
- Tabs

// components/domain/
- ProjectCard
  - props: { project: Project; stats: Stats }

- SubmissionTable
  - props: { submissions: Submission[]; onRowClick: (id) => void }

- StatusBadge
  - props: { status: SubmissionStatus }

- ScoreDisplay
  - props: { label: string; score: number; threshold: number }

- CodeSnippet
  - props: { code: string; language: string }
  - features: シンタックスハイライト、コピーボタン

- FilterBar
  - props: { onFilterChange: (filters) => void }
```

---

## 5. 埋め込みスクリプト詳細仕様

### 5.1 ファイル構成 (MVP)

```
sdk/
├── src/
│   ├── index.ts           # エントリーポイント
│   ├── FormDetector.ts    # フォーム検出
│   ├── ApiClient.ts       # API通信
│   ├── ModalUI.ts         # モーダルUI
│   └── types.ts           # 型定義
├── dist/
│   └── form-blocker.min.js
└── vite.config.ts
```

### 5.2 初期化

```typescript
// ユーザーサイトへの埋め込み
<script src="https://cdn.formblocker.com/v1/form-blocker.min.js"></script>
<script>
  FormBlocker.init({
    apiKey: 'fb_xxxxxxxxxxxx',
    debug: false  // オプション
  });
</script>
```

### 5.3 コア実装

#### 5.3.1 FormDetector

```typescript
class FormDetector {
  private forms: HTMLFormElement[] = [];

  detectAndAttach(): void {
    // すべてのformを検出
    this.forms = Array.from(document.querySelectorAll('form'));

    this.forms.forEach(form => {
      // data-fb-ignore 属性があればスキップ
      if (form.hasAttribute('data-fb-ignore')) return;

      // submitイベントをインターセプト
      form.addEventListener('submit', this.handleSubmit.bind(this), true);
    });
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const form = event.target as HTMLFormElement;
    const formData = this.extractFormData(form);

    // 評価APIを呼び出し
    const result = await this.apiClient.evaluate(formData);

    // 結果に応じて処理
    await this.handleResult(result, form);
  }

  private extractFormData(form: HTMLFormElement): Record<string, string> {
    const data: Record<string, string> = {};
    const formDataObj = new FormData(form);

    for (const [key, value] of formDataObj.entries()) {
      if (typeof value === 'string') {
        data[key] = value;
      }
    }

    return data;
  }
}
```

#### 5.3.2 ApiClient

```typescript
class ApiClient {
  private baseUrl = 'https://api.formblocker.com';

  async evaluate(formData: Record<string, string>): Promise<EvaluateResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          form_data: formData,
          metadata: {
            url: window.location.href,
            user_agent: navigator.userAgent,
            timestamp: Date.now(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('FormBlocker: API request failed', error);
      // フォールバック: エラー時は送信を許可
      return {
        success: true,
        submission_id: 'fallback',
        decision: 'allow',
        scores: { sales: 0, spam: 0 },
        reasons: [],
        message: '',
      };
    }
  }

  async verifyChallenge(
    submissionId: string,
    answer: string
  ): Promise<ChallengeVerifyResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/challenge/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        submission_id: submissionId,
        answer,
      }),
    });

    return await response.json();
  }
}
```

#### 5.3.3 結果ハンドリング

```typescript
class FormBlocker {
  private async handleResult(
    result: EvaluateResponse,
    form: HTMLFormElement
  ): Promise<void> {
    switch (result.decision) {
      case 'allow':
        this.allowSubmission(form);
        break;

      case 'challenge':
        const challengeResult = await this.showChallenge(result);
        if (challengeResult) {
          this.allowSubmission(form);
        } else {
          this.showBlockMessage(result);
        }
        break;

      case 'hold':
        this.showHoldMessage(result);
        break;

      case 'block':
        this.showBlockMessage(result);
        break;
    }
  }

  private allowSubmission(form: HTMLFormElement): void {
    // スクリプトを一時的にバイパスしてネイティブ送信
    form.setAttribute('data-fb-bypass', 'true');
    form.removeEventListener('submit', this.handleSubmit);
    form.submit();
  }

  private async showChallenge(result: EvaluateResponse): Promise<boolean> {
    const modal = new ChallengeModal(result, this.apiClient);
    return await modal.show();
  }

  private showBlockMessage(result: EvaluateResponse): void {
    const modal = new MessageModal({
      title: '送信がブロックされました',
      message: result.message || '営業目的の送信と判定されました。',
      type: 'error',
      showAppealLink: true,
      submissionId: result.submission_id,
    });
    modal.show();
  }

  private showHoldMessage(result: EvaluateResponse): void {
    const modal = new MessageModal({
      title: '送信を保留しています',
      message: '内容を確認中です。後ほど対応いたします。',
      type: 'warning',
    });
    modal.show();
  }
}
```

#### 5.3.4 チャレンジモーダル (MVP)

```typescript
class ChallengeModal {
  async show(): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fb-modal-overlay';
      overlay.innerHTML = `
        <div class="fb-modal">
          <h2>確認が必要です</h2>
          <p>この送信は営業目的ですか?</p>
          <div class="fb-form">
            <label>
              <input type="radio" name="self-report" value="not_sales" checked>
              いいえ、営業目的ではありません
            </label>
            <label>
              <input type="radio" name="self-report" value="is_sales">
              はい、営業目的です
            </label>
          </div>
          <div class="fb-actions">
            <button id="fb-submit" class="fb-btn-primary">送信</button>
            <button id="fb-cancel" class="fb-btn-secondary">キャンセル</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      document.getElementById('fb-submit')?.addEventListener('click', async () => {
        const answer = document.querySelector<HTMLInputElement>(
          'input[name="self-report"]:checked'
        )?.value || 'not_sales';

        const result = await this.apiClient.verifyChallenge(
          this.result.submission_id,
          answer
        );

        document.body.removeChild(overlay);
        resolve(result.decision === 'allow');
      });

      document.getElementById('fb-cancel')?.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(false);
      });
    });
  }
}
```

### 5.4 スタイル (埋め込み)

```css
/* SDK内にインラインで含める */
.fb-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
}

.fb-modal {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.fb-modal h2 {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
}

.fb-form label {
  display: block;
  margin: 12px 0;
  cursor: pointer;
}

.fb-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.fb-btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  flex: 1;
}

.fb-btn-secondary {
  background: #e5e7eb;
  color: #374151;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  flex: 1;
}
```

---

## 6. 判定エンジン詳細仕様

### 6.1 判定フロー (MVP)

```
┌─────────────────────────────┐
│   1. ルールベース事前判定      │
│   - URL検出                  │
│   - 営業キーワード検出         │
│   - 文字数チェック            │
└──────────┬──────────────────┘
           │
     ┌─────┴─────┐
     │           │
  スコア < 0.5  スコア >= 0.5
     │           │
     ▼           ▼
  ┌──────┐  ┌─────────────┐
  │Allow │  │  2. LLM判定  │
  └──────┘  │  - 精密分析   │
            └──────┬────────┘
                   │
         ┌─────────┼─────────┐
         │         │         │
    Sales<0.7  0.7≤S<0.85  S≥0.85
         │         │         │
         ▼         ▼         ▼
     ┌──────┐ ┌─────────┐ ┌──────┐
     │Allow │ │Challenge│ │Block │
     └──────┘ └─────────┘ └──────┘
```

### 6.2 ルールベース判定

```typescript
interface RuleBasedResult {
  score: number;
  reasons: string[];
  shouldUseLLM: boolean;
}

class RuleBasedFilter {
  evaluate(formData: Record<string, string>): RuleBasedResult {
    const reasons: string[] = [];
    let score = 0;

    const text = Object.values(formData).join(' ');

    // 1. URL検出
    const urlScore = this.detectUrls(text);
    if (urlScore > 0) {
      score += urlScore * 0.4;
      reasons.push('URL検出');
    }

    // 2. 営業キーワード
    const keywordScore = this.detectSalesKeywords(text);
    if (keywordScore > 0) {
      score += keywordScore * 0.4;
      reasons.push('営業キーワード検出');
    }

    // 3. 文字数チェック (長すぎる = 営業文の可能性)
    if (text.length > 500) {
      score += 0.2;
      reasons.push('長文');
    }

    return {
      score: Math.min(score, 1.0),
      reasons,
      shouldUseLLM: score >= 0.5,
    };
  }

  private detectUrls(text: string): number {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);

    if (!urls) return 0;

    const ratio = urls.join('').length / text.length;

    if (ratio > 0.3) return 1.0;
    if (ratio > 0.2) return 0.8;
    if (ratio > 0.1) return 0.5;
    return 0.2;
  }

  private detectSalesKeywords(text: string): number {
    const keywords = [
      '営業', 'セールス', '販売促進', '広告', 'PR',
      '提案', '紹介', 'サービス案内', '御社', '貴社',
      '無料', '特別オファー', '限定', '今すぐ'
    ];

    let matchCount = 0;
    const lowerText = text.toLowerCase();

    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        matchCount++;
      }
    }

    if (matchCount >= 5) return 1.0;
    if (matchCount >= 3) return 0.7;
    if (matchCount >= 1) return 0.4;
    return 0;
  }
}
```

### 6.3 LLM判定

```typescript
class LLMJudge {
  async evaluate(formData: Record<string, string>): Promise<LLMResult> {
    const prompt = this.buildPrompt(formData);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',  // MVP: コスト効率重視
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    const judgment = JSON.parse(content) as LLMJudgment;

    return {
      score_sales: judgment.sales_score,
      score_spam: judgment.spam_score,
      reasoning: judgment.reasoning,
    };
  }

  private getSystemPrompt(): string {
    return `
あなたはWebフォーム送信の判定を行うAIです。
以下の基準で判定してください:

1. 営業目的 (sales_score: 0.0-1.0)
   - 商品・サービスの売り込み
   - 営業提案
   - 自社サービスへの誘導

2. スパム (spam_score: 0.0-1.0)
   - 無意味な内容
   - 悪意のある内容

正当な問い合わせの特徴:
- 具体的な質問や相談
- 個人的な文脈
- 自然な日本語

JSON形式で回答:
{
  "sales_score": 0.0-1.0,
  "spam_score": 0.0-1.0,
  "reasoning": "判定理由"
}
`.trim();
  }

  private buildPrompt(formData: Record<string, string>): string {
    return Object.entries(formData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }
}
```

### 6.4 最終判定

```typescript
class JudgmentEngine {
  async evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    // 1. プロジェクト設定取得
    const config = await this.getConfig(request.api_key);

    // 2. ルールベース判定
    const ruleResult = this.ruleFilter.evaluate(request.form_data);

    let finalScores = {
      sales: ruleResult.score,
      spam: 0,
    };
    let reasoning = ruleResult.reasons.join(', ');

    // 3. LLM判定 (必要な場合のみ)
    if (ruleResult.shouldUseLLM) {
      const llmResult = await this.llmJudge.evaluate(request.form_data);
      finalScores = {
        sales: llmResult.score_sales,
        spam: llmResult.score_spam,
      };
      reasoning = llmResult.reasoning;
    }

    // 4. 最終決定
    const decision = this.makeDecision(finalScores, config);

    // 5. DB保存
    const submission = await this.saveSubmission({
      project_id: config.project_id,
      status: decision,
      score_sales: finalScores.sales,
      score_spam: finalScores.spam,
      final_decision: decision,
      content: request.form_data,
      metadata: request.metadata,
      detection_reasons: ruleResult.reasons,
      llm_reasoning: reasoning,
      ip_address: request.metadata.ip_address,
    });

    return {
      success: true,
      submission_id: submission.id,
      decision,
      scores: finalScores,
      reasons: ruleResult.reasons,
      message: this.getMessage(decision),
      challenge: decision === 'challenge' ? {
        type: 'self_report',
        question: 'この送信は営業目的ですか?',
      } : undefined,
    };
  }

  private makeDecision(
    scores: { sales: number; spam: number },
    config: FormConfig
  ): Decision {
    const { sales, spam } = scores;
    const { threshold_sales, threshold_spam } = config;

    // ブロック
    if (sales >= threshold_spam || spam >= threshold_spam) {
      return 'block';
    }

    // チャレンジ
    if (sales >= threshold_sales) {
      return 'challenge';
    }

    // 保留 (スパムスコアが中程度)
    if (spam >= 0.6) {
      return 'hold';
    }

    return 'allow';
  }

  private getMessage(decision: Decision): string {
    const messages = {
      allow: '',
      challenge: '確認のため、いくつか質問にお答えください。',
      hold: '送信内容を確認しています。後ほど対応いたします。',
      block: '申し訳ございませんが、この送信は営業目的と判定されました。',
    };
    return messages[decision];
  }
}
```

---

## 7. 認証・セキュリティ

### 7.1 認証実装

#### Supabase Auth統合

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// lib/auth.ts
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}
```

#### API認証ミドルウェア

```typescript
// middleware/auth.ts
export async function authenticateUser(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.substring(7);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error('Unauthorized');
  }

  return data.user.id;
}

export async function authenticateApiKey(apiKey: string): Promise<string> {
  const { data: project } = await supabase
    .from('projects')
    .select('id, project_id')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .single();

  if (!project) {
    throw new Error('Invalid API key');
  }

  return project.project_id;
}
```

### 7.2 Row Level Security (RLS)

```sql
-- projects: ユーザーは自分のプロジェクトのみ
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- submissions: プロジェクトオーナーのみ
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = submissions.project_id
        AND projects.user_id = auth.uid()
    )
  );
```

### 7.3 セキュリティ対策 (MVP)

#### 入力検証

```typescript
// lib/validation.ts
import { z } from 'zod';

export const EvaluateRequestSchema = z.object({
  api_key: z.string().min(10),
  form_data: z.record(z.string()),
  metadata: z.object({
    url: z.string().url(),
    user_agent: z.string(),
    timestamp: z.number(),
  }),
});
```

#### レート制限 (簡易版)

```typescript
// MVP: メモリベースの簡易レート制限
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(apiKey: string, limit = 100): boolean {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  const timestamps = rateLimitMap.get(apiKey) || [];
  const recentTimestamps = timestamps.filter(t => now - t < hour);

  if (recentTimestamps.length >= limit) {
    return false;
  }

  recentTimestamps.push(now);
  rateLimitMap.set(apiKey, recentTimestamps);

  return true;
}
```

---

## 8. MVP実装の優先順位

### フェーズ1: コア機能 (Week 1-2)

**必須機能**:
1. ✅ データベースセットアップ (Supabase)
2. ✅ 認証機能 (ログイン/サインアップ)
3. ✅ プロジェクト作成・管理
4. ✅ API Key生成
5. ✅ 評価API (`POST /evaluate`)
6. ✅ ルールベース判定
7. ✅ LLM判定 (OpenAI)
8. ✅ 埋め込みスクリプト (基本版)

**成果物**:
- 動作する判定エンジン
- 埋め込み可能なスクリプト
- 基本的な管理画面

---

### フェーズ2: UI/UX (Week 3)

**必須機能**:
1. ✅ ダッシュボード (統計表示)
2. ✅ 埋め込みコード画面
3. ✅ フォーム設定画面
4. ✅ 送信履歴一覧
5. ✅ 送信詳細画面

**成果物**:
- 使いやすい管理画面
- 埋め込み手順の明示

---

### フェーズ3: 拡張機能 (Week 4)

**追加機能**:
1. ✅ チャレンジ機能
2. ✅ 異議申立て機能
3. ✅ フィルタリング機能
4. ✅ エラーハンドリング強化

**成果物**:
- 完全なMVP

---

### MVP後の拡張機能 (優先度順)

#### 高優先度 (v1.1)
- [ ] メール通知
- [ ] Webhook通知
- [ ] 詳細な分析ダッシュボード
- [ ] エクスポート機能 (CSV)

#### 中優先度 (v1.2)
- [ ] 行動分析 (ペースト検出、タイピング速度)
- [ ] IPレピュテーション
- [ ] カスタムルール設定
- [ ] ホワイトリスト/ブラックリスト

#### 低優先度 (v2.0)
- [ ] チーム機能
- [ ] 複数フォーム対応
- [ ] A/Bテスト
- [ ] 高度な分析

---

## 技術的な制約・前提

### MVP版の制約

1. **スケール**: 100プロジェクト、10K送信/日まで
2. **LLM**: OpenAI API使用 (コスト管理必要)
3. **通知**: MVP版では通知機能なし (後日追加)
4. **分析**: 基本的な統計のみ
5. **データ保持**: 制限なし (後日ポリシー策定)

### 必要な環境変数

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_CDN_URL=
```

---

## 付録

### A. API Key形式

```
fb_[16文字のランダム英数字]

例: fb_a1b2c3d4e5f6g7h8
```

### B. エラーコード

| コード | 説明 |
|--------|------|
| `INVALID_API_KEY` | API Keyが無効 |
| `RATE_LIMIT_EXCEEDED` | レート制限超過 |
| `VALIDATION_ERROR` | リクエストの検証エラー |
| `INTERNAL_ERROR` | サーバーエラー |

---

## 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-10-13 | MVP版初版作成 |

---

**このドキュメントはMVP開発用の簡略版です**
