(function mockEvaluateEndpoint() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }

  const originalFetch = window.fetch.bind(window);
  const salesRegex = /(営業|セールス|商談|sales)/i;
  const challengeRegex = /(チャレンジ|challenge)/i;
  let mockActive = false;

  function normalizeText(formData) {
    return Object.values(formData || {})
      .map((value) => {
        if (Array.isArray(value)) return value.join(' ');
        if (value === null || value === undefined) return '';
        return String(value);
      })
      .join(' ')
      .toLowerCase();
  }

  function buildResponse(body) {
    const formData = body?.form_data ?? {};
    const text = normalizeText(formData);
    const containsUrl = text.includes('http://') || text.includes('https://');
    const containsSales = salesRegex.test(text);
    const containsChallenge = challengeRegex.test(text);

    let decision = 'allowed';
    const reasons = [];
    let salesScore = 0.12;
    let spamScore = 0.08;
    let message = '送信を許可しました。';

    if (containsSales || containsUrl) {
      decision = 'blocked';
      message = '営業/URL を検知したためブロックしました。';
      reasons.push('営業キーワード', 'URL検出');
      salesScore = 0.93;
      spamScore = containsUrl ? 0.88 : 0.6;
    } else if (containsChallenge) {
      decision = 'challenged';
      message = 'この送信は営業目的か確認してください。';
      reasons.push('自己申告が必要');
      salesScore = 0.72;
      spamScore = 0.4;
    }

    return {
      success: true,
      decision,
      message,
      submission_id: 'mock-submission',
      scores: {
        sales: Number(salesScore.toFixed(2)),
        spam: Number(spamScore.toFixed(2)),
      },
      reasons,
      challenge: decision === 'challenged' ? { type: 'self_report' } : undefined,
    };
  }

  async function fetchWithMock(input, init = {}) {
    if (!mockActive) {
      return originalFetch(input, init);
    }

    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';

    if (url && url.includes('/api/v1/evaluate')) {
      try {
        const bodyText = typeof init.body === 'string' ? init.body : await init.body?.text?.();
        const parsedBody = bodyText ? JSON.parse(bodyText) : {};
        const payload = buildResponse(parsedBody);

        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('[MockAPI] Failed to handle request', error);
        return new Response(
          JSON.stringify({ success: false, error: { message: 'Mock failure' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return originalFetch(input, init);
  }

  window.fetch = fetchWithMock;
  window.FormBlockerMockApi = {
    enable() {
      mockActive = true;
      console.info('[MockAPI] Mock responses enabled');
    },
    disable() {
      mockActive = false;
      console.info('[MockAPI] Mock responses disabled');
    },
    isActive() {
      return mockActive;
    },
  };
})();
