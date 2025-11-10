import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/analytics - ダッシュボード統計データ取得
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
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d

    // 期間の計算
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
    }

    // ベースクエリ
    let query = supabase
      .from('submissions')
      .select(`
        id,
        status,
        score_sales,
        score_spam,
        created_at,
        forms!inner (
          id,
          name,
          user_id
        )
      `)
      .eq('forms.user_id', user.id)
      .gte('created_at', startDate.toISOString());

    // フォームフィルター
    if (formId) {
      query = query.eq('form_id', formId);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Error fetching analytics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }

    // 統計計算
    const totalSubmissions = submissions?.length || 0;
    const allowed = submissions?.filter((s) => s.status === 'allowed').length || 0;
    const challenged = submissions?.filter((s) => s.status === 'challenged').length || 0;
    const held = submissions?.filter((s) => s.status === 'held').length || 0;
    const blocked = submissions?.filter((s) => s.status === 'blocked').length || 0;

    const avgScoreSales =
      totalSubmissions > 0
        ? submissions!.reduce((sum, s) => sum + s.score_sales, 0) / totalSubmissions
        : 0;

    const avgScoreSpam =
      totalSubmissions > 0
        ? submissions!.reduce((sum, s) => sum + s.score_spam, 0) / totalSubmissions
        : 0;

    // 時系列データの作成（日別）
    const dailyData: Record<string, { date: string; allowed: number; challenged: number; held: number; blocked: number }> = {};

    submissions?.forEach((submission) => {
      const date = new Date(submission.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, allowed: 0, challenged: 0, held: 0, blocked: 0 };
      }
      dailyData[date][submission.status]++;
    });

    const timeSeriesData = Object.values(dailyData).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      summary: {
        total_submissions: totalSubmissions,
        allowed,
        challenged,
        held,
        blocked,
        avg_score_sales: Number(avgScoreSales.toFixed(2)),
        avg_score_spam: Number(avgScoreSpam.toFixed(2)),
      },
      time_series: timeSeriesData,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        days: period,
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
