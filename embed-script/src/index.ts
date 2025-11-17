type SubmissionDecision = 'allowed' | 'challenged' | 'held' | 'blocked';

interface ChallengePayload {
  type?: string;
  question?: string;
}

interface EvaluateSuccessResponse {
  success: true;
  decision: SubmissionDecision;
  message: string;
  submission_id?: string;
  scores?: {
    sales: number;
    spam: number;
  };
  reasons?: string[];
  challenge?: ChallengePayload;
}

interface EvaluateErrorResponse {
  success: false;
  error: {
    code?: string;
    message?: string;
  };
}

type EvaluateResponsePayload = EvaluateSuccessResponse | EvaluateErrorResponse;

interface DetectionSnapshot {
  urlDetected: boolean;
  detectedUrls: string[];
  schedulingUrls: string[];
  salesKeywords: string[];
  bannedKeywords: string[];
  blockedDomains: string[];
  pasteDetected: boolean;
  contentLength: number;
  updatedAt: number;
}

export interface FormBlockerInitOptions {
  apiKey: string;
  apiBaseUrl?: string;
  evaluatePath?: string;
  selector?: string;
  debug?: boolean;
  previewMode?: boolean;
  debugRules?: {
    salesKeywords?: string[];
    bannedKeywords?: string[];
    blockedDomains?: string[];
  };
  onAllow?: (result: EvaluateSuccessResponse) => void;
  onBlock?: (result: EvaluateSuccessResponse) => void;
  onChallenge?: (result: EvaluateSuccessResponse, allow: () => void) => void;
  onHold?: (result: EvaluateSuccessResponse) => void;
  onError?: (error: unknown) => void;
  onDetectionUpdate?: (snapshot: DetectionSnapshot) => void;
}

interface InternalConfig {
  apiKey: string;
  evaluateUrl: string;
  selector: string;
  debug: boolean;
  previewMode: boolean;
  salesKeywords: string[];
  bannedKeywords: string[];
  blockedDomains: string[];
  onAllow?: FormBlockerInitOptions['onAllow'];
  onBlock?: FormBlockerInitOptions['onBlock'];
  onChallenge?: FormBlockerInitOptions['onChallenge'];
  onHold?: FormBlockerInitOptions['onHold'];
  onError?: FormBlockerInitOptions['onError'];
  onDetectionUpdate?: FormBlockerInitOptions['onDetectionUpdate'];
}

interface BehavioralSnapshot {
  pasteDetected: boolean;
  timeToSubmit: number | null;
  pageLoadTime: number;
}

interface FormContext {
  originalSubmit: ((this: HTMLFormElement, ev: SubmitEvent) => unknown) | null;
  submitHandler: EventListener;
  pasteHandlers: Array<{ element: Element; handler: EventListener }>;
  inputHandlers: Array<{ element: Element; handler: EventListener }>;
  behavioral: BehavioralSnapshot;
  lastDetection?: DetectionSnapshot;
}

const FORM_BLOCKER_VERSION = '2024-11-07-block-modal';

const DEFAULT_SALES_KEYWORDS = ['営業', 'セールス', '提案', '御社', '貴社', '販売', '広告', '代理店'];
const DEFAULT_BANNED_KEYWORDS = ['無料', '限定', '販売促進', '広告代理店'];
const DEFAULT_SCHEDULING_DOMAINS = [
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

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function matchesDomain(domain: string, target: string): boolean {
  return domain === target || domain.endsWith(`.${target}`);
}

function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    const match = url.match(/https?:\/\/([^/\s]+)/i);
    return match?.[1]?.toLowerCase() ?? null;
  }
}

function collectEmailDomains(formData: Record<string, unknown>): string[] {
  const domains = new Set<string>();
  const regex = /[\w.+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  Object.values(formData).forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }
    const matches = value.matchAll(regex);
    for (const match of matches) {
      if (match[1]) {
        domains.add(match[1].toLowerCase());
      }
    }
  });
  return Array.from(domains);
}

function resolveEvaluateUrl(options: FormBlockerInitOptions): string {
  const baseUrl =
    (options.apiBaseUrl && options.apiBaseUrl.trim()) ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const evaluatePath = (options.evaluatePath || '/api/v1/evaluate').trim() || '/api/v1/evaluate';
  if (/^https?:\/\//i.test(evaluatePath)) {
    return evaluatePath;
  }
  return `${trimmedBase}${evaluatePath.startsWith('/') ? evaluatePath : `/${evaluatePath}`}`;
}

function createOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'fb-loading';
  overlay.style.cssText = [
    'position:absolute',
    'top:0',
    'left:0',
    'right:0',
    'bottom:0',
    'background:rgba(255,255,255,0.8)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'z-index:1000',
  ].join(';');

  const spinner = document.createElement('div');
  spinner.style.cssText = [
    'border:4px solid #f3f4f6',
    'border-top:4px solid #3b82f6',
    'border-radius:50%',
    'width:40px',
    'height:40px',
    'animation:fb-spin 1s linear infinite',
  ].join(';');

  overlay.appendChild(spinner);

  if (!document.getElementById('fb-styles')) {
    const style = document.createElement('style');
    style.id = 'fb-styles';
    style.textContent =
      '@keyframes fb-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  return overlay;
}

type ModalTone = 'info' | 'warning' | 'error';

interface ModalOptions {
  title: string;
  message: string;
  type: ModalTone;
  subtitle?: string;
  note?: string;
  reasons?: string[];
  submissionId?: string;
  primaryActionLabel?: string;
  primaryAction?: () => void;
}

let modalStylesInjected = false;

function ensureModalStyles(): void {
  if (modalStylesInjected || typeof document === 'undefined') {
    return;
  }

  const style = document.createElement('style');
  style.id = 'fb-modal-styles';
  style.textContent = `
.fb-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 10000;
  backdrop-filter: blur(2px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fb-modal-overlay.fb-modal-hide {
  opacity: 0;
  transform: translateY(8px);
}
.fb-modal-window {
  width: min(480px, calc(100% - 32px));
  background: #ffffff;
  color: #0f172a;
  border-radius: 16px;
  padding: 28px 28px 24px;
  position: relative;
  box-shadow: 0 35px 65px rgba(15, 23, 42, 0.35);
  font-family: 'Inter', 'Noto Sans JP', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}
.fb-modal-hero {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 18px;
}
.fb-modal-hero.fb-error {
  background: rgba(239, 68, 68, 0.15);
  color: #b91c1c;
}
.fb-modal-hero.fb-warning {
  background: rgba(245, 158, 11, 0.15);
  color: #92400e;
}
.fb-modal-hero.fb-info {
  background: rgba(14, 165, 233, 0.15);
  color: #0369a1;
}
.fb-modal-window.fb-error {
  border-top: 4px solid #ef4444;
}
.fb-modal-window.fb-warning {
  border-top: 4px solid #f59e0b;
}
.fb-modal-window.fb-info {
  border-top: 4px solid #0ea5e9;
}
.fb-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  border: none;
  background: transparent;
  font-size: 1.4rem;
  color: #94a3b8;
  cursor: pointer;
}
.fb-modal-title {
  margin: 0 0 12px;
  font-size: 1.4rem;
  font-weight: 700;
}
.fb-modal-subtitle {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.5;
}
.fb-modal-message {
  margin: 0;
  line-height: 1.6;
  color: #1f2937;
}
.fb-modal-note {
  margin-top: 18px;
  font-size: 0.9rem;
  color: #475569;
  background: rgba(148, 163, 184, 0.15);
  border-radius: 12px;
  padding: 12px 14px;
}
.fb-reason-list {
  margin: 16px 0 0;
  padding-left: 20px;
  color: #475569;
}
.fb-reason-list li {
  margin-bottom: 4px;
}
.fb-submission-id {
  margin-top: 18px;
  font-size: 0.9rem;
  color: #64748b;
  word-break: break-all;
}
.fb-modal-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.fb-modal-btn {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}
.fb-modal-btn.fb-secondary {
  background: #e2e8f0;
  color: #0f172a;
}
.fb-modal-btn.fb-primary {
  background: #111827;
  color: #ffffff;
}
@media (prefers-color-scheme: dark) {
  .fb-modal-window {
    background: #0f172a;
    color: #e2e8f0;
    box-shadow: 0 35px 65px rgba(0, 0, 0, 0.65);
  }
  .fb-modal-message {
    color: #e2e8f0;
  }
  .fb-reason-list {
    color: #cbd5f5;
  }
  .fb-submission-id {
    color: #94a3b8;
  }
  .fb-modal-btn.fb-secondary {
    background: #1e293b;
    color: #e2e8f0;
  }
  .fb-modal-btn.fb-primary {
    background: #22d3ee;
    color: #0f172a;
  }
  .fb-modal-subtitle,
  .fb-modal-note {
    color: #cbd5f5;
    background: rgba(51, 65, 85, 0.6);
  }
}
`;

  document.head.appendChild(style);
  modalStylesInjected = true;
}

function getHeroSymbol(type: ModalTone): string {
  switch (type) {
    case 'error':
      return '!';
    case 'warning':
      return '?';
    default:
      return 'ℹ︎';
  }
}

function showDecisionModal(options: ModalOptions): void {
  if (typeof document === 'undefined') {
    return;
  }

  ensureModalStyles();

  const overlay = document.createElement('div');
  overlay.className = 'fb-modal-overlay';

  const modal = document.createElement('div');
  modal.className = `fb-modal-window fb-${options.type}`;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', options.title);

  const hero = document.createElement('div');
  hero.className = `fb-modal-hero fb-${options.type}`;
  hero.setAttribute('aria-hidden', 'true');
  hero.textContent = getHeroSymbol(options.type);

  const closeModal = () => {
    overlay.classList.add('fb-modal-hide');
    window.setTimeout(() => {
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
    }, 180);
  };

  const closeButton = document.createElement('button');
  closeButton.className = 'fb-modal-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '閉じる');
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', closeModal);

  const title = document.createElement('h2');
  title.className = 'fb-modal-title';
  title.textContent = options.title;

  const subtitle = options.subtitle
    ? (() => {
        const element = document.createElement('p');
        element.className = 'fb-modal-subtitle';
        element.textContent = options.subtitle;
        return element;
      })()
    : null;

  const message = document.createElement('p');
  message.className = 'fb-modal-message';
  message.textContent = options.message;

  modal.appendChild(closeButton);
  modal.appendChild(hero);
  modal.appendChild(title);
  if (subtitle) {
    modal.appendChild(subtitle);
  }
  modal.appendChild(message);

  if (options.reasons && options.reasons.length > 0) {
    const list = document.createElement('ul');
    list.className = 'fb-reason-list';
    options.reasons.forEach((reason) => {
      const item = document.createElement('li');
      item.textContent = reason;
      list.appendChild(item);
    });
    modal.appendChild(list);
  }

  if (options.note) {
    const note = document.createElement('p');
    note.className = 'fb-modal-note';
    note.textContent = options.note;
    modal.appendChild(note);
  }

  if (options.submissionId) {
    const submission = document.createElement('p');
    submission.className = 'fb-submission-id';
    submission.textContent = `受付ID: ${options.submissionId}`;
    modal.appendChild(submission);
  }

  const actions = document.createElement('div');
  actions.className = 'fb-modal-actions';

  if (options.primaryAction && options.primaryActionLabel) {
    const primaryButton = document.createElement('button');
    primaryButton.className = 'fb-modal-btn fb-primary';
    primaryButton.type = 'button';
    primaryButton.textContent = options.primaryActionLabel;
    primaryButton.addEventListener('click', () => {
      options.primaryAction?.();
      closeModal();
    });
    actions.appendChild(primaryButton);
  }

  const dismissButton = document.createElement('button');
  dismissButton.className = 'fb-modal-btn fb-secondary';
  dismissButton.type = 'button';
  dismissButton.textContent = '閉じる';
  dismissButton.addEventListener('click', closeModal);
  actions.appendChild(dismissButton);

  modal.appendChild(actions);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  document.body.appendChild(overlay);
}

function showBlockModal(result: EvaluateSuccessResponse): void {
  const message =
    result.message || '営業目的または不正な送信と判定されたため、送信をブロックしました。';

  showDecisionModal({
    title: '送信がブロックされました',
    subtitle: '申し訳ありませんが、この送信内容は営業目的またはスパムの可能性が高いため送信できませんでした。',
    message,
    type: 'error',
    reasons: result.reasons,
    submissionId: result.submission_id,
    note:
      '心当たりがない場合は、入力内容を見直すか別の連絡手段でお問い合わせください。再送時は URL や営業キーワードが含まれていないかをご確認ください。',
  });
}

function showBanner(message: string, type: 'info' | 'error'): void {
  const div = document.createElement('div');
  div.className = `fb-message fb-${type}`;
  div.textContent = message;
  div.style.cssText = [
    'position:fixed',
    'top:20px',
    'left:50%',
    'transform:translateX(-50%)',
    'padding:16px 24px',
    'border-radius:8px',
    `background:${type === 'error' ? '#ef4444' : '#3b82f6'}`,
    'color:white',
    'box-shadow:0 4px 6px rgba(0,0,0,0.1)',
    'z-index:10000',
    'font-family:sans-serif',
  ].join(';');

  document.body.appendChild(div);

  setTimeout(() => {
    div.style.transition = 'opacity 0.3s';
    div.style.opacity = '0';
    setTimeout(() => {
      if (div.parentElement) {
        div.parentElement.removeChild(div);
      }
    }, 300);
  }, 3000);
}

class FormBlockerCore {
  private config: InternalConfig | null = null;
  private contexts = new Map<HTMLFormElement, FormContext>();

  init(options: FormBlockerInitOptions): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (!options || !options.apiKey) {
      console.error('[FormBlocker] apiKey is required');
      return;
    }

    this.destroy();

    const normalizeKeywords = (keywords: string[]) => keywords.map((kw) => kw.toLowerCase());

    this.config = {
      apiKey: options.apiKey,
      evaluateUrl: resolveEvaluateUrl(options),
      selector: options.selector || 'form',
      debug: Boolean(options.debug),
      previewMode: Boolean(options.previewMode),
      salesKeywords: options.debugRules?.salesKeywords?.length
        ? normalizeKeywords(options.debugRules.salesKeywords)
        : normalizeKeywords(DEFAULT_SALES_KEYWORDS),
      bannedKeywords: options.debugRules?.bannedKeywords?.length
        ? normalizeKeywords(options.debugRules.bannedKeywords)
        : normalizeKeywords(DEFAULT_BANNED_KEYWORDS),
      blockedDomains: options.debugRules?.blockedDomains?.length
        ? options.debugRules.blockedDomains.map(normalizeDomain)
        : [],
      onAllow: options.onAllow,
      onBlock: options.onBlock,
      onChallenge: options.onChallenge,
      onHold: options.onHold,
      onError: options.onError,
      onDetectionUpdate: options.onDetectionUpdate,
    };

    this.log('Initialized with config', this.config);
    this.attachToForms();
  }

  refresh(): void {
    if (!this.config) {
      this.log('Refresh skipped: config not initialized');
      return;
    }
    this.attachToForms();
  }

  destroy(): void {
    this.contexts.forEach((context, form) => {
      form.removeAttribute('data-fb-attached');
      form.removeEventListener('submit', context.submitHandler, true);
      context.pasteHandlers.forEach(({ element, handler }) => {
        element.removeEventListener('paste', handler);
      });
      context.inputHandlers.forEach(({ element, handler }) => {
        element.removeEventListener('input', handler);
      });
    });
    this.contexts.clear();
  }

  private attachToForms(): void {
    if (!this.config) {
      return;
    }

    const forms = document.querySelectorAll<HTMLFormElement>(this.config.selector);
    forms.forEach((form) => {
      if (this.contexts.has(form)) {
        return;
      }
      this.attachToForm(form);
    });
  }

  private attachToForm(form: HTMLFormElement): void {
    if (!this.config) {
      return;
    }

    const behavioral: BehavioralSnapshot = {
      pasteDetected: false,
      timeToSubmit: null,
      pageLoadTime: Date.now(),
    };

    const submitHandler = (event: Event) => {
      this.handleSubmit(event as SubmitEvent, form, behavioral).catch((error) => {
        this.log('Submission handling failed', error);
      });
    };

    const pasteHandlers: Array<{ element: Element; handler: EventListener }> = [];
    const inputHandlers: Array<{ element: Element; handler: EventListener }> = [];
    const inputElements = form.querySelectorAll('input, textarea');
    inputElements.forEach((element) => {
      const handler = () => {
        behavioral.pasteDetected = true;
        this.log('Paste detected for form', form);
        this.emitDetectionUpdate(form, behavioral);
      };
      element.addEventListener('paste', handler);
      pasteHandlers.push({ element, handler });
    });

    inputElements.forEach((element) => {
      const handler = () => {
        this.emitDetectionUpdate(form, behavioral);
      };
      element.addEventListener('input', handler);
      inputHandlers.push({ element, handler });
    });

    form.addEventListener('submit', submitHandler, true);
    form.setAttribute('data-fb-attached', 'true');

    this.emitDetectionUpdate(form, behavioral);

    this.contexts.set(form, {
      originalSubmit: form.onsubmit,
      submitHandler,
      pasteHandlers,
      inputHandlers,
      behavioral,
    });

    this.log('Attached to form', form);
  }

  private async handleSubmit(
    event: SubmitEvent,
    form: HTMLFormElement,
    behavioral: BehavioralSnapshot
  ): Promise<void> {
    if (!this.config) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    behavioral.timeToSubmit = (Date.now() - behavioral.pageLoadTime) / 1000;

    this.showLoading(form);

    this.emitDetectionUpdate(form, behavioral);

    try {
      const payload = this.buildRequestBody(form, behavioral);
      this.log('Submitting payload', payload);

      const response = await fetch(this.config.evaluateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = (await response.json()) as EvaluateResponsePayload;
      this.log('Received response', result);

      if (!result.success) {
        const message = result.error?.message || 'エラーが発生しました。後ほど再度お試しください。';
        showBanner(message, 'error');
        this.config.onError?.(result);
        this.hideLoading(form);
        return;
      }

      this.handleDecision(result, form);
    } catch (error) {
      console.error('[FormBlocker] API error', error);
      this.config.onError?.(error);
      this.hideLoading(form);
      this.allowSubmission(form);
    }
  }

  private buildRequestBody(form: HTMLFormElement, behavioral: BehavioralSnapshot) {
    const metadata = {
      url: typeof window !== 'undefined' ? window.location.href : '',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: Date.now(),
    };

    const behavioralData: Record<string, unknown> = {
      paste_detected: behavioral.pasteDetected,
    };

    if (typeof behavioral.timeToSubmit === 'number' && !Number.isNaN(behavioral.timeToSubmit)) {
      behavioralData.time_to_submit = behavioral.timeToSubmit;
    }

    return {
      api_key: this.config?.apiKey,
      form_data: this.extractFormData(form),
      metadata,
      behavioral_data: behavioralData,
    };
  }

  private extractFormData(form: HTMLFormElement): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    const elements = Array.from(form.elements) as Array<HTMLInputElement | HTMLTextAreaElement>;

    elements.forEach((element) => {
      if (!element.name) {
        return;
      }

      const type = (element as HTMLInputElement).type;
      if (type === 'checkbox') {
        const input = element as HTMLInputElement;
        if (!data[element.name]) {
          data[element.name] = [];
        }
        if (input.checked) {
          (data[element.name] as unknown[]).push(input.value);
        }
        return;
      }

      if (type === 'radio') {
        const input = element as HTMLInputElement;
        if (input.checked) {
          data[element.name] = input.value;
        } else if (!(element.name in data)) {
          data[element.name] = null;
        }
        return;
      }

      data[element.name] = element.value;
    });

    return data;
  }

  private handleDecision(result: EvaluateSuccessResponse, form: HTMLFormElement): void {
    switch (result.decision) {
      case 'allowed':
        this.allowSubmission(form);
        this.hideLoading(form);
        this.config?.onAllow?.(result);
        break;
      case 'challenged':
        this.hideLoading(form);
        this.handleChallenge(result, form);
        break;
      case 'held':
        this.hideLoading(form);
        showBanner(result.message, 'info');
        this.config?.onHold?.(result);
        break;
      case 'blocked':
        this.hideLoading(form);
        showBlockModal(result);
        this.config?.onBlock?.(result);
        break;
      default:
        this.hideLoading(form);
        this.allowSubmission(form);
    }
  }

  private handleChallenge(result: EvaluateSuccessResponse, form: HTMLFormElement): void {
    const allow = () => {
      this.allowSubmission(form);
      this.config?.onAllow?.(result);
    };

    if (this.config?.onChallenge) {
      this.config.onChallenge(result, allow);
      return;
    }

    const question =
      result.challenge?.question || 'この送信は営業目的ではありませんか？送信を続けますか？';
    const confirmed = window.confirm(`${question}\n\n「OK」を押すと送信されます。`);
    if (confirmed) {
      allow();
    }
  }

  private allowSubmission(form: HTMLFormElement): void {
    if (this.config?.previewMode) {
      return;
    }
    const context = this.contexts.get(form);
    if (context?.originalSubmit) {
      const event = new Event('submit', { bubbles: true, cancelable: true });
      context.originalSubmit.call(form, event as SubmitEvent);
    } else {
      form.submit();
    }
  }

  private showLoading(form: HTMLFormElement): void {
    if (!form.querySelector('.fb-loading')) {
      const overlay = createOverlay();
      const style = window.getComputedStyle(form);
      if (style.position === 'static' || !style.position) {
        form.style.position = 'relative';
      }
      form.appendChild(overlay);
    }
  }

  private hideLoading(form: HTMLFormElement): void {
    const overlay = form.querySelector('.fb-loading');
    if (overlay && overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
  }

  private log(message: string, payload?: unknown): void {
    if (!this.config?.debug) return;
    if (payload !== undefined) {
      console.log(`[FormBlocker ${FORM_BLOCKER_VERSION}] ${message}`, payload);
    } else {
      console.log(`[FormBlocker ${FORM_BLOCKER_VERSION}] ${message}`);
    }
  }

  private emitDetectionUpdate(form: HTMLFormElement, behavioral: BehavioralSnapshot): void {
    if (!this.config?.onDetectionUpdate) {
      return;
    }

    const context = this.contexts.get(form);
    const formData = this.extractFormData(form);
    const snapshot = this.analyzeDetection(formData, behavioral);

    context && (context.lastDetection = snapshot);

    this.config.onDetectionUpdate(snapshot);
  }

  private analyzeDetection(formData: Record<string, unknown>, behavioral: BehavioralSnapshot): DetectionSnapshot {
    const textFragments = Object.values(formData).map((value) => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.join(' ');
      return '';
    });

    const values = textFragments.join(' ').toLowerCase();

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const detectedUrls = values.match(urlRegex) || [];
    const schedulingUrls = detectedUrls.filter((url) => {
      const domain = extractHostname(url);
      if (!domain) return false;
      return DEFAULT_SCHEDULING_DOMAINS.some((target) => matchesDomain(domain, target));
    });

    const salesKeywords = this.config?.salesKeywords || DEFAULT_SALES_KEYWORDS;
    const bannedKeywords = this.config?.bannedKeywords || DEFAULT_BANNED_KEYWORDS;

    const detectedSales = salesKeywords.filter((kw) => kw && values.includes(kw.toLowerCase()));
    const detectedBanned = bannedKeywords.filter((kw) => kw && values.includes(kw.toLowerCase()));

    const emailDomains = collectEmailDomains(formData);
    const blockedDomainMatches: string[] = [];
    const configuredBlockedDomains = this.config?.blockedDomains || [];

    if (configuredBlockedDomains.length > 0) {
      const urlDomains = Array.from(
        new Set(
          detectedUrls
            .map((url) => extractHostname(url))
            .filter((domain): domain is string => Boolean(domain))
        )
      );
      const candidates = Array.from(new Set([...urlDomains, ...emailDomains])).map(normalizeDomain);
      candidates.forEach((domain) => {
        if (configuredBlockedDomains.some((blocked) => matchesDomain(domain, blocked))) {
          blockedDomainMatches.push(domain);
        }
      });
    }

    return {
      urlDetected: detectedUrls.length > 0,
      detectedUrls,
      schedulingUrls,
      salesKeywords: detectedSales,
      bannedKeywords: detectedBanned,
      blockedDomains: blockedDomainMatches,
      pasteDetected: behavioral.pasteDetected,
      contentLength: values.length,
      updatedAt: Date.now(),
    };
  }
}

const core = new FormBlockerCore();

const FormBlocker = {
  init(options: FormBlockerInitOptions): void {
    core.init(options);
  },
  refresh(): void {
    core.refresh();
  },
  destroy(): void {
    core.destroy();
  },
};

declare global {
  interface Window {
    FormBlocker?: typeof FormBlocker;
    FormBlockerAutoInit?: FormBlockerInitOptions;
  }
}

if (typeof window !== 'undefined') {
  window.FormBlocker = FormBlocker;
  (window as typeof window & { FormBlockerVersion?: string }).FormBlockerVersion = FORM_BLOCKER_VERSION;

  const autoInit = window.FormBlockerAutoInit;
  if (autoInit) {
    FormBlocker.init(autoInit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const pendingConfig = window.FormBlockerAutoInit;
      if (pendingConfig) {
        FormBlocker.init(pendingConfig);
      }
    });
  }
}

export default FormBlocker;
