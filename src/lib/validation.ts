import { FormConfig, SubmissionStatus } from '@/types';

/**
 * フォーム送信データの判定ロジック
 * ホワイトリスト優先の2段階判定システム
 */

// ドメイン抽出のヘルパー関数
function extractDomains(text: string): string[] {
  const domains: string[] = [];

  // URLからドメインを抽出
  const urlRegex = /https?:\/\/([^\/\s]+)/gi;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    domains.push(match[1].toLowerCase());
  }

  // メールアドレスからドメインを抽出
  const emailRegex = /[\w.-]+@([\w.-]+\.\w+)/gi;
  while ((match = emailRegex.exec(text)) !== null) {
    domains.push(match[1].toLowerCase());
  }

  return domains;
}

// ドメインマッチング（サブドメイン含む）
function isDomainMatch(domain: string, targetDomain: string): boolean {
  const normalizedDomain = domain.toLowerCase();
  const normalizedTarget = targetDomain.toLowerCase();

  // 完全一致
  if (normalizedDomain === normalizedTarget) {
    return true;
  }

  // サブドメインとしてマッチ（例: mail.example.com が example.com にマッチ）
  if (normalizedDomain.endsWith('.' + normalizedTarget)) {
    return true;
  }

  return false;
}

// キーワードチェック（部分一致）
function containsKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

interface ValidationResult {
  status: SubmissionStatus | null; // null = 判定なし（スコアベース判定へ進む）
  reason?: string;
  matchedItem?: string;
}

/**
 * ホワイトリストチェック
 * キーワードまたはドメインが一致したら即許可
 */
export function checkWhitelist(
  formData: Record<string, any>,
  config: FormConfig
): ValidationResult {
  const allText = Object.values(formData).join(' ');

  // ホワイトリストキーワードチェック（全フィールド、部分一致）
  for (const keyword of config.whitelist_keywords || []) {
    if (containsKeyword(allText, keyword)) {
      return {
        status: 'allowed',
        reason: 'ホワイトリストキーワード',
        matchedItem: keyword,
      };
    }
  }

  // ホワイトリストドメインチェック
  const domains = extractDomains(allText);
  for (const domain of domains) {
    for (const allowedDomain of config.allowed_domains || []) {
      if (isDomainMatch(domain, allowedDomain)) {
        return {
          status: 'allowed',
          reason: 'ホワイトリストドメイン',
          matchedItem: allowedDomain,
        };
      }
    }
  }

  return { status: null }; // ホワイトリストに一致なし
}

/**
 * ブラックリストチェック
 * キーワードまたはドメインが一致したら即ブロック
 */
export function checkBlacklist(
  formData: Record<string, any>,
  config: FormConfig
): ValidationResult {
  const allText = Object.values(formData).join(' ');

  // ブラックリストキーワードチェック（全フィールド、部分一致）
  for (const keyword of config.banned_keywords || []) {
    if (containsKeyword(allText, keyword)) {
      return {
        status: 'blocked',
        reason: 'ブラックリストキーワード',
        matchedItem: keyword,
      };
    }
  }

  // ブラックリストドメインチェック
  const domains = extractDomains(allText);
  for (const domain of domains) {
    for (const blockedDomain of config.blocked_domains || []) {
      if (isDomainMatch(domain, blockedDomain)) {
        return {
          status: 'blocked',
          reason: 'ブラックリストドメイン',
          matchedItem: blockedDomain,
        };
      }
    }
  }

  return { status: null }; // ブラックリストに一致なし
}

/**
 * スコアベース判定
 * 既存の閾値ロジック
 */
export function evaluateByScore(
  salesScore: number,
  spamScore: number,
  config: FormConfig
): SubmissionStatus {
  const maxScore = Math.max(salesScore, spamScore);

  if (maxScore >= 0.85) {
    return 'blocked';
  } else if (maxScore >= 0.7) {
    return 'challenged';
  } else if (maxScore >= 0.5) {
    return 'held';
  } else {
    return 'allowed';
  }
}

/**
 * 総合判定関数
 * ホワイトリスト → ブラックリスト → スコアベース の順で判定
 */
export function evaluateSubmission(
  formData: Record<string, any>,
  salesScore: number,
  spamScore: number,
  config: FormConfig
): {
  status: SubmissionStatus;
  reasons: string[];
} {
  const reasons: string[] = [];

  // 1. ホワイトリストチェック
  const whitelistResult = checkWhitelist(formData, config);
  if (whitelistResult.status) {
    if (whitelistResult.reason && whitelistResult.matchedItem) {
      reasons.push(`${whitelistResult.reason}: ${whitelistResult.matchedItem}`);
    }
    return {
      status: whitelistResult.status,
      reasons,
    };
  }

  // 2. ブラックリストチェック
  const blacklistResult = checkBlacklist(formData, config);
  if (blacklistResult.status) {
    if (blacklistResult.reason && blacklistResult.matchedItem) {
      reasons.push(`${blacklistResult.reason}: ${blacklistResult.matchedItem}`);
    }
    return {
      status: blacklistResult.status,
      reasons,
    };
  }

  // 3. スコアベース判定
  const status = evaluateByScore(salesScore, spamScore, config);

  // スコアベース判定の理由を追加
  if (salesScore >= config.threshold_sales) {
    reasons.push('営業スコアが閾値を超過');
  }
  if (spamScore >= config.threshold_spam) {
    reasons.push('スパムスコアが閾値を超過');
  }
  if (config.enable_url_detection) {
    const allText = Object.values(formData).join(' ');
    if (/https?:\/\//i.test(allText)) {
      reasons.push('URL検出');
    }
  }

  return {
    status,
    reasons,
  };
}
