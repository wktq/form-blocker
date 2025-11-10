import type { AuthApiError, AuthError } from '@supabase/supabase-js';

type SupabaseError = AuthError | AuthApiError | Error | null;

const fallbackMessage = '認証に失敗しました。時間をおいて再試行してください。';

const directMessageMap: Record<string, string> = {
  'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません。',
  'Email not confirmed': 'メールアドレスが未確認です。受信ボックスの確認メールをご確認ください。',
  'User already registered': 'このメールアドレスは既に登録されています。',
  'Password should be at least 6 characters': 'パスワードは6文字以上である必要があります。',
  'Password should be at least 6 characters long': 'パスワードは6文字以上である必要があります。',
  'Invalid email': 'メールアドレスの形式が正しくありません。',
  'Weak password': 'より複雑なパスワードを設定してください。',
  'weak password': 'より複雑なパスワードを設定してください。',
  'The new password should be different from the old password.': '新しいパスワードは以前のものと異なる必要があります。',
};

const statusMessageMap: Record<number, string> = {
  400: '入力内容に問題があります。内容を確認して再度お試しください。',
  401: '認証情報が無効です。メールアドレスとパスワードを確認してください。',
  422: '入力内容に問題があります。内容を確認して再度お試しください。',
  429: '短時間にリクエストが集中しています。しばらくしてから再度お試しください。',
  500: 'サーバーで問題が発生しました。時間をおいて再試行してください。',
};

const keywordRules: Array<{ keywords: string[]; message: string }> = [
  {
    keywords: ['already registered', 'user exists'],
    message: 'このメールアドレスは既に登録されています。',
  },
  {
    keywords: ['invalid login', 'invalid email', 'invalid credentials'],
    message: 'メールアドレスまたはパスワードが正しくありません。',
  },
  {
    keywords: ['email not confirmed', 'email not verified'],
    message: 'メールアドレスが未確認です。確認メールをご確認ください。',
  },
  {
    keywords: ['password', 'weak password'],
    message: 'パスワード要件を満たしていません。より複雑なパスワードを設定してください。',
  },
];

export function translateSupabaseAuthError(error: SupabaseError): string {
  if (!error) {
    return fallbackMessage;
  }

  const rawMessage = typeof error.message === 'string' ? error.message.trim() : '';

  if (rawMessage && directMessageMap[rawMessage]) {
    return directMessageMap[rawMessage];
  }

  const normalizedMessage = rawMessage.toLowerCase();

  if (normalizedMessage.length > 0) {
    const matchedRule = keywordRules.find((rule) =>
      rule.keywords.some((keyword) => normalizedMessage.includes(keyword))
    );
    if (matchedRule) {
      return matchedRule.message;
    }
  }

  const status = (error as { status?: number }).status;
  if (typeof status === 'number' && statusMessageMap[status]) {
    return statusMessageMap[status];
  }

  return fallbackMessage;
}
