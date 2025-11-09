# Test Site

`test-site/` は FormBlocker の埋め込みスクリプトをブラウザだけで試すためのシンプルな静的ページです。Next.js アプリや外部 API を立てなくても挙動を確認できるよう、`mock-api.js` が `/api/v1/evaluate` への `fetch` をフロントエンド側でモックしています。

## 使い方

1. 依存関係とビルド成果物を用意します。

   ```bash
   npm install
   npm run build:embed
   ```

2. リポジトリ直下で静的サーバーを立ち上げます。

   ```bash
   npm run dev:test-site
   ```

3. ブラウザで <http://localhost:4173/test-site/> を開きます。初期状態は「モック判定」モードなので、そのまま送信すればローカルのダミー判定結果（Allow / Challenge / Block）とモーダル UI を確認できます。

## 判定ロジック（モック）

- テキストに `http` や `https` を含む場合は Block。
- `営業` / `セールス` / `商談` のいずれかを含む場合は Block。
- `チャレンジ` を含む場合は Challenge。
- それ以外は Allow。

## 実API（Supabase）へ接続する

1. Supabase プロジェクトを準備し、`NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY` などの環境変数を `.env.local` に設定します。詳しくは `supabase/README.md` を参照してください。
2. Supabase Auth で任意のユーザーを作成し、その `id` を控えます（Dashboard > Authentication > Add user）。
3. SQL Editor でフォームと API Key を作成します。

   ```sql
   insert into public.forms (user_id, name, site_url, api_key)
   values ('<AUTH_USER_ID>', 'Demo Form', 'https://example.com', generate_api_key())
   returning api_key;
   ```

   返った `api_key`（`fb_live_...`）を控えます。`form_configs` はトリガーで自動作成されます。

4. Next.js の API サーバーを起動します。

   ```bash
   npm run dev
   ```

5. ブラウザで <http://localhost:4173/test-site/> を開き、ページ上部の「接続設定」で以下を設定して「設定を適用」をクリックします。
   - 判定モード: **実API / Supabase**
   - API Base URL: `http://localhost:3000`（`npm run dev` の URL）
   - API Key: 上記で作成した `fb_live_...`
   - Preview Mode: **オフ**（送信結果を supabase に書き込みたい場合）

   送信すると Next.js の `/api/v1/evaluate` が実行され、`submissions` テーブルにレコードが追加されます。Supabase Dashboard の Table editor で確認できます。

> 💡 実APIモードでもテスト用プリセットボタンを使えるため、Sales/Challenge などの判定を容易に再現して supabase へ保存できます。
