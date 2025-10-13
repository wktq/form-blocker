import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/forms - フォーム一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // フォーム一覧取得（設定も含む）
    const { data: forms, error } = await supabase
      .from('forms')
      .select(`
        *,
        form_configs (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching forms:', error);
      return NextResponse.json(
        { error: 'Failed to fetch forms' },
        { status: 500 }
      );
    }

    return NextResponse.json({ forms });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/forms - フォーム作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, site_url } = body;

    // バリデーション
    if (!name || !site_url) {
      return NextResponse.json(
        { error: 'Name and site_url are required' },
        { status: 400 }
      );
    }

    // API Key生成
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .rpc('generate_api_key');

    if (apiKeyError) {
      console.error('Error generating API key:', apiKeyError);
      return NextResponse.json(
        { error: 'Failed to generate API key' },
        { status: 500 }
      );
    }

    // フォーム作成
    const { data: form, error: formError } = await supabase
      .from('forms')
      .insert({
        user_id: user.id,
        name,
        site_url,
        api_key: apiKeyData,
        is_active: true,
      })
      .select(`
        *,
        form_configs (*)
      `)
      .single();

    if (formError) {
      console.error('Error creating form:', formError);
      return NextResponse.json(
        { error: 'Failed to create form' },
        { status: 500 }
      );
    }

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
