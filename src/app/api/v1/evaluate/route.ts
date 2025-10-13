import { NextRequest, NextResponse } from 'next/server';
import { EvaluateRequest, EvaluateResponse } from '@/types';

// モック判定エンジン
function evaluateSubmission(request: EvaluateRequest): EvaluateResponse {
  const { form_data, behavioral_data } = request;

  let salesScore = 0;
  let spamScore = 0;
  const reasons: string[] = [];

  // フォーム内容を文字列に変換
  const content = Object.values(form_data).join(' ').toLowerCase();

  // URL検出
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlRegex) || [];
  if (urls.length > 0) {
    salesScore += 0.3;
    reasons.push('url_detected');
  }

  // 営業キーワード検出
  const salesKeywords = ['営業', 'セールス', '提案', '御社', '貴社', '販売', '広告', '代理店'];
  const foundSalesKeywords = salesKeywords.filter(kw => content.includes(kw));
  if (foundSalesKeywords.length > 0) {
    salesScore += 0.2 * foundSalesKeywords.length;
    reasons.push('sales_keywords');
  }

  // スパムキーワード検出
  const spamKeywords = ['今すぐ', '限定', '無料', '特別', 'クリック'];
  const foundSpamKeywords = spamKeywords.filter(kw => content.includes(kw));
  if (foundSpamKeywords.length > 0) {
    spamScore += 0.3 * foundSpamKeywords.length;
    reasons.push('spam_keywords');
  }

  // ペースト検出
  if (behavioral_data?.paste_detected) {
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

  // 判定決定
  let decision: 'allow' | 'challenge' | 'hold' | 'block';
  if (salesScore >= 0.85 || spamScore >= 0.85) {
    decision = 'block';
  } else if (salesScore >= 0.7 || spamScore >= 0.7) {
    decision = 'challenge';
  } else if (salesScore >= 0.5 || spamScore >= 0.5) {
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

  const response: EvaluateResponse = {
    success: true,
    submission_id: `sub-${Date.now()}`,
    decision,
    scores: {
      sales: salesScore,
      spam: spamScore,
    },
    reasons,
    message: messages[decision],
  };

  if (decision === 'challenge') {
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

    // API Key検証（モック）
    if (!body.api_key || !body.api_key.startsWith('fb_live_')) {
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

    // 評価実行
    const result = evaluateSubmission(body);

    // レスポンス返却
    return NextResponse.json(result, {
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
