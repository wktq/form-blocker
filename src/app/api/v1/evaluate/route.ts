import { NextRequest, NextResponse } from 'next/server';
import { EvaluateRequest, EvaluateResponse, FormConfig } from '@/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateWithAI } from '@/lib/ai/gemini';

// ルールベース判定エンジン
function ruleBasedEvaluation(
  request: EvaluateRequest,
  config: FormConfig
): { salesScore: number; spamScore: number; reasons: string[] } {
  const { form_data, behavioral_data } = request;

  let salesScore = 0;
  let spamScore = 0;
  const reasons: string[] = [];

  // フォーム内容を文字列に変換
  const content = Object.values(form_data).join(' ').toLowerCase();

  // URL検出（設定で有効な場合）
  if (config.enable_url_detection) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];
    if (urls.length > 0) {
      salesScore += 0.3;
      reasons.push('url_detected');
    }
  }

  // 禁止キーワード検出
  const foundBannedKeywords = config.banned_keywords.filter(kw =>
    content.includes(kw.toLowerCase())
  );
  if (foundBannedKeywords.length > 0) {
    salesScore += 0.2 * foundBannedKeywords.length;
    reasons.push('banned_keywords');
  }

  // デフォルト営業キーワード検出
  const defaultSalesKeywords = ['営業', 'セールス', '提案', '御社', '貴社', '販売', '広告', '代理店'];
  const foundSalesKeywords = defaultSalesKeywords.filter(kw => content.includes(kw));
  if (foundSalesKeywords.length > 0) {
    salesScore += 0.15 * foundSalesKeywords.length;
    reasons.push('sales_keywords');
  }

  // スパムキーワード検出
  const spamKeywords = ['今すぐ', '限定', '無料', '特別', 'クリック'];
  const foundSpamKeywords = spamKeywords.filter(kw => content.includes(kw));
  if (foundSpamKeywords.length > 0) {
    spamScore += 0.3 * foundSpamKeywords.length;
    reasons.push('spam_keywords');
  }

  // ペースト検出（設定で有効な場合）
  if (config.enable_paste_detection && behavioral_data?.paste_detected) {
    salesScore += 0.2;
    reasons.push('paste_detected');
  }

  // 送信速度チェック
  if (behavioral_data?.time_to_submit && behavioral_data.time_to_submit < 5) {
    spamScore += 0.3;
    reasons.push('fast_submission');
  }

  // スコアを0-1の範囲に正規化
  salesScore = Math.min(salesScore, 1.0);
  spamScore = Math.min(spamScore, 1.0);

  return { salesScore, spamScore, reasons };
}

// 統合判定エンジン
async function evaluateSubmission(
  request: EvaluateRequest,
  config: FormConfig
): Promise<EvaluateResponse & { llm_reasoning?: string }> {
  const { form_data } = request;

  // 1. ルールベース判定
  const { salesScore: ruleSalesScore, spamScore: ruleSpamScore, reasons } =
    ruleBasedEvaluation(request, config);

  // 2. AI判定（Gemini）
  const content = JSON.stringify(form_data);
  const aiResult = await evaluateWithAI(content, form_data);

  // 3. スコア統合（重み付け平均: ルール60%, AI40%）
  let salesScore = ruleSalesScore * 0.6 + aiResult.salesScore * 0.4;
  let spamScore = ruleSpamScore * 0.6 + aiResult.spamScore * 0.4;

  // スコアを0-1の範囲に正規化
  salesScore = Math.min(Math.max(salesScore, 0), 1.0);
  spamScore = Math.min(Math.max(spamScore, 0), 1.0);

  // 判定決定（設定の閾値を使用）
  let decision: 'allow' | 'challenge' | 'hold' | 'block';
  if (salesScore >= config.threshold_spam || spamScore >= config.threshold_spam) {
    decision = 'block';
  } else if (salesScore >= config.threshold_sales || spamScore >= config.threshold_sales) {
    decision = 'challenge';
  } else if (salesScore >= (config.threshold_sales - 0.2) || spamScore >= (config.threshold_sales - 0.2)) {
    decision = 'hold';
  } else {
    decision = 'allow';
  }

  // メッセージ生成
  const messages = {
    allow: '送信が許可されました',
    challenge: '追加の確認が必要です。営業目的ではないことを確認してください。',
    hold: '送信内容を確認中です。しばらくお待ちください。',
    block: '送信がブロックされました。営業目的またはスパムの可能性があります。',
  };

  const response = {
    success: true,
    submission_id: '', // Will be set after DB insert
    decision,
    scores: {
      sales: salesScore,
      spam: spamScore,
    },
    reasons,
    message: messages[decision],
    llm_reasoning: aiResult.reasoning,
  };

  if (decision === 'challenge') {
    response.challenge = {
      type: 'self_report' as const,
      question: 'この送信は営業目的ではありませんか？',
    };
  }

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body: EvaluateRequest = await request.json();
    const supabase = createAdminClient();

    // API Key検証
    if (!body.api_key || !body.api_key.startsWith('fb_live_')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key format',
          },
        },
        { status: 401 }
      );
    }

    // フォーム取得（API Keyで認証）
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        id,
        is_active,
        form_configs (*)
      `)
      .eq('api_key', body.api_key)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key',
          },
        },
        { status: 401 }
      );
    }

    // フォームが無効化されている場合
    if (!form.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORM_INACTIVE',
            message: 'This form is inactive',
          },
        },
        { status: 403 }
      );
    }

    // バリデーション
    if (!body.form_data || !body.metadata) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
          },
        },
        { status: 400 }
      );
    }

    const config = form.form_configs[0];

    // 評価実行
    const result = await evaluateSubmission(body, config);

    // Supabaseに保存
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        form_id: form.id,
        status: result.decision,
        score_sales: result.scores.sales,
        score_spam: result.scores.spam,
        final_decision: result.decision,
        content: body.form_data,
        metadata: body.metadata,
        detection_reasons: result.reasons,
        llm_reasoning: result.llm_reasoning,
        ip_address: body.metadata.ip_address || null,
        user_agent: body.metadata.user_agent || null,
      })
      .select('id')
      .single();

    if (submissionError) {
      console.error('Error saving submission:', submissionError);
      // エラーでもクライアントには結果を返す
    }

    // submission_idを設定
    result.submission_id = submission?.id || `sub-${Date.now()}`;

    // レスポンス返却（llm_reasoningは含めない）
    const { llm_reasoning, ...publicResult } = result;

    return NextResponse.json(publicResult, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  });
}
