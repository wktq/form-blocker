import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export interface AIEvaluationResult {
  isSales: boolean;
  isSpam: boolean;
  salesScore: number;
  spamScore: number;
  reasoning: string;
}

export async function evaluateWithAI(
  content: string,
  formData: Record<string, any>
): Promise<AIEvaluationResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
あなたはWebフォーム送信内容の分析AIです。以下の送信内容を分析し、営業目的かスパムかを判定してください。

# 送信内容
${JSON.stringify(formData, null, 2)}

# 判定基準

## 営業目的の特徴
- 自社サービスの紹介や提案
- 「御社」「貴社」などのビジネス用語
- 具体的な商品・サービス名や価格の言及
- 契約や導入を促す表現
- 販売代理店、広告代理店などの業種

## スパムの特徴
- 「今すぐ」「限定」「無料」などの緊急性を煽る言葉
- 不自然な大量のリンクや連絡先
- 過剰な絵文字や記号の使用
- テンプレート的な定型文
- 無関係な内容の羅列

# 回答形式
以下のJSON形式で回答してください：
{
  "isSales": boolean,
  "isSpam": boolean,
  "salesScore": number (0.0-1.0),
  "spamScore": number (0.0-1.0),
  "reasoning": string
}

reasoningには、判定理由を日本語で簡潔に（100文字程度）説明してください。
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSONを抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const evaluation: AIEvaluationResult = JSON.parse(jsonMatch[0]);

    // スコアの正規化
    evaluation.salesScore = Math.max(0, Math.min(1, evaluation.salesScore));
    evaluation.spamScore = Math.max(0, Math.min(1, evaluation.spamScore));

    return evaluation;
  } catch (error) {
    console.error('AI evaluation error:', error);
    // AIエラー時はフォールバック
    return {
      isSales: false,
      isSpam: false,
      salesScore: 0,
      spamScore: 0,
      reasoning: 'AI判定でエラーが発生したため、ルールベース判定のみ実行しました。',
    };
  }
}
