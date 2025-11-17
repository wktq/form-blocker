'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useFormContext } from '@/lib/forms/context';
import { formatDate } from '@/lib/utils';
import type { EvaluateResponse, Form, FormConfig } from '@/types';

type DetectionSnapshot = {
  urlDetected: boolean;
  detectedUrls: string[];
  schedulingUrls: string[];
  salesKeywords: string[];
  bannedKeywords: string[];
  blockedDomains: string[];
  pasteDetected: boolean;
  contentLength: number;
  updatedAt: number;
};

type DecisionRecord = {
  result: EvaluateResponse;
  timestamp: number;
};

type ChallengeState = {
  result: EvaluateResponse;
  allow: () => void;
};

type FormDetail = Form & {
  form_configs?: FormConfig[];
};

declare global {
  interface Window {
    FormBlocker?: {
      init: (options: Record<string, unknown>) => void;
      refresh?: () => void;
      destroy?: () => void;
    };
  }
}

const PREVIEW_FORM_SELECTOR = '#fb-preview-form';

const createDefaultDetection = (): DetectionSnapshot => ({
  urlDetected: false,
  detectedUrls: [],
  schedulingUrls: [],
  salesKeywords: [],
  bannedKeywords: [],
  blockedDomains: [],
  pasteDetected: false,
  contentLength: 0,
  updatedAt: Date.now(),
});

const FALLBACK_SALES_KEYWORDS = [
  '営業',
  'セールス',
  '提案',
  '御社',
  '貴社',
  '販売',
  '広告',
  '代理店',
];
const FALLBACK_BANNED_KEYWORDS = ['無料', '限定', '販売促進', '広告代理店'];
const FALLBACK_SCHEDULING_DOMAINS = [
  'calendly.com',
  'youcanbook.me',
  'scheduleonce.com',
  'acuityscheduling.com',
  'savvycal.com',
  'hubspot.com',
  'meetings.hubspot.com',
  'tidycal.com',
  'cal.com',
];

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    const match = url.match(/https?:\/\/([^/\s]+)/i);
    return match?.[1]?.toLowerCase() ?? null;
  }
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function matchesDomain(domain: string, target: string): boolean {
  return domain === target || domain.endsWith(`.${target}`);
}

function collectEmailDomainsFromFragments(values: string[]): string[] {
  const domains = new Set<string>();
  values.forEach((value) => {
    if (typeof value !== 'string' || value.length === 0) {
      return;
    }
    const regex = /[\w.+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi;
    const matches = Array.from(value.matchAll(regex));
    for (const match of matches) {
      if (match[1]) {
        domains.add(match[1].toLowerCase());
      }
    }
  });
  return Array.from(domains);
}

function gatherFormValueFragments(form: HTMLFormElement): string[] {
  const fragments: string[] = [];
  const elements = Array.from(form.elements) as Array<HTMLInputElement | HTMLTextAreaElement>;
  elements.forEach((element) => {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return;
    }
    if (!element.name) {
      return;
    }
    if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      if (element.checked) {
        fragments.push(element.value);
      }
      return;
    }
    if (element instanceof HTMLInputElement && element.type === 'radio') {
      if (element.checked) {
        fragments.push(element.value);
      }
      return;
    }
    fragments.push(element.value);
  });
  return fragments;
}

function buildLocalDetectionSnapshot(
  form: HTMLFormElement,
  options: {
    bannedKeywords?: string[];
    blockedDomains?: string[];
    pasteDetected?: boolean;
  }
): DetectionSnapshot {
  const fragments = gatherFormValueFragments(form);
  const combinedRaw = fragments.join(' ');
  const combinedLower = combinedRaw.toLowerCase();

  const detectedUrls = combinedRaw.match(URL_REGEX) ?? [];
  const schedulingUrls = detectedUrls.filter((url) => {
    const domain = extractHostname(url);
    if (!domain) return false;
    return FALLBACK_SCHEDULING_DOMAINS.some((target) => matchesDomain(domain, target));
  });

  const normalizedSales = FALLBACK_SALES_KEYWORDS.map((keyword) => keyword.toLowerCase());
  const salesKeywords = normalizedSales.filter(
    (keyword) => keyword && combinedLower.includes(keyword)
  );

  const sourceBanned =
    options?.bannedKeywords && options.bannedKeywords.length > 0
      ? options.bannedKeywords
      : FALLBACK_BANNED_KEYWORDS;
  const normalizedBanned = sourceBanned.map((keyword) => keyword.toLowerCase());
  const bannedKeywords = normalizedBanned.filter(
    (keyword) => keyword && combinedLower.includes(keyword)
  );

  const configuredBlockedDomains = (options?.blockedDomains || [])
    .map(normalizeDomain)
    .filter(Boolean);
  const emailDomains = collectEmailDomainsFromFragments(fragments);
  const urlDomains = Array.from(
    new Set(
      detectedUrls
        .map((url) => extractHostname(url))
        .filter((domain): domain is string => Boolean(domain))
        .map(normalizeDomain)
    )
  );
  const candidateDomains = Array.from(
    new Set([...urlDomains, ...emailDomains.map(normalizeDomain)])
  );
  const blockedDomains =
    configuredBlockedDomains.length > 0
      ? candidateDomains.filter((domain) =>
          configuredBlockedDomains.some((blocked) => matchesDomain(domain, blocked))
        )
      : [];

  return {
    urlDetected: detectedUrls.length > 0,
    detectedUrls,
    schedulingUrls,
    salesKeywords,
    bannedKeywords,
    blockedDomains,
    pasteDetected: Boolean(options?.pasteDetected),
    contentLength: combinedLower.length,
    updatedAt: Date.now(),
  };
}

function extractFormDataObject(form: HTMLFormElement): Record<string, string | string[]> {
  const data: Record<string, string | string[]> = {};
  const elements = Array.from(form.elements) as Array<HTMLInputElement | HTMLTextAreaElement>;

  elements.forEach((element) => {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return;
    }

    const name = element.name || element.id;
    if (!name) {
      return;
    }

    const type = element instanceof HTMLInputElement ? element.type : undefined;

    if (type === 'checkbox') {
      const input = element as HTMLInputElement;
      if (!Array.isArray(data[name])) {
        data[name] = [];
      }
      if (input.checked) {
        (data[name] as string[]).push(input.value || 'on');
      }
      if (!input.checked && !(name in data)) {
        data[name] = [];
      }
      return;
    }

    if (type === 'radio') {
      const input = element as HTMLInputElement;
      if (input.checked) {
        data[name] = input.value;
      } else if (!(name in data)) {
        data[name] = '';
      }
      return;
    }

    data[name] = element.value;
  });

  return data;
}

function buildFallbackEvaluatePayload(
  form: HTMLFormElement,
  apiKey: string,
  options: {
    pasteDetected: boolean;
    formSelector: string;
    formLoadTime: number;
  }
) {
  const formData = extractFormDataObject(form);
  const metadata = {
    url: typeof window !== 'undefined' ? window.location.href : '',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    timestamp: Date.now(),
    form_selector: options.formSelector,
  };

  const behavioral = {
    paste_detected: options.pasteDetected,
    time_to_submit: (Date.now() - options.formLoadTime) / 1000,
  };

  return {
    api_key: apiKey,
    form_data: formData,
    metadata,
    behavioral_data: behavioral,
  };
}

export default function FormDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { selectForm } = useFormContext();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [form, setForm] = useState<FormDetail | null>(null);
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [detection, setDetection] = useState<DetectionSnapshot>(createDefaultDetection());
  const [lastDecision, setLastDecision] = useState<DecisionRecord | null>(null);
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scriptDetectionActive, setScriptDetectionActive] = useState(false);
  const [previewSubmitting, setPreviewSubmitting] = useState(false);
  const fallbackPasteDetectedRef = useRef(false);
  const formLoadTimeRef = useRef<number>(Date.now());
  const scriptVersion = useMemo(() => Date.now().toString(), []);
  const embedSnippet = useMemo(() => {
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:3000';
    const apiKey = form?.api_key ?? 'fb_live_xxxxxxxxxxxx';
    const selectorValue = config?.form_selector?.trim() ?? '';
    const normalizedSelector = selectorValue.length > 0 ? selectorValue : PREVIEW_FORM_SELECTOR;
    const needsSelectorLine = normalizedSelector !== 'form';
    const selectorLine = needsSelectorLine
      ? `    selector: '${normalizedSelector.replace(/'/g, "\\'")}',\n`
      : '';
    return `<!-- FormBlocker -->
<script src="${cdnUrl}/embed/form-blocker.min.js"></script>
<script>
  FormBlocker.init({
    apiKey: '${apiKey}',
${selectorLine}  });
</script>`;
  }, [config?.form_selector, form?.api_key]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/forms/${params.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('フォームが見つかりませんでした');
          }
          throw new Error('フォーム情報の取得に失敗しました');
        }

        const body = await response.json();
        const detail: FormDetail | null = body.form ?? null;
        if (!cancelled) {
          setForm(detail);
          setConfig(detail?.form_configs?.[0] ?? null);
          if (detail) {
            selectForm(detail.id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'フォーム情報の取得に失敗しました');
          setForm(null);
          setConfig(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [params.id, selectForm]);

  useEffect(() => {
    let cancelled = false;
    const script = document.createElement('script');
    script.src = `/embed/form-blocker.min.js?v=${scriptVersion}`;
    script.async = true;
    script.onload = () => {
      if (!cancelled) {
        setIsScriptReady(true);
      }
    };
    script.onerror = () => {
      if (!cancelled) {
        setErrorMessage('埋め込みスクリプトの読み込みに失敗しました');
      }
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      script.remove();
    };
  }, [scriptVersion]);

  useEffect(() => {
    if (!formRef.current) return;
    formRef.current.reset();
    setDetection(createDefaultDetection());
    setLastDecision(null);
    setChallengeState(null);
    setErrorMessage(null);
    fallbackPasteDetectedRef.current = false;
    setScriptDetectionActive(false);
    formLoadTimeRef.current = Date.now();
  }, [form?.id]);

  useEffect(() => {
    if (!isScriptReady || !form) {
      return;
    }

    let frameId: number | null = null;
    let initialized = false;
    setScriptDetectionActive(false);
    fallbackPasteDetectedRef.current = false;

    const initialize = () => {
      if (initialized) {
        return;
      }

      if (!formRef.current) {
        frameId = window.requestAnimationFrame(initialize);
        return;
      }

      if (!window.FormBlocker || typeof window.FormBlocker.init !== 'function') {
        frameId = window.requestAnimationFrame(initialize);
        return;
      }

      if (typeof window.FormBlocker.destroy === 'function') {
        window.FormBlocker.destroy();
      }

      window.FormBlocker.init({
        apiKey: form.api_key,
        selector: PREVIEW_FORM_SELECTOR,
        debug: true,
        previewMode: true,
        debugRules: {
          bannedKeywords: config?.banned_keywords || [],
          blockedDomains: config?.blocked_domains || [],
        },
        onDetectionUpdate: (snapshot: DetectionSnapshot) => {
          setScriptDetectionActive(true);
          setDetection(snapshot);
        },
        onAllow: (result: EvaluateResponse) => {
          setChallengeState(null);
          setLastDecision({ result, timestamp: Date.now() });
        },
        onBlock: (result: EvaluateResponse) => {
          setChallengeState(null);
          setLastDecision({ result, timestamp: Date.now() });
        },
        onHold: (result: EvaluateResponse) => {
          setChallengeState(null);
          setLastDecision({ result, timestamp: Date.now() });
        },
        onChallenge: (result: EvaluateResponse, allow: () => void) => {
          setChallengeState({ result, allow });
          setLastDecision({ result, timestamp: Date.now() });
        },
        onError: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : typeof error === 'string'
              ? error
              : '未知のエラーが発生しました';
          setScriptDetectionActive(false);
          setErrorMessage(message);
        },
      });

      initialized = true;
    };

    initialize();

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (window.FormBlocker && typeof window.FormBlocker.destroy === 'function') {
        window.FormBlocker.destroy();
      }
    };
  }, [isScriptReady, form, config?.banned_keywords, config?.blocked_domains]);

  useEffect(() => {
    if (scriptDetectionActive) {
      return;
    }

    const formElement = formRef.current;
    if (!formElement) {
      return;
    }

    const updateSnapshot = () => {
      const snapshot = buildLocalDetectionSnapshot(formElement, {
        bannedKeywords: config?.banned_keywords,
        blockedDomains: config?.blocked_domains,
        pasteDetected: fallbackPasteDetectedRef.current,
      });
      setDetection(snapshot);
    };

    const handleInput = () => {
      updateSnapshot();
    };

    const handlePaste = () => {
      fallbackPasteDetectedRef.current = true;
      updateSnapshot();
    };

    fallbackPasteDetectedRef.current = false;
    updateSnapshot();

    formElement.addEventListener('input', handleInput);
    formElement.addEventListener('paste', handlePaste);

    return () => {
      formElement.removeEventListener('input', handleInput);
      formElement.removeEventListener('paste', handlePaste);
    };
  }, [
    scriptDetectionActive,
    form?.id,
    config?.banned_keywords,
    config?.blocked_domains,
  ]);

  const applyEvaluationResult = (result: EvaluateResponse) => {
    setErrorMessage(null);
    setLastDecision({ result, timestamp: Date.now() });

    if (result.decision === 'challenged') {
      setChallengeState({
        result,
        allow: () => {
          setChallengeState(null);
        },
      });
      return;
    }

    setChallengeState(null);
  };

  const handlePreviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (scriptDetectionActive || !formRef.current || !form) {
      return;
    }

    if (previewSubmitting) {
      return;
    }

    setPreviewSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = buildFallbackEvaluatePayload(formRef.current, form.api_key, {
        pasteDetected: fallbackPasteDetectedRef.current,
        formSelector: PREVIEW_FORM_SELECTOR,
        formLoadTime: formLoadTimeRef.current,
      });

      const response = await fetch('/api/v1/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      if (!response.ok || !body?.success) {
        const message =
          typeof body?.error?.message === 'string'
            ? body.error.message
            : 'プレビュー用の判定リクエストに失敗しました';
        throw new Error(message);
      }

      applyEvaluationResult(body as EvaluateResponse);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'プレビュー送信に失敗しました');
    } finally {
      setPreviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        フォームの詳細を読み込み中です...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => router.push('/forms')}>フォーム一覧に戻る</Button>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">フォームが見つかりません</h1>
            <p className="text-gray-500 mt-2">
              選択したフォームは存在しないか、アーカイブされています。
            </p>
          </div>
          <Button onClick={() => router.push('/forms')}>フォーム一覧に戻る</Button>
        </div>
      </div>
    );
  }

  const detectionItems = [
    {
      label: 'URL検出',
      active: detection.urlDetected,
      detail:
        detection.detectedUrls.length > 0 ? detection.detectedUrls.join(', ') : 'なし',
    },
    {
      label: '日程調整URL',
      active: detection.schedulingUrls.length > 0,
      detail:
        detection.schedulingUrls.length > 0 ? detection.schedulingUrls.join(', ') : 'なし',
    },
    {
      label: '営業キーワード',
      active: detection.salesKeywords.length > 0,
      detail:
        detection.salesKeywords.length > 0 ? detection.salesKeywords.join(', ') : 'なし',
    },
    {
      label: '禁止キーワード',
      active: detection.bannedKeywords.length > 0,
      detail:
        detection.bannedKeywords.length > 0
          ? detection.bannedKeywords.join(', ')
          : 'なし',
    },
    {
      label: 'ブロック対象ドメイン',
      active: detection.blockedDomains.length > 0,
      detail:
        detection.blockedDomains.length > 0
          ? detection.blockedDomains.join(', ')
          : 'なし',
    },
    {
      label: '貼り付け検出',
      active: detection.pasteDetected,
      detail: detection.pasteDetected ? '貼り付けあり' : '検出なし',
    },
  ];

  const decision = lastDecision?.result.decision;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/forms" className="text-sm text-primary-600 hover:text-primary-700">
            ← フォーム一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{form.name}</h1>
          <p className="text-gray-500 mt-1">{form.site_url}</p>
          <p className="text-xs text-gray-500 mt-1">
            作成日: {formatDate(form.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={form.is_active ? 'success' : 'default'} className="text-base px-4 py-2">
            {form.is_active ? 'アクティブ' : '無効'}
          </Badge>
          <Link href={`/forms/${form.id}/edit`}>
            <Button variant="secondary">編集</Button>
          </Link>
        </div>
      </div>

      {config && (
        <div className="alert alert-info">
          <span>
            埋め込みプレビューは実際の`/api/v1/evaluate` エンドポイントを呼び出し、結果は
            Supabase に保存されます。
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section id="preview">
            <Card>
              <CardHeader>
                <CardTitle>動作プレビュー</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                  <p>
                    このプレビューでは実際の埋め込みスクリプトを利用して、送信前に検出されるシグナルと
                    API の判定結果を確認できます。
                  </p>
                  <ul className="list-disc list-inside mt-3 space-y-1">
                    <li>入力中はリアルタイムで検出状態が右側に表示されます。</li>
                    <li>送信ボタンを押すと `/api/v1/evaluate` が呼び出されます。</li>
                    <li>プレビューでは実際の送信は行われません。</li>
                  </ul>
                </div>

                <form
                  id="fb-preview-form"
                  ref={formRef}
                  className="space-y-4"
                  onSubmit={handlePreviewSubmit}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      お名前
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500"
                      placeholder="山田太郎"
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500"
                      placeholder="yamada@example.com"
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      問い合わせ内容
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500"
                      placeholder="お問い合わせ内容を入力してください"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!scriptDetectionActive && previewSubmitting}
                  >
                    {!scriptDetectionActive && previewSubmitting ? '判定実行中...' : 'プレビュー送信'}
                  </Button>
                </form>

                {challengeState && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-yellow-800">チャレンジ状態</h3>
                    <p className="text-sm text-yellow-800">
                      {challengeState.result.message || '追加の確認が必要です。'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => challengeState.allow()}>
                        営業目的ではないとして送信を続行
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setChallengeState(null)}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700">エラー: {errorMessage}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section id="evaluation">
            <Card>
              <CardHeader>
                <CardTitle>直近のAPI判定</CardTitle>
              </CardHeader>
              <CardContent>
                {lastDecision ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            decision === 'blocked'
                              ? 'danger'
                              : decision === 'challenged'
                              ? 'warning'
                              : decision === 'held'
                              ? 'info'
                              : 'success'
                          }
                        >
                          {decision === 'allowed'
                            ? '許可'
                            : decision === 'blocked'
                            ? 'ブロック'
                            : decision === 'challenged'
                            ? 'チャレンジ'
                            : '保留'}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDate(new Date(lastDecision.timestamp))}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setLastDecision(null)}>
                        リセット
                      </Button>
                    </div>
                    <div className="text-sm space-y-2">
                      <p className="text-gray-700 font-medium">メッセージ</p>
                      <p className="text-gray-600 bg-gray-50 rounded-lg p-3">
                        {lastDecision.result.message}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          営業スコア
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {(lastDecision.result.scores.sales * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          スパムスコア
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {(lastDecision.result.scores.spam * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    {lastDecision.result.reasons.length > 0 && (
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-700 font-medium">検出理由</p>
                        <div className="flex flex-wrap gap-2">
                          {lastDecision.result.reasons.map((reason) => (
                            <Badge key={reason} variant="default">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    まだ判定は実行されていません。フォームを送信して確認してください。
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <section id="insights">
            <Card>
              <CardHeader>
                <CardTitle>リアルタイム検出</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-gray-500">
                  最終更新: {formatDate(new Date(detection.updatedAt))}
                </div>
                <div className="text-sm text-gray-600">
                  合計文字数: <span className="font-medium">{detection.contentLength}</span>
                </div>
                <div className="space-y-3">
                  {detectionItems.map((item) => (
                    <div
                      key={item.label}
                      className={`border rounded-lg p-3 text-sm ${
                        item.active
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs uppercase tracking-wide">
                          {item.active ? '検出' : '未検出'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="settings">
            <Card>
              <CardHeader>
                <CardTitle>フォーム設定概要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">監視セレクター</p>
                  <code className="inline-block mt-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-800">
                    {config?.form_selector ?? 'form'}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span>URL検出</span>
                  <Badge variant={config?.enable_url_detection ? 'success' : 'default'}>
                    {config?.enable_url_detection ? '有効' : '無効'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>ペースト検出</span>
                  <Badge variant={config?.enable_paste_detection ? 'success' : 'default'}>
                    {config?.enable_paste_detection ? '有効' : '無効'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">営業スコア閾値</p>
                  <p className="text-base font-semibold text-gray-900">
                    {Math.round(((config?.threshold_sales ?? 0.7) * 100))}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">スパムスコア閾値</p>
                  <p className="text-base font-semibold text-gray-900">
                    {Math.round(((config?.threshold_spam ?? 0.85) * 100))}%
                  </p>
                </div>
                {config?.banned_keywords?.length ? (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      禁止キーワード
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {config.banned_keywords.map((keyword) => (
                        <Badge key={keyword} variant="default">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">禁止キーワードは設定されていません。</p>
                )}
                {config?.blocked_domains?.length ? (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      ブロック対象ドメイン
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {config.blocked_domains.map((domain) => (
                        <Badge key={domain} variant="default">
                          {domain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">ブロック対象ドメインは設定されていません。</p>
                )}
              </CardContent>
            </Card>
          </section>

          <section id="embed">
            <Card>
              <CardHeader>
                <CardTitle>埋め込みコード</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-gray-600">
                  サイトに以下のコードを設置すると、このフォームの監視を開始できます。
                </p>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
{embedSnippet}
                </pre>
                <p className="text-xs text-gray-500">
                  送信結果や履歴は Supabase の設定と `/api/v1/evaluate` を通じて保存されます。
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
