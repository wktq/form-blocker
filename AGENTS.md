# AGENTS - Form Blocker (Codex向け仕様サマリ)

このドキュメントは、Form Blocker の現状仕様をコーディングエージェント向けに凝縮したものです。詳細は `README.md`・`detailed-specification.md`・`requirements.md`・`CLAUDE.md` を参照してください。

---

## 1. ミッションと対象範囲
- 企業サイトの問い合わせフォームに届く営業／スパム送信を自動検出し、`allow / challenge / hold / block` の意思決定を返す。
- 埋め込みスクリプトでフォーム送信をフックし、Next.js ダッシュボードから統計・設定・履歴を閲覧／調整できる。
- MVPは「フォーム単位」の管理を前提に、**ルールベース + LLM** の2段階判定をリアルタイムで提供する。

## 2. 現状ステータス（2025-10）
- Next.js App Router + Tailwind + Zustand で UI モックを実装済み。データは `src/lib/mock-data.ts` のモックに依存。
- Supabase（DB/Auth）、LLM推論（README: Gemini Flash Lite / 詳細仕様: OpenAI API）はまだ接続前。バックエンド I/O は仮想。
- 埋め込みスクリプトは `embed-script`（Vite）で実装途上。`public/embed/form-blocker.min.js` はモック版。
- 主要画面：ダッシュボード、フォーム切り替え、送信履歴、フォーム設定、通知設定、埋め込み手順ビュー。

## 3. システム構成
```
ユーザーサイト ─(埋め込みJS)─> Next.js API ─┬─ Supabase (Postgres/Auth)
                                            └─ LLM API (営業/スパム判定)
```
- **フロントエンド**: Next.js 14 (App Router), React 18, TypeScript, Tailwind, Zustand, Recharts, shadcn/ui (方針)。
- **バックエンド**: Next.js API Routes。`/api/v1` 配下に評価・チャレンジ・異議申立て等を配置予定。
- **データ層**: Supabase (PostgreSQL + Auth)。フォーム、送信、設定、通知、異議申立てを保持。
- **LLM**: ルール判定後に高精度判定。README は Gemini、詳細仕様は OpenAI を想定しているため、実装時に選定要。
- **埋め込み**: TypeScript → Vite ビルド。gzipped 50KB 未満を目標に、フォーム検出・挙動監視を担当。

## 4. ドメインモデル（`src/types/index.ts`）
- `Form`: フォーム名・設置URL・`api_key`・`is_active` 等。サイドバーからの切替対象。
- `FormConfig`: URL/ペースト検出 ON/OFF、営業/スパム閾値 (0-1)、追加禁止ワード、許可/拒否ドメインなど。
- `Submission`: `status`（allowed/challenged/held/blocked）、`score_sales`、`score_spam`、送信本文、メタデータ、検出理由、LLM理由。
- `SubmissionMetadata`: URL / UA / IP / timestamp / `form_selector`。
- `BehavioralData`: ペースト検出、怪しい貼り付け、平均タイピング速度、送信までの時間。
- `Notification`: type(email|webhook|dashboard)、条件（スコア/ステータス）、config（メール/URL/シークレット）。
- `Appeal`: 送信ID・理由・連絡先・`pending/approved/rejected`・管理者ノート。
- `EvaluateRequest/Response`: API I/O 型定義。`challenge` 情報（self_report/captcha 等）を含む。

## 5. 判定フロー（MVP）
1. **ブラウザ監視**: 埋め込みJSが `<form>` を自動検出し、入力イベントで禁止ワード・URL貼り付け・ペースト挙動を収集。
2. **送信インターセプト**: `FormBlocker.init` で登録された `apiKey` を使い、`POST /api/v1/evaluate` に `form_data + metadata + behavioral_data` を送信。
3. **ルールベース判定**（モック実装）:
   - 営業スコア: URL含有 +0.3、営業系キーワード検出数×0.2、ペースト検出 +0.2。
   - スパムスコア: 「今すぐ」「限定」等 ×0.3、高速送信（<5秒）+0.3。
4. **閾値による決定**: `>=0.85 block`, `>=0.7 challenge`, `>=0.5 hold`, `<0.5 allow`。
5. **LLM判定**: 危険度が高い場合のみLLMで理由付き最終判定（まだモック）。`decision` と `reasons`、必要に応じて `challenge.question` を返却。
6. **チャレンジ/異議申立て**: 追加自己申告 (`/challenge/verify`) や異議 (`/appeal`) を受け付け、結果を再反映。

## 6. APIサーフェス（設計）
- `POST /api/v1/evaluate`
  - **Request**: `api_key`, `form_data`, `metadata{url,user_agent,timestamp,...}`, `behavioral_data{paste_detected,time_to_submit,...}`。
  - **Response**: `decision`, `scores{sales,spam}`, `reasons[]`, `message`, optional `challenge`.
- `POST /api/v1/challenge/verify`: チャレンジ回答の再判定。
- `POST /api/v1/appeal`: ブロック決定への異議申立て。
- `GET /api/v1/submissions`: フィルタ付き送信履歴取得。
- `POST /api/v1/forms` / `PUT /api/v1/forms/:id`: フォーム作成・更新。`api_key` 生成。
- **エラーコード**（詳細仕様付録）: `INVALID_API_KEY`, `RATE_LIMIT_EXCEEDED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`。

## 7. ダッシュボード機能（App Router配下）
- `/dashboard`: KPI（総送信・ブロック割合・チャレンジ件数）、7日推移、最近ブロック一覧。
- `/projects` → 現仕様ではフォーム一覧: `api_key` 表示、切替ドロップダウン、埋め込みコード遷移。
- `/projects/:id/embed`: スニペット表示＆コピー、設置手順、テストフォーム、カスタムオプション例。
- `/submissions`: ステータス/日時フィルタ、スコア・理由の一覧、チャレンジ/異議の状態表示。
- `/submissions/:id`: メタ情報、AI理由、本文、手動アクション（承認/ブロック）。
- `/settings`: URL検出や閾値スライダー、禁止キーワード、許可/ブロックドメイン、通知設定。
- `/notifications`（要件定義）: 通知条件（スコアしきい値・ステータス）と配送手段（メール/Webhook/ダッシュボード）。  
※全画面は `currentForm` に紐付いてデータを絞り込む設計。未選択時は選択を促す UI を用意。

## 8. 埋め込みスクリプト
- ビルド: `vite build --config embed-script/vite.config.ts`。公開物は `public/embed/form-blocker.min.js`。
- 利用手順（README記載）:
  ```html
  <script src="https://cdn.formblocker.com/form-blocker.min.js" data-api-key="fb_live_xxx"></script>
  <script>
    FormBlocker.init({
      apiKey: 'fb_live_xxx',
      selector: 'form.contact-form',
      debug: true,
      onBlock(result) { console.log(result); },
      onAllow(result) { console.log(result); },
      onChallenge(result) { return showCustomChallenge(result); }
    });
  </script>
  ```
- 主要責務: フォーム自動検出、入力監視、送信インターセプト、API連携、チャレンジ UI 呼び出し、カスタムフック (`onBlock/onAllow/onChallenge`)。
- サイズ目標 < 50KB (gzipped)。行動データ（ペースト検出/入力速度等）も付帯送信する。

## 9. 開発環境とガイド
- **セットアップ**: `npm install` → `.env.local` 作成（`GEMINI_API_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CDN_URL`, Supabase鍵等）→ `npm run dev`。
- **スクリプト**: `npm run dev`, `npm run build`, `npm run lint`, `npm run type-check`, `npm run build:embed`, `npm run dev:test-site` (テストフォーム用静的サーバ)。
- **コーディング規約**:
  - TypeScript必須。`any`は最小限。型は `src/types` に集約。
  - React関数コンポーネントのみ、`'use client'` を適切に。
  - 状態は `src/lib/store.ts` の Zustand（AuthStore / FormStore）を利用。
  - スタイリングは Tailwind。複雑なロジックのみコメントを添える。
  - すべてのデータ参照は `currentForm` を基準にフィルタ。
- **セキュリティ前提**: API KeyはSupabaseで生成し、TLSで送受信。保存時はAES暗号化を検討。CORS・レート制限・XSS対策を念頭に置く。

## 10. 既知の課題 / バックログ
1. Supabase統合（DB・Auth）と実データ保存。
2. LLM統合（Gemini Flash Lite or OpenAI）とプロンプト設計、フェイルオーバー。
3. 埋め込みスクリプトの本実装（フォーム検出、チャレンジUI、行動データ収集）。
4. 通知（メール/Webhook）、Webhook署名検証、ダッシュボード内通知。
5. Webhook/メールのエラーハンドリングと再送制御。
6. 分析ダッシュボード拡張、エクスポート（CSV/JSON）、IPブラックリスト、レート制限。
7. 異議申立てUI・管理者ワークフロー。
8. 行動分析（ペースト判定強化、タイピング速度学習）、IPレピュテーション、カスタムルール。

## 11. 参考ドキュメント
- `README.md`: 製品概要、画面説明、API例、導入手順。
- `requirements.md`: 管理画面・埋め込みスクリプトの要件、セキュリティ方針。
- `detailed-specification.md`: アーキテクチャ／DB設計／API詳細／ロードマップ。
- `CLAUDE.md`: フォーム中心アーキテクチャ、データモデル、状態管理、開発メモ。
- `src/lib/mock-data.ts`: UIモックで使用中のデータ。

この AGENTS.md を出発点に、追加の技術検討やタスクが発生した際は上記ドキュメントと実装をクロスリファレンスしてください。
