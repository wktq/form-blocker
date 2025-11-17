const g = "2024-11-07-block-modal", C = ["営業", "セールス", "提案", "御社", "貴社", "販売", "広告", "代理店"], D = ["無料", "限定", "販売促進", "広告代理店"], T = [
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
function L(o) {
  return o.trim().toLowerCase();
}
function S(o, e) {
  return o === e || o.endsWith(`.${e}`);
}
function A(o) {
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
    for (const a of n)
      a[1] && e.add(a[1].toLowerCase());
  }), Array.from(e);
}
function K(o) {
  const t = (o.apiBaseUrl && o.apiBaseUrl.trim() || (typeof window < "u" ? window.location.origin : "")).replace(/\/+$/, ""), i = (o.evaluatePath || "/api/v1/evaluate").trim() || "/api/v1/evaluate";
  return /^https?:\/\//i.test(i) ? i : `${t}${i.startsWith("/") ? i : `/${i}`}`;
}
function I() {
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
function $() {
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
function z(o) {
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
  $();
  const e = document.createElement("div");
  e.className = "fb-modal-overlay";
  const t = document.createElement("div");
  t.className = `fb-modal-window fb-${o.type}`, t.setAttribute("role", "dialog"), t.setAttribute("aria-modal", "true"), t.setAttribute("aria-label", o.title);
  const i = document.createElement("div");
  i.className = `fb-modal-hero fb-${o.type}`, i.setAttribute("aria-hidden", "true"), i.textContent = z(o.type);
  const n = () => {
    e.classList.add("fb-modal-hide"), window.setTimeout(() => {
      e.parentElement && e.parentElement.removeChild(e);
    }, 180);
  }, a = document.createElement("button");
  a.className = "fb-modal-close", a.type = "button", a.setAttribute("aria-label", "閉じる"), a.innerHTML = "&times;", a.addEventListener("click", n);
  const s = document.createElement("h2");
  s.className = "fb-modal-title", s.textContent = o.title;
  const d = o.subtitle ? (() => {
    const r = document.createElement("p");
    return r.className = "fb-modal-subtitle", r.textContent = o.subtitle, r;
  })() : null, c = document.createElement("p");
  if (c.className = "fb-modal-message", c.textContent = o.message, t.appendChild(a), t.appendChild(i), t.appendChild(s), d && t.appendChild(d), t.appendChild(c), o.reasons && o.reasons.length > 0) {
    const r = document.createElement("ul");
    r.className = "fb-reason-list", o.reasons.forEach((u) => {
      const h = document.createElement("li");
      h.textContent = u, r.appendChild(h);
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
      var u;
      (u = o.primaryAction) == null || u.call(o), n();
    }), l.appendChild(r);
  }
  const m = document.createElement("button");
  m.className = "fb-modal-btn fb-secondary", m.type = "button", m.textContent = "閉じる", m.addEventListener("click", n), l.appendChild(m), t.appendChild(l), e.appendChild(t), e.addEventListener("click", (r) => {
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
class j {
  constructor() {
    this.config = null, this.contexts = /* @__PURE__ */ new Map();
  }
  init(e) {
    var i, n, a, s, d, c;
    if (typeof window > "u" || typeof document > "u")
      return;
    if (!e || !e.apiKey) {
      console.error("[FormBlocker] apiKey is required");
      return;
    }
    this.destroy();
    const t = (l) => l.map((m) => m.toLowerCase());
    this.config = {
      apiKey: e.apiKey,
      evaluateUrl: K(e),
      selector: e.selector || "form",
      debug: !!e.debug,
      previewMode: !!e.previewMode,
      salesKeywords: (n = (i = e.debugRules) == null ? void 0 : i.salesKeywords) != null && n.length ? t(e.debugRules.salesKeywords) : t(C),
      bannedKeywords: (s = (a = e.debugRules) == null ? void 0 : a.bannedKeywords) != null && s.length ? t(e.debugRules.bannedKeywords) : t(D),
      blockedDomains: (c = (d = e.debugRules) == null ? void 0 : d.blockedDomains) != null && c.length ? e.debugRules.blockedDomains.map(L) : [],
      onAllow: e.onAllow,
      onBlock: e.onBlock,
      onChallenge: e.onChallenge,
      onHold: e.onHold,
      onError: e.onError,
      onDetectionUpdate: e.onDetectionUpdate
    }, this.log("Initialized with config", this.config), this.attachToForms();
  }
  refresh() {
    if (!this.config) {
      this.log("Refresh skipped: config not initialized");
      return;
    }
    this.attachToForms();
  }
  destroy() {
    this.contexts.forEach((e, t) => {
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
    }), e.length === 0 && console.warn(`[FormBlocker ${g}] No forms matched selector ${this.config.selector}`), e.forEach((t) => {
      this.contexts.has(t) || this.attachToForm(t);
    });
  }
  attachToForm(e) {
    if (!this.config)
      return;
    const t = {
      pasteDetected: !1,
      timeToSubmit: null,
      pageLoadTime: Date.now()
    }, i = (d) => {
      this.handleSubmit(d, e, t).catch((c) => {
        this.log("Submission handling failed", c);
      });
    }, n = [], a = [], s = e.querySelectorAll("input, textarea");
    s.forEach((d) => {
      const c = () => {
        t.pasteDetected = !0, this.log("Paste detected for form", e), this.emitDetectionUpdate(e, t);
      };
      d.addEventListener("paste", c), n.push({ element: d, handler: c });
    }), s.forEach((d) => {
      const c = () => {
        this.emitDetectionUpdate(e, t);
      };
      d.addEventListener("input", c), a.push({ element: d, handler: c });
    }), e.addEventListener("submit", i, !0), e.setAttribute("data-fb-attached", "true"), this.emitDetectionUpdate(e, t), this.contexts.set(e, {
      originalSubmit: e.onsubmit,
      submitHandler: i,
      pasteHandlers: n,
      inputHandlers: a,
      behavioral: t
    }), this.log("Attached to form", e);
  }
  async handleSubmit(e, t, i) {
    var n, a, s, d, c;
    if (this.config) {
      e.preventDefault(), e.stopPropagation(), this.log("Intercepted submit", { selector: this.config.selector }), i.timeToSubmit = (Date.now() - i.pageLoadTime) / 1e3, this.showLoading(t), this.emitDetectionUpdate(t, i);
      try {
        const l = this.buildRequestBody(t, i);
        this.log("Submitting payload", l);
        const m = await fetch(this.config.evaluateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(l)
        });
        if (!m.ok)
          throw new Error(`API request failed with status ${m.status}`);
        const r = await m.json();
        if (this.log("Received response", r), !r.success) {
          const u = ((n = r.error) == null ? void 0 : n.message) || "エラーが発生しました。後ほど再度お試しください。";
          F(u, "error"), (s = (a = this.config).onError) == null || s.call(a, r), this.hideLoading(t);
          return;
        }
        this.handleDecision(r, t);
      } catch (l) {
        console.error("[FormBlocker] API error", l), (c = (d = this.config).onError) == null || c.call(d, l), this.hideLoading(t), this.allowSubmission(t);
      }
    }
  }
  buildRequestBody(e, t) {
    var a;
    const i = {
      url: typeof window < "u" ? window.location.href : "",
      user_agent: typeof navigator < "u" ? navigator.userAgent : "",
      timestamp: Date.now()
    }, n = {
      paste_detected: t.pasteDetected
    };
    return typeof t.timeToSubmit == "number" && !Number.isNaN(t.timeToSubmit) && (n.time_to_submit = t.timeToSubmit), {
      api_key: (a = this.config) == null ? void 0 : a.apiKey,
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
      const a = n.type;
      if (a === "checkbox") {
        const s = n;
        t[n.name] || (t[n.name] = []), s.checked && t[n.name].push(s.value);
        return;
      }
      if (a === "radio") {
        const s = n;
        s.checked ? t[n.name] = s.value : n.name in t || (t[n.name] = null);
        return;
      }
      t[n.name] = n.value;
    }), t;
  }
  handleDecision(e, t) {
    var i, n, a, s, d, c;
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
        this.hideLoading(t), F(e.message, "info"), (s = (a = this.config) == null ? void 0 : a.onHold) == null || s.call(a, e);
        break;
      case "blocked":
        this.hideLoading(t), _(e), (c = (d = this.config) == null ? void 0 : d.onBlock) == null || c.call(d, e);
        break;
      default:
        this.hideLoading(t), this.allowSubmission(t);
    }
  }
  handleChallenge(e, t) {
    var s, d, c;
    this.log("Challenge presented", {
      question: (s = e.challenge) == null ? void 0 : s.question,
      submissionId: e.submission_id
    });
    const i = () => {
      var l, m;
      this.allowSubmission(t), (m = (l = this.config) == null ? void 0 : l.onAllow) == null || m.call(l, e);
    };
    if ((d = this.config) != null && d.onChallenge) {
      this.config.onChallenge(e, i);
      return;
    }
    const n = ((c = e.challenge) == null ? void 0 : c.question) || "この送信は営業目的ではありませんか？送信を続けますか？";
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
      const t = I(), i = window.getComputedStyle(e);
      (i.position === "static" || !i.position) && (e.style.position = "relative"), e.appendChild(t);
    }
  }
  hideLoading(e) {
    const t = e.querySelector(".fb-loading");
    t && t.parentElement && t.parentElement.removeChild(t);
  }
  log(e, t) {
    var n;
    const i = typeof window < "u" && (window.FormBlockerDebug === !0 || localStorage.getItem("formblocker:debug") === "true");
    !((n = this.config) != null && n.debug) && !i || (t !== void 0 ? console.log(`[FormBlocker ${g}] ${e}`, t) : console.log(`[FormBlocker ${g}] ${e}`));
  }
  emitDetectionUpdate(e, t) {
    var s, d;
    const i = this.contexts.get(e), n = this.extractFormData(e), a = this.analyzeDetection(n, t);
    i && (i.lastDetection = a), this.log("Detection snapshot", a), (d = (s = this.config) == null ? void 0 : s.onDetectionUpdate) == null || d.call(s, a);
  }
  analyzeDetection(e, t) {
    var E, k, v;
    const n = Object.values(e).map((f) => typeof f == "string" ? f : Array.isArray(f) ? f.join(" ") : "").join(" ").toLowerCase(), a = /(https?:\/\/[^\s]+)/gi, s = n.match(a) || [], d = s.filter((f) => {
      const p = A(f);
      return p ? T.some((b) => S(p, b)) : !1;
    }), c = ((E = this.config) == null ? void 0 : E.salesKeywords) || C, l = ((k = this.config) == null ? void 0 : k.bannedKeywords) || D, m = c.filter((f) => f && n.includes(f.toLowerCase())), r = l.filter((f) => f && n.includes(f.toLowerCase())), u = U(e), h = [], x = ((v = this.config) == null ? void 0 : v.blockedDomains) || [];
    if (x.length > 0) {
      const f = Array.from(
        new Set(
          s.map((b) => A(b)).filter((b) => !!b)
        )
      );
      Array.from(/* @__PURE__ */ new Set([...f, ...u])).map(L).forEach((b) => {
        x.some((N) => S(b, N)) && h.push(b);
      });
    }
    return {
      urlDetected: s.length > 0,
      detectedUrls: s,
      schedulingUrls: d,
      salesKeywords: m,
      bannedKeywords: r,
      blockedDomains: h,
      pasteDetected: t.pasteDetected,
      contentLength: n.length,
      updatedAt: Date.now()
    };
  }
}
const y = new j(), w = {
  init(o) {
    typeof window < "u" && localStorage.getItem("formblocker:debug") === "true" && (o = { ...o, debug: !0 }), y.init(o);
  },
  refresh() {
    y.refresh();
  },
  destroy() {
    y.destroy();
  }
};
if (typeof window < "u") {
  console.info(`[FormBlocker ${g}] Script loaded`), window.FormBlocker = w, window.FormBlockerVersion = g;
  const o = window.FormBlockerAutoInit;
  o && w.init(o), document.readyState === "loading" && document.addEventListener("DOMContentLoaded", () => {
    const e = window.FormBlockerAutoInit;
    e && w.init(e);
  });
}
export {
  w as default
};
//# sourceMappingURL=form-blocker.mjs.map
