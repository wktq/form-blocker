import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/submissions - 送信データ一覧取得
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

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('form_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // ベースクエリ
    let query = supabase
      .from('submissions')
      .select(`
        *,
        forms!inner (
          id,
          name,
          user_id
        )
      `, { count: 'exact' })
      .eq('forms.user_id', user.id);

    // フィルター適用
    if (formId) {
      query = query.eq('form_id', formId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // ページネーション
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: submissions, error, count } = await query;

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      submissions,
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
