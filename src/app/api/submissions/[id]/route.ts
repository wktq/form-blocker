import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/submissions/[id] - 送信詳細取得
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

    const { data: submission, error } = await supabase
      .from('submissions')
      .select(`
        *,
        forms!inner (
          id,
          name,
          site_url,
          user_id
        )
      `)
      .eq('id', params.id)
      .eq('forms.user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching submission:', error);
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/submissions/[id] - 送信ステータス更新
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

    const body = await request.json();
    const { status, admin_notes } = body;

    // 送信の所有者確認
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select(`
        id,
        forms!inner (user_id)
      `)
      .eq('id', params.id)
      .eq('forms.user_id', user.id)
      .single();

    if (!existingSubmission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // ステータス更新
    const updateData: any = {};
    if (status) {
      updateData.status = status;
      updateData.final_decision = status;
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        forms (
          id,
          name,
          site_url
        )
      `)
      .single();

    if (error) {
      console.error('Error updating submission:', error);
      return NextResponse.json(
        { error: 'Failed to update submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
