# Supabase Database Setup

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名、データベースパスワード、リージョンを設定

### 2. 環境変数の設定

プロジェクト作成後、以下の情報を取得して`.env.local`ファイルを作成:

```bash
# プロジェクト設定 > API から取得
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# プロジェクト設定 > API > service_role key から取得（注意: 秘密鍵）
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini API Key
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# アプリケーションURL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. データベーススキーマの適用

Supabase Dashboardで:

1. SQL Editorに移動
2. `migrations/001_initial_schema.sql`の内容をコピー&ペースト
3. 実行（Run）

### 4. 認証設定

**Email認証を有効化:**

1. Authentication > Providers > Email
2. "Enable Email provider" を有効化
3. "Confirm email" を必要に応じて設定

**リダイレクトURLの設定:**

1. Authentication > URL Configuration
2. Site URL: `http://localhost:3000`
3. Redirect URLs に以下を追加:
   - `http://localhost:3000/auth/callback`
   - 本番環境のURL

### 5. ストレージ設定（オプション）

将来的にファイルアップロードが必要な場合:

1. Storage > Create bucket
2. バケット名: `form-attachments`
3. Public access: 設定に応じて

## データベース構造

### テーブル一覧

- `users` - ユーザー情報（auth.usersと連携）
- `forms` - フォーム管理
- `form_configs` - フォーム設定
- `submissions` - 送信データ
- `notifications` - 通知設定
- `appeals` - 異議申し立て

### セキュリティ

- Row Level Security (RLS) が全テーブルで有効
- ユーザーは自分のデータのみアクセス可能
- API経由での送信は service_role key を使用

## トラブルシューティング

### マイグレーションが失敗する場合

1. SQL Editorでエラーメッセージを確認
2. 既存のテーブルがある場合は削除してから再実行
3. PostgreSQL拡張機能が有効か確認

### RLSポリシーエラー

- Service role keyを使用している場合、RLSはバイパスされる
- クライアント側（anon key）でエラーが出る場合、ポリシーを確認

### 接続エラー

- 環境変数が正しく設定されているか確認
- `.env.local`ファイルが存在し、正しい場所にあるか確認
- Next.jsを再起動（環境変数の変更後）

## 次のステップ

スキーマ作成後:

1. 認証機能の実装
2. API endpoints の作成
3. フロントエンドとの統合
