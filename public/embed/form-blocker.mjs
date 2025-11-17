const f = "2024-11-28-api-base", S = ["営業", "セールス", "提案", "御社", "貴社", "販売", "広告", "代理店"], D = ["無料", "限定", "販売促進", "広告代理店"], M = [
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
function C(o) {
  return o.trim().toLowerCase();
}
function A(o, e) {
  return o === e || o.endsWith(`.${e}`);
}
function L(o) {
  var e;
  try {
    return new URL(o).hostname.toLowerCase();
  } catch {
    const t = o.match(/https?:\/\/([^/\s]+)/i);
    return ((e = t == null ? void 0 : t[1]) == null ? void 0 : e.toLowerCase()) ?? null;
  }
}
function U(o) {
  const e = /* @__PURE__ */ new Set(), t = /[\w.+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  return Object.values(o).forEach((i) => {
    if (typeof i != "string")
      return;
    const n = i.matchAll(t);
    for (const s of n)
      s[1] && e.add(s[1].toLowerCase());
  }), Array.from(e);
}
function $() {
  var s;
  if (typeof document > "u")
    return null;
  const o = document.currentScript, e = Array.from(document.querySelectorAll("script")), t = o || e.find((a) => /form-blocker(\.min)?\.(js|mjs)$/.test(a.src) || a.dataset.apiBaseUrl), i = (s = t == null ? void 0 : t.dataset.apiBaseUrl) == null ? void 0 : s.trim(), n = t == null ? void 0 : t.src;
  try {
    if (i)
      return new URL(i).origin;
    if (n)
      return new URL(n).origin;
  } catch {
  }
  return null;
}
function N(o) {
  var a;
  const e = (a = o.apiBaseUrl) == null ? void 0 : a.trim(), t = $(), n = (e && e.length ? e : t || (typeof window < "u" ? window.location.origin : "")).replace(/\/+$/, ""), s = (o.evaluatePath || "/api/v1/evaluate").trim() || "/api/v1/evaluate";
  return /^https?:\/\//i.test(s) ? s : `${n}${s.startsWith("/") ? s : `/${s}`}`;
}
function T() {
  const o = document.createElement("div");
  o.className = "fb-loading", o.style.cssText = [
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
  ].join(";"), o.appendChild(e), !document.getElementById("fb-styles")) {
    const t = document.createElement("style");
    t.id = "fb-styles", t.textContent = "@keyframes fb-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }", document.head.appendChild(t);
  }
  return o;
}
let B = !1;
function I() {
  if (B || typeof document > "u")
    return;
  const o = document.createElement("style");
  o.id = "fb-modal-styles", o.textContent = `
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
`, document.head.appendChild(o), B = !0;
}
function K(o) {
  switch (o) {
    case "error":
      return "!";
    case "warning":
      return "?";
    default:
      return "ℹ︎";
  }
}
function R(o) {
  if (typeof document > "u")
    return;
  I();
  const e = document.createElement("div");
  e.className = "fb-modal-overlay";
  const t = document.createElement("div");
  t.className = `fb-modal-window fb-${o.type}`, t.setAttribute("role", "dialog"), t.setAttribute("aria-modal", "true"), t.setAttribute("aria-label", o.title);
  const i = document.createElement("div");
  i.className = `fb-modal-hero fb-${o.type}`, i.setAttribute("aria-hidden", "true"), i.textContent = K(o.type);
  const n = () => {
    e.classList.add("fb-modal-hide"), window.setTimeout(() => {
      e.parentElement && e.parentElement.removeChild(e);
    }, 180);
  }, s = document.createElement("button");
  s.className = "fb-modal-close", s.type = "button", s.setAttribute("aria-label", "閉じる"), s.innerHTML = "&times;", s.addEventListener("click", n);
  const a = document.createElement("h2");
  a.className = "fb-modal-title", a.textContent = o.title;
  const c = o.subtitle ? (() => {
    const r = document.createElement("p");
    return r.className = "fb-modal-subtitle", r.textContent = o.subtitle, r;
  })() : null, d = document.createElement("p");
  if (d.className = "fb-modal-message", d.textContent = o.message, t.appendChild(s), t.appendChild(i), t.appendChild(a), c && t.appendChild(c), t.appendChild(d), o.reasons && o.reasons.length > 0) {
    const r = document.createElement("ul");
    r.className = "fb-reason-list", o.reasons.forEach((b) => {
      const g = document.createElement("li");
      g.textContent = b, r.appendChild(g);
    }), t.appendChild(r);
  }
  if (o.note) {
    const r = document.createElement("p");
    r.className = "fb-modal-note", r.textContent = o.note, t.appendChild(r);
  }
  if (o.submissionId) {
    const r = document.createElement("p");
    r.className = "fb-submission-id", r.textContent = `受付ID: ${o.submissionId}`, t.appendChild(r);
  }
  const l = document.createElement("div");
  if (l.className = "fb-modal-actions", o.primaryAction && o.primaryActionLabel) {
    const r = document.createElement("button");
    r.className = "fb-modal-btn fb-primary", r.type = "button", r.textContent = o.primaryActionLabel, r.addEventListener("click", () => {
      var b;
      (b = o.primaryAction) == null || b.call(o), n();
    }), l.appendChild(r);
  }
  const u = document.createElement("button");
  u.className = "fb-modal-btn fb-secondary", u.type = "button", u.textContent = "閉じる", u.addEventListener("click", n), l.appendChild(u), t.appendChild(l), e.appendChild(t), e.addEventListener("click", (r) => {
    r.target === e && n();
  }), document.body.appendChild(e);
}
function _(o) {
  const e = o.message || "営業目的または不正な送信と判定されたため、送信をブロックしました。";
  R({
    title: "送信がブロックされました",
    subtitle: "申し訳ありませんが、この送信内容は営業目的またはスパムの可能性が高いため送信できませんでした。",
    message: e,
    type: "error",
    reasons: o.reasons,
    submissionId: o.submission_id,
    note: "心当たりがない場合は、入力内容を見直すか別の連絡手段でお問い合わせください。再送時は URL や営業キーワードが含まれていないかをご確認ください。"
  });
}
function F(o, e) {
  const t = document.createElement("div");
  t.className = `fb-message fb-${e}`, t.textContent = o, t.style.cssText = [
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
class z {
  constructor() {
    this.config = null, this.contexts = /* @__PURE__ */ new Map(), this.mutationObserver = null, this.pendingAttachScan = !1;
  }
  init(e) {
    var i, n, s, a, c, d;
    if (typeof window > "u" || typeof document > "u")
      return;
    if (!e || !e.apiKey) {
      console.error("[FormBlocker] apiKey is required");
      return;
    }
    this.destroy();
    const t = (l) => l.map((u) => u.toLowerCase());
    this.config = {
      apiKey: e.apiKey,
      evaluateUrl: N(e),
      selector: e.selector || "form",
      debug: !!e.debug,
      previewMode: !!e.previewMode,
      salesKeywords: (n = (i = e.debugRules) == null ? void 0 : i.salesKeywords) != null && n.length ? t(e.debugRules.salesKeywords) : t(S),
      bannedKeywords: (a = (s = e.debugRules) == null ? void 0 : s.bannedKeywords) != null && a.length ? t(e.debugRules.bannedKeywords) : t(D),
      blockedDomains: (d = (c = e.debugRules) == null ? void 0 : c.blockedDomains) != null && d.length ? e.debugRules.blockedDomains.map(C) : [],
      observeMutations: e.observeMutations !== !1,
      onAllow: e.onAllow,
      onBlock: e.onBlock,
      onChallenge: e.onChallenge,
      onHold: e.onHold,
      onError: e.onError,
      onDetectionUpdate: e.onDetectionUpdate
    }, this.log("Initialized with config", this.config), console.info(
      `[FormBlocker ${f}] Initialized (selector: "${this.config.selector}", evaluateUrl: "${this.config.evaluateUrl}", previewMode: ${this.config.previewMode})`
    ), this.attachToForms(), this.startMutationObserver();
  }
  refresh() {
    if (!this.config) {
      this.log("Refresh skipped: config not initialized");
      return;
    }
    this.attachToForms();
  }
  destroy() {
    this.stopMutationObserver(), this.contexts.forEach((e, t) => {
      t.removeAttribute("data-fb-attached"), t.removeEventListener("submit", e.submitHandler, !0), e.pasteHandlers.forEach(({ element: i, handler: n }) => {
        i.removeEventListener("paste", n);
      }), e.inputHandlers.forEach(({ element: i, handler: n }) => {
        i.removeEventListener("input", n);
      });
    }), this.contexts.clear();
  }
  attachToForms() {
    if (!this.config)
      return;
    const e = document.querySelectorAll(this.config.selector);
    this.log("Searching forms with selector", {
      selector: this.config.selector,
      found: e.length
    }), e.length === 0 ? console.warn(`[FormBlocker ${f}] No forms matched selector ${this.config.selector}`) : console.info(
      `[FormBlocker ${f}] Found ${e.length} form(s) for selector "${this.config.selector}"`
    ), e.forEach((t) => {
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
      let i = !1;
      for (const n of t)
        if (n.type === "childList" && n.addedNodes.length > 0) {
          i = !0;
          break;
        }
      i && this.scheduleAttachScan();
    }), this.mutationObserver.observe(document.body, { childList: !0, subtree: !0 }), console.info(`[FormBlocker ${f}] Watching DOM for newly added forms`);
  }
  stopMutationObserver() {
    this.mutationObserver && (this.mutationObserver.disconnect(), this.mutationObserver = null), this.pendingAttachScan = !1;
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
    }, i = (c) => {
      this.handleSubmit(c, e, t).catch((d) => {
        this.log("Submission handling failed", d);
      });
    }, n = [], s = [], a = e.querySelectorAll("input, textarea");
    a.forEach((c) => {
      const d = () => {
        t.pasteDetected = !0, this.log("Paste detected for form", e), this.emitDetectionUpdate(e, t);
      };
      c.addEventListener("paste", d), n.push({ element: c, handler: d });
    }), a.forEach((c) => {
      const d = () => {
        this.emitDetectionUpdate(e, t);
      };
      c.addEventListener("input", d), s.push({ element: c, handler: d });
    }), e.addEventListener("submit", i, !0), e.setAttribute("data-fb-attached", "true"), this.emitDetectionUpdate(e, t), this.contexts.set(e, {
      originalSubmit: e.onsubmit,
      submitHandler: i,
      pasteHandlers: n,
      inputHandlers: s,
      behavioral: t
    }), this.log("Attached to form", e);
  }
  async handleSubmit(e, t, i) {
    var n, s, a, c, d;
    if (this.config) {
      e.preventDefault(), e.stopPropagation(), this.log("Intercepted submit", { selector: this.config.selector }), i.timeToSubmit = (Date.now() - i.pageLoadTime) / 1e3, this.showLoading(t), this.emitDetectionUpdate(t, i);
      try {
        const l = this.buildRequestBody(t, i);
        this.log("Submitting payload", l);
        const u = await fetch(this.config.evaluateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(l)
        });
        if (!u.ok)
          throw new Error(`API request failed with status ${u.status}`);
        const r = await u.json();
        if (this.log("Received response", r), !r.success) {
          const b = ((n = r.error) == null ? void 0 : n.message) || "エラーが発生しました。後ほど再度お試しください。";
          F(b, "error"), (a = (s = this.config).onError) == null || a.call(s, r), this.hideLoading(t);
          return;
        }
        this.handleDecision(r, t);
      } catch (l) {
        console.error("[FormBlocker] API error", l), (d = (c = this.config).onError) == null || d.call(c, l), this.hideLoading(t), this.allowSubmission(t);
      }
    }
  }
  buildRequestBody(e, t) {
    var s;
    const i = {
      url: typeof window < "u" ? window.location.href : "",
      user_agent: typeof navigator < "u" ? navigator.userAgent : "",
      timestamp: Date.now()
    }, n = {
      paste_detected: t.pasteDetected
    };
    return typeof t.timeToSubmit == "number" && !Number.isNaN(t.timeToSubmit) && (n.time_to_submit = t.timeToSubmit), {
      api_key: (s = this.config) == null ? void 0 : s.apiKey,
      form_data: this.extractFormData(e),
      metadata: i,
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
        const a = n;
        t[n.name] || (t[n.name] = []), a.checked && t[n.name].push(a.value);
        return;
      }
      if (s === "radio") {
        const a = n;
        a.checked ? t[n.name] = a.value : n.name in t || (t[n.name] = null);
        return;
      }
      t[n.name] = n.value;
    }), t;
  }
  handleDecision(e, t) {
    var i, n, s, a, c, d;
    switch (this.log("Handling decision", {
      decision: e.decision,
      scores: e.scores,
      reasons: e.reasons,
      challenge: e.challenge,
      submissionId: e.submission_id
    }), e.decision) {
      case "allowed":
        this.allowSubmission(t), this.hideLoading(t), (n = (i = this.config) == null ? void 0 : i.onAllow) == null || n.call(i, e);
        break;
      case "challenged":
        this.hideLoading(t), this.handleChallenge(e, t);
        break;
      case "held":
        this.hideLoading(t), F(e.message, "info"), (a = (s = this.config) == null ? void 0 : s.onHold) == null || a.call(s, e);
        break;
      case "blocked":
        this.hideLoading(t), _(e), (d = (c = this.config) == null ? void 0 : c.onBlock) == null || d.call(c, e);
        break;
      default:
        this.hideLoading(t), this.allowSubmission(t);
    }
  }
  handleChallenge(e, t) {
    var a, c, d;
    this.log("Challenge presented", {
      question: (a = e.challenge) == null ? void 0 : a.question,
      submissionId: e.submission_id
    });
    const i = () => {
      var l, u;
      this.allowSubmission(t), (u = (l = this.config) == null ? void 0 : l.onAllow) == null || u.call(l, e);
    };
    if ((c = this.config) != null && c.onChallenge) {
      this.config.onChallenge(e, i);
      return;
    }
    const n = ((d = e.challenge) == null ? void 0 : d.question) || "この送信は営業目的ではありませんか？送信を続けますか？";
    window.confirm(`${n}

「OK」を押すと送信されます。`) && i();
  }
  allowSubmission(e) {
    var i;
    if ((i = this.config) != null && i.previewMode) {
      this.log("Preview mode enabled: submission prevented");
      return;
    }
    this.log("Allowing native submission");
    const t = this.contexts.get(e);
    if (t != null && t.originalSubmit) {
      const n = new Event("submit", { bubbles: !0, cancelable: !0 });
      t.originalSubmit.call(e, n);
    } else
      e.submit();
  }
  showLoading(e) {
    if (!e.querySelector(".fb-loading")) {
      const t = T(), i = window.getComputedStyle(e);
      (i.position === "static" || !i.position) && (e.style.position = "relative"), e.appendChild(t);
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
    const e = window.FormBlockerDebug === !0, t = localStorage.getItem("formblocker:debug") === "true", i = new URLSearchParams(window.location.search), n = i.get("fb_debug") === "1" || i.get("formblocker_debug") === "1";
    return e || t || n;
  }
  log(e, t) {
    this.isDebugEnabled() && (t !== void 0 ? console.log(`[FormBlocker ${f}] ${e}`, t) : console.log(`[FormBlocker ${f}] ${e}`));
  }
  emitDetectionUpdate(e, t) {
    var a, c;
    const i = this.contexts.get(e), n = this.extractFormData(e), s = this.analyzeDetection(n, t);
    i && (i.lastDetection = s), this.log("Detection snapshot", s), (c = (a = this.config) == null ? void 0 : a.onDetectionUpdate) == null || c.call(a, s);
  }
  analyzeDetection(e, t) {
    var v, k, E;
    const n = Object.values(e).map((m) => typeof m == "string" ? m : Array.isArray(m) ? m.join(" ") : "").join(" ").toLowerCase(), s = /(https?:\/\/[^\s]+)/gi, a = n.match(s) || [], c = a.filter((m) => {
      const p = L(m);
      return p ? M.some((h) => A(p, h)) : !1;
    }), d = ((v = this.config) == null ? void 0 : v.salesKeywords) || S, l = ((k = this.config) == null ? void 0 : k.bannedKeywords) || D, u = d.filter((m) => m && n.includes(m.toLowerCase())), r = l.filter((m) => m && n.includes(m.toLowerCase())), b = U(e), g = [], x = ((E = this.config) == null ? void 0 : E.blockedDomains) || [];
    if (x.length > 0) {
      const m = Array.from(
        new Set(
          a.map((h) => L(h)).filter((h) => !!h)
        )
      );
      Array.from(/* @__PURE__ */ new Set([...m, ...b])).map(C).forEach((h) => {
        x.some((O) => A(h, O)) && g.push(h);
      });
    }
    return {
      urlDetected: a.length > 0,
      detectedUrls: a,
      schedulingUrls: c,
      salesKeywords: u,
      bannedKeywords: r,
      blockedDomains: g,
      pasteDetected: t.pasteDetected,
      contentLength: n.length,
      updatedAt: Date.now()
    };
  }
}
const w = new z(), y = {
  init(o) {
    if (typeof window < "u") {
      const e = localStorage.getItem("formblocker:debug"), t = window.FormBlockerDebug === !0, i = new URLSearchParams(window.location.search), n = i.get("fb_debug") === "1" || i.get("formblocker_debug") === "1";
      (e === "true" || t || n) && (o = { ...o, debug: !0 });
    }
    w.init(o), console.info(
      `[FormBlocker ${f}] init called`,
      {
        selector: o.selector || "form",
        debug: o.debug,
        previewMode: o.previewMode
      }
    );
  },
  refresh() {
    w.refresh();
  },
  destroy() {
    w.destroy();
  }
};
if (typeof window < "u") {
  console.info(`[FormBlocker ${f}] Script loaded`), window.FormBlocker = y, window.FormBlockerVersion = f;
  const o = window.FormBlockerAutoInit;
  o && y.init(o), document.readyState === "loading" && document.addEventListener("DOMContentLoaded", () => {
    const e = window.FormBlockerAutoInit;
    e && y.init(e);
  });
}
export {
  y as default
};
//# sourceMappingURL=form-blocker.mjs.map
