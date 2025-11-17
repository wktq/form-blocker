import { NextRequest, NextResponse } from 'next/server';
import { EvaluateRequest, EvaluateResponse, FormConfig } from '@/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateWithAI } from '@/lib/ai/gemini';
import { analyzeFormContent, DEFAULT_SALES_KEYWORDS, DEFAULT_SPAM_KEYWORDS } from '@/lib/evaluation/rules';

export const dynamic = 'force-dynamic';

// ルールベース判定エンジン
function ruleBasedEvaluation(
  request: EvaluateRequest,
  config: FormConfig
): { salesScore: number; spamScore: number; reasons: string[] } {
  const { form_data, behavioral_data } = request;

  let salesScore = 0;
  let spamScore = 0;
  const reasons: string[] = [];

  const analysis = analyzeFormContent(form_data, {
    bannedKeywords: config.banned_keywords ?? [],
    blockedDomains: config.blocked_domains ?? [],
  });

  if (config.enable_url_detection !== false && analysis.urls.length > 0) {
    salesScore += 0.3;
    reasons.push('url_detected');
  }

  if (config.enable_url_detection !== false && analysis.schedulingUrls.length > 0) {
    salesScore += 0.3;
    reasons.push('scheduling_url');
  }

  if (analysis.bannedKeywords.length > 0) {
    salesScore += 0.2 * analysis.bannedKeywords.length;
    reasons.push('banned_keywords');
  }

  if (analysis.salesKeywords.length > 0) {
    const matchCount = analysis.salesKeywords.filter((kw) => DEFAULT_SALES_KEYWORDS.includes(kw)).length;
    salesScore += 0.15 * matchCount;
    reasons.push('sales_keywords');
  }

  if (analysis.spamKeywords.length > 0) {
    const matchCount = analysis.spamKeywords.filter((kw) => DEFAULT_SPAM_KEYWORDS.includes(kw)).length;
    spamScore += 0.3 * matchCount;
    reasons.push('spam_keywords');
  }

  if (analysis.blockedDomainMatches.length > 0) {
    salesScore += 0.4;
    const domainReasons = analysis.blockedDomainMatches.map((domain) => `blocked_domain:${domain}`);
    reasons.push(...domainReasons);
  }

  // ペースト検出（設定で有効な場合）
  if (config.enable_paste_detection !== false && behavioral_data?.paste_detected) {
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
  let decision: 'allowed' | 'challenged' | 'held' | 'blocked';
  if (salesScore >= config.threshold_spam || spamScore >= config.threshold_spam) {
    decision = 'blocked';
  } else if (salesScore >= config.threshold_sales || spamScore >= config.threshold_sales) {
    decision = 'challenged';
  } else if (salesScore >= (config.threshold_sales - 0.2) || spamScore >= (config.threshold_sales - 0.2)) {
    decision = 'held';
  } else {
    decision = 'allowed';
  }

  // メッセージ生成
  const messages = {
    allowed: '送信が許可されました',
    challenged: '追加の確認が必要です。営業目的ではないことを確認してください。',
    held: '送信内容を確認中です。しばらくお待ちください。',
    blocked: '送信がブロックされました。営業目的またはスパムの可能性があります。',
  };

  const response: EvaluateResponse & { llm_reasoning?: string } = {
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

  if (decision === 'challenged') {
    response.challenge = {
      type: 'self_report',
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

    let config = form.form_configs?.[0];

    if (!config) {
      const defaultConfig = {
        form_id: form.id,
        enable_url_detection: true,
        enable_paste_detection: true,
        threshold_sales: 0.7,
        threshold_spam: 0.7,
        banned_keywords: [] as string[],
        allowed_domains: [] as string[],
        blocked_domains: [] as string[],
        form_selector: 'form',
      };

      const { data: insertedConfig, error: upsertError } = await supabase
        .from('form_configs')
        .upsert(defaultConfig, { onConflict: 'form_id' })
        .select('*')
        .single();

      if (upsertError || !insertedConfig) {
        console.error('Failed to create default form config:', upsertError);

        // 競合が起きた場合は再取得してみる
        const { data: fallbackConfig } = await supabase
          .from('form_configs')
          .select('*')
          .eq('form_id', form.id)
          .maybeSingle();

        if (fallbackConfig) {
          config = fallbackConfig as unknown as FormConfig;
        } else {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'CONFIG_ERROR',
                message: 'Failed to load form configuration',
              },
            },
            { status: 500 }
          );
        }
      } else {
        config = insertedConfig as unknown as FormConfig;
      }
    }

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFIG_ERROR',
            message: 'Form configuration not found',
          },
        },
        { status: 500 }
      );
    }

    // null安全なデフォルト値
    config = {
      ...config,
      banned_keywords: config.banned_keywords ?? [],
      allowed_domains: config.allowed_domains ?? [],
      blocked_domains: config.blocked_domains ?? [],
      threshold_sales: typeof config.threshold_sales === 'number' ? config.threshold_sales : 0.7,
      threshold_spam: typeof config.threshold_spam === 'number' ? config.threshold_spam : 0.7,
      enable_url_detection:
        typeof config.enable_url_detection === 'boolean' ? config.enable_url_detection : true,
      enable_paste_detection:
        typeof config.enable_paste_detection === 'boolean' ? config.enable_paste_detection : true,
      form_selector:
        typeof config.form_selector === 'string' && config.form_selector.trim().length
          ? config.form_selector
          : 'form',
    };

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
        content: body.form_data as any,
        metadata: body.metadata as any,
        detection_reasons: result.reasons,
        llm_reasoning: result.llm_reasoning || null,
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
