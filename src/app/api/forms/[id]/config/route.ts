import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/forms/[id]/config - フォーム設定取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // フォームの所有者確認
    const { data: form } = await supabase
      .from('forms')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // 設定取得
    const { data: config, error } = await supabase
      .from('form_configs')
      .select('*')
      .eq('form_id', params.id)
      .single();

    if (error) {
      console.error('Error fetching config:', error);
      return NextResponse.json(
        { error: 'Failed to fetch config' },
        { status: 500 }
      );
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/forms/[id]/config - フォーム設定更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // フォームの所有者確認
    const { data: form } = await supabase
      .from('forms')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      enable_url_detection,
      enable_paste_detection,
      threshold_sales,
      threshold_spam,
      banned_keywords,
      allowed_domains,
    } = body;

    // 設定更新
    const { data: config, error } = await supabase
      .from('form_configs')
      .update({
        ...(enable_url_detection !== undefined && { enable_url_detection }),
        ...(enable_paste_detection !== undefined && { enable_paste_detection }),
        ...(threshold_sales !== undefined && { threshold_sales }),
        ...(threshold_spam !== undefined && { threshold_spam }),
        ...(banned_keywords && { banned_keywords }),
        ...(allowed_domains && { allowed_domains }),
      })
      .eq('form_id', params.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating config:', error);
      return NextResponse.json(
        { error: 'Failed to update config' },
        { status: 500 }
      );
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
