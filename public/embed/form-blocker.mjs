const h = "2024-12-05-fixed-base", $ = "https://form-blocker.vercel.app", C = ["営業", "セールス", "提案", "御社", "貴社", "販売", "広告", "代理店"], L = ["無料", "限定", "販売促進", "広告代理店"], _ = [
  "calendly.com",
  "youcanbook.me",
  "scheduleonce.com",
  "acuityscheduling.com",
  "savvycal.com",
  "hubspot.com",
  "meetings.hubspot.com",
  "tidycal.com",
  "cal.com"
];
function S(i) {
  return i.trim().toLowerCase();
}
function F(i, e) {
  return i === e || i.endsWith(`.${e}`);
}
function A(i) {
  var e;
  try {
    return new URL(i).hostname.toLowerCase();
  } catch {
    const t = i.match(/https?:\/\/([^/\s]+)/i);
    return ((e = t == null ? void 0 : t[1]) == null ? void 0 : e.toLowerCase()) ?? null;
  }
}
function I(i) {
  const e = /* @__PURE__ */ new Set(), t = /[\w.+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  return Object.values(i).forEach((o) => {
    if (typeof o != "string")
      return;
    const n = o.matchAll(t);
    for (const s of n)
      s[1] && e.add(s[1].toLowerCase());
  }), Array.from(e);
}
function N(i) {
  var s;
  const e = (s = i.apiBaseUrl) == null ? void 0 : s.trim(), o = (e && e.length ? e : $).replace(/\/+$/, ""), n = (i.evaluatePath || "/api/v1/evaluate").trim() || "/api/v1/evaluate";
  return /^https?:\/\//i.test(n) ? n : `${o}${n.startsWith("/") ? n : `/${n}`}`;
}
function O() {
  const i = document.createElement("div");
  i.className = "fb-loading", i.style.cssText = [
    "position:absolute",
    "top:0",
    "left:0",
    "right:0",
    "bottom:0",
    "background:rgba(255,255,255,0.8)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "z-index:1000"
  ].join(";");
  const e = document.createElement("div");
  if (e.style.cssText = [
    "border:4px solid #f3f4f6",
    "border-top:4px solid #3b82f6",
    "border-radius:50%",
    "width:40px",
    "height:40px",
    "animation:fb-spin 1s linear infinite"
  ].join(";"), i.appendChild(e), !document.getElementById("fb-styles")) {
    const t = document.createElement("style");
    t.id = "fb-styles", t.textContent = "@keyframes fb-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }", document.head.appendChild(t);
  }
  return i;
}
let B = !1, w = null;
function U() {
  if (B || typeof document > "u")
    return;
  const i = document.createElement("style");
  i.id = "fb-modal-styles", i.textContent = `
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
  border-radius: 18px;
  padding: 30px 30px 26px;
  position: relative;
  box-shadow: 0 35px 65px rgba(15, 23, 42, 0.35);
  font-family: 'Inter', 'Noto Sans JP', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  user-select: text;
}
.fb-modal-hero {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.95rem;
  font-weight: 700;
  margin-bottom: 18px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(248, 113, 113, 0.18));
}
.fb-modal-hero.fb-error {
  color: #b91c1c;
}
.fb-modal-hero.fb-warning {
  color: #92400e;
}
.fb-modal-hero.fb-info {
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
  margin: 0 0 14px;
  font-size: 0.97rem;
  color: #475569;
  line-height: 1.6;
}
.fb-modal-message {
  margin: 0;
  line-height: 1.7;
  color: #0f172a;
}
.fb-modal-note {
  margin-top: 18px;
  font-size: 0.9rem;
  color: #475569;
  background: rgba(148, 163, 184, 0.15);
  border-radius: 12px;
  padding: 12px 14px;
}
.fb-reason-section {
  margin-top: 18px;
}
.fb-reason-label {
  margin: 0 0 10px;
  font-size: 0.95rem;
  color: #475569;
  font-weight: 600;
}
.fb-reason-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.fb-reason-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.9);
  border: 1px solid rgba(96, 165, 250, 0.5);
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.2;
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
  user-select: none;
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
  .fb-reason-chip {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(125, 211, 252, 0.45);
    color: #e2e8f0;
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
`, document.head.appendChild(i), B = !0;
}
function z(i) {
  switch (i) {
    case "error":
      return "!";
    case "warning":
      return "?";
    default:
      return "ℹ︎";
  }
}
function K(i) {
  const e = {
    url_detected: "URL を検知",
    scheduling_url: "日程調整リンクを検知",
    sales_keywords: "営業キーワードを検知",
    banned_keywords: "禁止キーワードを検知",
    paste_detected: "ペースト入力を検知",
    blocked_domain: "ブロック済みドメイン",
    disposable_email: "使い捨てメールドメイン",
    high_spam_score: "スパムスコアが高い",
    high_sales_score: "営業スコアが高い",
    self_report_required: "自己申告が必要"
  };
  if (e[i])
    return e[i];
  const t = i.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim().replace(/\s+/g, " ");
  return t ? t[0].toUpperCase() + t.slice(1) : "不明な理由";
}
function R(i) {
  if (typeof document > "u")
    return;
  U(), w && w();
  const e = document.createElement("div");
  e.className = "fb-modal-overlay";
  const t = (a) => {
    (a.key === "Escape" || a.key === "Esc") && s();
  }, o = document.createElement("div");
  o.className = `fb-modal-window fb-${i.type}`, o.setAttribute("role", "dialog"), o.setAttribute("aria-modal", "true"), o.setAttribute("aria-label", i.title);
  const n = document.createElement("div");
  n.className = `fb-modal-hero fb-${i.type}`, n.setAttribute("aria-hidden", "true"), n.textContent = z(i.type);
  const s = () => {
    e.classList.add("fb-modal-hide"), document.removeEventListener("keydown", t), window.setTimeout(() => {
      e.parentElement && e.parentElement.removeChild(e), w === s && (w = null);
    }, 180);
  };
  w = s;
  const r = document.createElement("button");
  r.className = "fb-modal-close", r.type = "button", r.setAttribute("aria-label", "閉じる"), r.innerHTML = "&times;", r.addEventListener("click", s);
  const c = document.createElement("h2");
  c.className = "fb-modal-title", c.textContent = i.title;
  const l = i.subtitle ? (() => {
    const a = document.createElement("p");
    return a.className = "fb-modal-subtitle", a.textContent = i.subtitle, a;
  })() : null, d = document.createElement("p");
  if (d.className = "fb-modal-message", d.textContent = i.message, o.appendChild(r), o.appendChild(n), o.appendChild(c), l && o.appendChild(l), o.appendChild(d), i.reasons && i.reasons.length > 0) {
    const a = document.createElement("div");
    a.className = "fb-reason-section";
    const b = document.createElement("p");
    b.className = "fb-reason-label", b.textContent = "検知された要因", a.appendChild(b);
    const g = document.createElement("div");
    g.className = "fb-reason-chips", i.reasons.forEach((v) => {
      const y = document.createElement("span");
      y.className = "fb-reason-chip", y.textContent = K(v), g.appendChild(y);
    }), a.appendChild(g), o.appendChild(a);
  }
  if (i.note) {
    const a = document.createElement("p");
    a.className = "fb-modal-note", a.textContent = i.note, o.appendChild(a);
  }
  if (i.submissionId) {
    const a = document.createElement("p");
    a.className = "fb-submission-id", a.textContent = `受付ID: ${i.submissionId}`, o.appendChild(a);
  }
  const u = document.createElement("div");
  if (u.className = "fb-modal-actions", i.primaryAction && i.primaryActionLabel) {
    const a = document.createElement("button");
    a.className = "fb-modal-btn fb-primary", a.type = "button", a.textContent = i.primaryActionLabel, a.addEventListener("click", () => {
      var b;
      (b = i.primaryAction) == null || b.call(i), s();
    }), u.appendChild(a);
  }
  const f = document.createElement("button");
  f.className = "fb-modal-btn fb-secondary", f.type = "button", f.textContent = "閉じる", f.addEventListener("click", s), u.appendChild(f), o.appendChild(u), e.appendChild(o), e.addEventListener("click", (a) => {
    a.target === e && s();
  }), document.addEventListener("keydown", t), document.body.appendChild(e);
}
function q(i) {
  const e = i.message || "営業目的または不正な送信と判定されたため、送信をブロックしました。";
  R({
    title: "送信がブロックされました",
    subtitle: "申し訳ありませんが、この送信内容は営業目的またはスパムの可能性が高いため送信できませんでした。",
    message: e,
    type: "error",
    reasons: i.reasons,
    submissionId: i.submission_id,
    note: "心当たりがない場合は、入力内容を見直すか別の連絡手段でお問い合わせください。再送時は URL や営業キーワードが含まれていないかをご確認ください。"
  });
}
function T(i, e) {
  const t = document.createElement("div");
  t.className = `fb-message fb-${e}`, t.textContent = i, t.style.cssText = [
    "position:fixed",
    "top:20px",
    "left:50%",
    "transform:translateX(-50%)",
    "padding:16px 24px",
    "border-radius:8px",
    `background:${e === "error" ? "#ef4444" : "#3b82f6"}`,
    "color:white",
    "box-shadow:0 4px 6px rgba(0,0,0,0.1)",
    "z-index:10000",
    "font-family:sans-serif"
  ].join(";"), document.body.appendChild(t), setTimeout(() => {
    t.style.transition = "opacity 0.3s", t.style.opacity = "0", setTimeout(() => {
      t.parentElement && t.parentElement.removeChild(t);
    }, 300);
  }, 3e3);
}
class H {
  constructor() {
    this.config = null, this.contexts = /* @__PURE__ */ new Map(), this.mutationObserver = null, this.pendingAttachScan = !1, this.discoveryInterval = null, this.discoveryTimeoutTimer = null, this.lastFoundFormsCount = -1;
  }
  init(e) {
    var o, n, s, r, c, l;
    if (typeof window > "u" || typeof document > "u")
      return;
    if (!e || !e.apiKey) {
      console.error("[FormBlocker] apiKey is required");
      return;
    }
    this.destroy();
    const t = (d) => d.map((u) => u.toLowerCase());
    this.config = {
      apiKey: e.apiKey,
      evaluateUrl: N(e),
      selector: e.selector || "form",
      debug: !!e.debug,
      previewMode: !!e.previewMode,
      salesKeywords: (n = (o = e.debugRules) == null ? void 0 : o.salesKeywords) != null && n.length ? t(e.debugRules.salesKeywords) : t(C),
      bannedKeywords: (r = (s = e.debugRules) == null ? void 0 : s.bannedKeywords) != null && r.length ? t(e.debugRules.bannedKeywords) : t(L),
      blockedDomains: (l = (c = e.debugRules) == null ? void 0 : c.blockedDomains) != null && l.length ? e.debugRules.blockedDomains.map(S) : [],
      observeMutations: e.observeMutations !== !1,
      discoveryIntervalMs: typeof e.discoveryIntervalMs == "number" && e.discoveryIntervalMs > 0 ? e.discoveryIntervalMs : 1500,
      discoveryTimeoutMs: typeof e.discoveryTimeoutMs == "number" && e.discoveryTimeoutMs > 0 ? e.discoveryTimeoutMs : 2e4,
      onAllow: e.onAllow,
      onBlock: e.onBlock,
      onChallenge: e.onChallenge,
      onHold: e.onHold,
      onError: e.onError,
      onDetectionUpdate: e.onDetectionUpdate
    }, this.log("Initialized with config", this.config), console.info(
      `[FormBlocker ${h}] Initialized (selector: "${this.config.selector}", evaluateUrl: "${this.config.evaluateUrl}", previewMode: ${this.config.previewMode})`
    ), this.attachToForms(), this.startMutationObserver(), this.startDiscoveryLoop();
  }
  refresh() {
    if (!this.config) {
      this.log("Refresh skipped: config not initialized");
      return;
    }
    this.attachToForms();
  }
  destroy() {
    this.stopMutationObserver(), this.stopDiscoveryLoop(), this.contexts.forEach((e, t) => {
      t.removeAttribute("data-fb-attached"), t.removeEventListener("submit", e.submitHandler, !0), e.pasteHandlers.forEach(({ element: o, handler: n }) => {
        o.removeEventListener("paste", n);
      }), e.inputHandlers.forEach(({ element: o, handler: n }) => {
        o.removeEventListener("input", n);
      });
    }), this.contexts.clear(), this.lastFoundFormsCount = -1;
  }
  attachToForms() {
    if (!this.config)
      return;
    console.info(
      `[FormBlocker ${h}] Scanning forms (selector: "${this.config.selector}")`
    ), this.contexts.forEach((t, o) => {
      document.body.contains(o) || (o.removeEventListener("submit", t.submitHandler, !0), t.pasteHandlers.forEach(({ element: n, handler: s }) => {
        n.removeEventListener("paste", s);
      }), t.inputHandlers.forEach(({ element: n, handler: s }) => {
        n.removeEventListener("input", s);
      }), this.contexts.delete(o));
    });
    const e = document.querySelectorAll(this.config.selector);
    this.log("Searching forms with selector", {
      selector: this.config.selector,
      found: e.length
    }), e.length === 0 ? this.lastFoundFormsCount !== 0 && console.warn(
      `[FormBlocker ${h}] No forms matched selector ${this.config.selector}`
    ) : e.length !== this.lastFoundFormsCount && console.info(
      `[FormBlocker ${h}] Found ${e.length} form(s) for selector "${this.config.selector}"`
    ), this.lastFoundFormsCount = e.length, e.forEach((t) => {
      this.contexts.has(t) || this.attachToForm(t);
    });
  }
  startMutationObserver() {
    var e;
    if (!((e = this.config) != null && e.observeMutations)) {
      this.log("Mutation observer disabled via config");
      return;
    }
    if (typeof MutationObserver > "u" || typeof document > "u") {
      this.log("MutationObserver not available in this environment");
      return;
    }
    this.mutationObserver && this.mutationObserver.disconnect(), this.mutationObserver = new MutationObserver((t) => {
      let o = !1;
      for (const n of t)
        if (n.type === "childList" && n.addedNodes.length > 0) {
          o = !0;
          break;
        }
      o && (console.info(`[FormBlocker ${h}] DOM mutation detected, rescanning forms`), this.scheduleAttachScan());
    }), this.mutationObserver.observe(document.body, { childList: !0, subtree: !0 }), console.info(`[FormBlocker ${h}] Watching DOM for newly added forms`);
  }
  stopMutationObserver() {
    this.mutationObserver && (this.mutationObserver.disconnect(), this.mutationObserver = null), this.pendingAttachScan = !1;
  }
  startDiscoveryLoop() {
    if (!this.config) return;
    const e = this.config.discoveryIntervalMs;
    if (!(e > 0)) {
      this.log("Discovery loop disabled (interval <= 0)");
      return;
    }
    this.stopDiscoveryLoop();
    const t = () => this.attachToForms();
    this.discoveryInterval = window.setInterval(t, e);
    const o = this.config.discoveryTimeoutMs;
    o && o > 0 && (this.discoveryTimeoutTimer = window.setTimeout(() => {
      this.stopDiscoveryLoop(), this.log("Discovery loop stopped after timeout");
    }, o)), console.info(
      `[FormBlocker ${h}] Discovery loop started (interval: ${e}ms${o && o > 0 ? `, timeout: ${o}ms` : ""})`
    );
  }
  stopDiscoveryLoop() {
    this.discoveryInterval && (window.clearInterval(this.discoveryInterval), this.discoveryInterval = null), this.discoveryTimeoutTimer && (window.clearTimeout(this.discoveryTimeoutTimer), this.discoveryTimeoutTimer = null);
  }
  scheduleAttachScan() {
    if (this.pendingAttachScan) return;
    this.pendingAttachScan = !0, (typeof window < "u" && window.requestAnimationFrame ? window.requestAnimationFrame : (t) => setTimeout(t, 16))(() => {
      this.pendingAttachScan = !1, this.attachToForms();
    });
  }
  attachToForm(e) {
    if (!this.config)
      return;
    const t = {
      pasteDetected: !1,
      timeToSubmit: null,
      pageLoadTime: Date.now()
    }, o = (c) => {
      this.handleSubmit(c, e, t).catch((l) => {
        this.log("Submission handling failed", l);
      });
    }, n = [], s = [], r = e.querySelectorAll("input, textarea");
    r.forEach((c) => {
      const l = () => {
        t.pasteDetected = !0, this.log("Paste detected for form", e), this.emitDetectionUpdate(e, t);
      };
      c.addEventListener("paste", l), n.push({ element: c, handler: l });
    }), r.forEach((c) => {
      const l = () => {
        this.emitDetectionUpdate(e, t);
      };
      c.addEventListener("input", l), s.push({ element: c, handler: l });
    }), e.addEventListener("submit", o, !0), e.setAttribute("data-fb-attached", "true"), this.emitDetectionUpdate(e, t), this.contexts.set(e, {
      originalSubmit: e.onsubmit,
      submitHandler: o,
      pasteHandlers: n,
      inputHandlers: s,
      behavioral: t
    }), this.log("Attached to form", e), console.info(
      `[FormBlocker ${h}] Attached to form (selector: "${this.config.selector}")`,
      e
    );
  }
  async handleSubmit(e, t, o) {
    var n, s, r, c, l;
    if (this.config) {
      e.preventDefault(), e.stopPropagation(), this.log("Intercepted submit", { selector: this.config.selector }), o.timeToSubmit = (Date.now() - o.pageLoadTime) / 1e3, this.showLoading(t), this.emitDetectionUpdate(t, o);
      try {
        const d = this.buildRequestBody(t, o);
        this.log("Submitting payload", d);
        const u = await fetch(this.config.evaluateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(d)
        });
        if (!u.ok)
          throw new Error(`API request failed with status ${u.status}`);
        const f = await u.json();
        if (this.log("Received response", f), !f.success) {
          const a = ((n = f.error) == null ? void 0 : n.message) || "エラーが発生しました。後ほど再度お試しください。";
          T(a, "error"), (r = (s = this.config).onError) == null || r.call(s, f), this.hideLoading(t);
          return;
        }
        this.handleDecision(f, t);
      } catch (d) {
        console.error("[FormBlocker] API error", d), (l = (c = this.config).onError) == null || l.call(c, d), this.hideLoading(t), this.allowSubmission(t);
      }
    }
  }
  buildRequestBody(e, t) {
    var s;
    const o = {
      url: typeof window < "u" ? window.location.href : "",
      user_agent: typeof navigator < "u" ? navigator.userAgent : "",
      timestamp: Date.now()
    }, n = {
      paste_detected: t.pasteDetected
    };
    return typeof t.timeToSubmit == "number" && !Number.isNaN(t.timeToSubmit) && (n.time_to_submit = t.timeToSubmit), {
      api_key: (s = this.config) == null ? void 0 : s.apiKey,
      form_data: this.extractFormData(e),
      metadata: o,
      behavioral_data: n
    };
  }
  extractFormData(e) {
    const t = {};
    return Array.from(e.elements).forEach((n) => {
      if (!n.name)
        return;
      const s = n.type;
      if (s === "checkbox") {
        const r = n;
        t[n.name] || (t[n.name] = []), r.checked && t[n.name].push(r.value);
        return;
      }
      if (s === "radio") {
        const r = n;
        r.checked ? t[n.name] = r.value : n.name in t || (t[n.name] = null);
        return;
      }
      t[n.name] = n.value;
    }), t;
  }
  handleDecision(e, t) {
    var o, n, s, r, c, l;
    switch (this.log("Handling decision", {
      decision: e.decision,
      scores: e.scores,
      reasons: e.reasons,
      challenge: e.challenge,
      submissionId: e.submission_id
    }), e.decision) {
      case "allowed":
        this.allowSubmission(t), this.hideLoading(t), (n = (o = this.config) == null ? void 0 : o.onAllow) == null || n.call(o, e);
        break;
      case "challenged":
        this.hideLoading(t), this.handleChallenge(e, t);
        break;
      case "held":
        this.hideLoading(t), T(e.message, "info"), (r = (s = this.config) == null ? void 0 : s.onHold) == null || r.call(s, e);
        break;
      case "blocked":
        this.hideLoading(t), q(e), (l = (c = this.config) == null ? void 0 : c.onBlock) == null || l.call(c, e);
        break;
      default:
        this.hideLoading(t), this.allowSubmission(t);
    }
  }
  handleChallenge(e, t) {
    var r, c, l;
    this.log("Challenge presented", {
      question: (r = e.challenge) == null ? void 0 : r.question,
      submissionId: e.submission_id
    });
    const o = () => {
      var d, u;
      this.allowSubmission(t), (u = (d = this.config) == null ? void 0 : d.onAllow) == null || u.call(d, e);
    };
    if ((c = this.config) != null && c.onChallenge) {
      this.config.onChallenge(e, o);
      return;
    }
    const n = ((l = e.challenge) == null ? void 0 : l.question) || "この送信は営業目的ではありませんか？送信を続けますか？";
    window.confirm(`${n}

「OK」を押すと送信されます。`) && o();
  }
  allowSubmission(e) {
    var n;
    if ((n = this.config) != null && n.previewMode) {
      this.log("Preview mode enabled: submission prevented");
      return;
    }
    const t = this.contexts.get(e), o = t == null ? void 0 : t.submitHandler;
    o && e.removeEventListener("submit", o, !0);
    try {
      if (typeof e.requestSubmit == "function") {
        this.log("Allowing submission via requestSubmit"), e.requestSubmit();
        return;
      }
      this.log("Allowing submission via dispatched submit event");
      const s = typeof SubmitEvent < "u" ? new SubmitEvent("submit", { bubbles: !0, cancelable: !0 }) : new Event("submit", { bubbles: !0, cancelable: !0 });
      e.dispatchEvent(s) ? e.submit() : this.log("Submit event was cancelled by page script");
    } finally {
      o && e.addEventListener("submit", o, !0);
    }
  }
  showLoading(e) {
    if (!e.querySelector(".fb-loading")) {
      const t = O(), o = window.getComputedStyle(e);
      (o.position === "static" || !o.position) && (e.style.position = "relative"), e.appendChild(t);
    }
  }
  hideLoading(e) {
    const t = e.querySelector(".fb-loading");
    t && t.parentElement && t.parentElement.removeChild(t);
  }
  isDebugEnabled() {
    var s;
    if ((s = this.config) != null && s.debug) return !0;
    if (typeof window > "u") return !1;
    const e = window.FormBlockerDebug === !0, t = localStorage.getItem("formblocker:debug") === "true", o = new URLSearchParams(window.location.search), n = o.get("fb_debug") === "1" || o.get("formblocker_debug") === "1";
    return e || t || n;
  }
  log(e, t) {
    this.isDebugEnabled() && (t !== void 0 ? console.log(`[FormBlocker ${h}] ${e}`, t) : console.log(`[FormBlocker ${h}] ${e}`));
  }
  emitDetectionUpdate(e, t) {
    var r, c;
    const o = this.contexts.get(e), n = this.extractFormData(e), s = this.analyzeDetection(n, t);
    o && (o.lastDetection = s), this.log("Detection snapshot", s), (c = (r = this.config) == null ? void 0 : r.onDetectionUpdate) == null || c.call(r, s);
  }
  analyzeDetection(e, t) {
    var v, y, D;
    const n = Object.values(e).map((m) => typeof m == "string" ? m : Array.isArray(m) ? m.join(" ") : "").join(" ").toLowerCase(), s = /(https?:\/\/[^\s]+)/gi, r = n.match(s) || [], c = r.filter((m) => {
      const x = A(m);
      return x ? _.some((p) => F(x, p)) : !1;
    }), l = ((v = this.config) == null ? void 0 : v.salesKeywords) || C, d = ((y = this.config) == null ? void 0 : y.bannedKeywords) || L, u = l.filter((m) => m && n.includes(m.toLowerCase())), f = d.filter((m) => m && n.includes(m.toLowerCase())), a = I(e), b = [], g = ((D = this.config) == null ? void 0 : D.blockedDomains) || [];
    if (g.length > 0) {
      const m = Array.from(
        new Set(
          r.map((p) => A(p)).filter((p) => !!p)
        )
      );
      Array.from(/* @__PURE__ */ new Set([...m, ...a])).map(S).forEach((p) => {
        g.some((M) => F(p, M)) && b.push(p);
      });
    }
    return {
      urlDetected: r.length > 0,
      detectedUrls: r,
      schedulingUrls: c,
      salesKeywords: u,
      bannedKeywords: f,
      blockedDomains: b,
      pasteDetected: t.pasteDetected,
      contentLength: n.length,
      updatedAt: Date.now()
    };
  }
}
const E = new H(), k = {
  init(i) {
    if (typeof window < "u") {
      const e = localStorage.getItem("formblocker:debug"), t = window.FormBlockerDebug === !0, o = new URLSearchParams(window.location.search), n = o.get("fb_debug") === "1" || o.get("formblocker_debug") === "1";
      (e === "true" || t || n) && (i = { ...i, debug: !0 });
    }
    E.init(i), console.info(
      `[FormBlocker ${h}] init called`,
      {
        selector: i.selector || "form",
        debug: i.debug,
        previewMode: i.previewMode
      }
    );
  },
  refresh() {
    E.refresh();
  },
  destroy() {
    E.destroy();
  }
};
if (typeof window < "u") {
  console.info(`[FormBlocker ${h}] Script loaded`), window.FormBlocker = k, window.FormBlockerVersion = h;
  const i = window.FormBlockerAutoInit;
  i && k.init(i), document.readyState === "loading" && document.addEventListener("DOMContentLoaded", () => {
    const e = window.FormBlockerAutoInit;
    e && k.init(e);
  });
}
export {
  k as default
};
//# sourceMappingURL=form-blocker.mjs.map
