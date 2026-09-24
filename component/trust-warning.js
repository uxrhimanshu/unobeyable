// <trust-warning>: renders the redesigned warning for a classify() result.
// Pure presentation + wiring; all decision logic lives in classify.js and
// all view-state logic lives in state.js. This file only builds DOM, reads
// events off it, and forwards them to reduce().

import { classify, reportBody, SEVERITY, ACTION } from "./classify.js";
import { COPY, SEVERITY_LABEL, fill } from "./copy.js";
import { initialState, reduce } from "./state.js";

const PLACEHOLDER_KEYS = [
  "host", "fingerprint", "issuer", "org", "orgTeam",
  "acceptedFingerprint", "acceptedAt", "reportName", "changes",
];

function buildVars(context, result) {
  const accepted = context.accepted || {};
  return {
    host: context.host,
    fingerprint: context.fingerprint,
    issuer: context.issuer,
    org: context.org,
    orgTeam: context.orgTeam,
    acceptedFingerprint: accepted.fingerprint,
    acceptedAt: accepted.acceptedAt,
    reportName: result.reportTo ? result.reportTo.name : undefined,
    changes: context.renewalChanges,
  };
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/** Wraps a colon-separated fingerprint in groups that break only at colons. */
function formatFingerprint(fp) {
  if (!fp) return "";
  return fp.split(":").map((g) => `<span class="tw-fp-group">${esc(g)}</span>`).join(":");
}

const ICONS = {
  notice: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.2 10.3l2.4 2.4 5.2-5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  caution: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M10 2.6 18 16.4H2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><line x1="10" y1="8" x2="10" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="10" cy="14.4" r=".9" fill="currentColor"/></svg>',
  stop: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M6.2 2h7.6L18 6.2v7.6L13.8 18H6.2L2 13.8V6.2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><line x1="7" y1="7" x2="13" y2="13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="13" y1="7" x2="7" y2="13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};

let uid = 0;

// Falls back to a plain class when there is no DOM (e.g. `node --test` or a
// module-import smoke check), so this file can be imported outside a
// browser without throwing. In a browser, HTMLElement is always present.
const ElementBase = typeof HTMLElement !== "undefined" ? HTMLElement : class {};

export class TrustWarning extends ElementBase {
  static get observedAttributes() { return ["open"]; }

  constructor() {
    super();
    this._context = null;
    this._result = null;
    this._state = null;
    this._expanded = false; // notice indicator popover, not part of state.js
    this._uid = `tw${++uid}`;
    this._onClick = this._onClick.bind(this);
    this._onKeydown = this._onKeydown.bind(this);
    this._onFocusIn = this._onFocusIn.bind(this);
  }

  connectedCallback() {
    this.classList.add("tw");
    this.addEventListener("click", this._onClick);
    this.addEventListener("keydown", this._onKeydown);
    this.addEventListener("focusin", this._onFocusIn);
    this.render();
  }

  disconnectedCallback() {
    this.removeEventListener("click", this._onClick);
    this.removeEventListener("keydown", this._onKeydown);
    this.removeEventListener("focusin", this._onFocusIn);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name !== "open") return;
    this.render();
    // Initial focus is opt-in: a warning that appears in response to navigation
    // takes focus (autofocus), a warning embedded in a document does not.
    if (oldValue === null && newValue !== null && this.hasAttribute("autofocus")) this._focusTitle();
  }

  get open() { return this.hasAttribute("open"); }
  set open(value) {
    if (value) this.setAttribute("open", "");
    else this.removeAttribute("open");
  }

  get context() { return this._context; }
  set context(value) {
    this._context = value;
    this._result = value ? classify(value) : null;
    this._state = this._result ? initialState(this._result) : null;
    this._expanded = false;
    this.render();
  }

  /** Read-only: the classify() output for the current context. */
  get result() { return this._result; }

  // -- event wiring ---------------------------------------------------

  _onClick(event) {
    const btn = event.target.closest("[data-tw-action], [data-tw-event]");
    if (!btn || !this.contains(btn)) return;
    if (btn.dataset.twAction) {
      this._dispatch({ type: "action", action: btn.dataset.twAction });
      return;
    }
    const ev = btn.dataset.twEvent;
    if (ev === "compare-toggle") this._dispatch({ type: "compare-toggle" });
    else if (ev === "report-send") this._dispatch({ type: "report-send" });
    else if (ev === "report-cancel") this._dispatch({ type: "report-cancel" });
    else if (ev === "review-submit") this._submitReview();
    else if (ev === "indicator-toggle") this._toggleIndicator();
  }

  _onKeydown(event) {
    if (event.key === "Enter" && event.target.matches("[data-tw-input]")) {
      event.preventDefault();
      this._submitReview();
      return;
    }
    if (event.key !== "Escape") return;
    if (!this._state) return;
    const view = this._state.view;
    if (view === "comparing") {
      event.stopPropagation();
      this._dispatch({ type: "compare-toggle" });
    } else if (view === "reviewing" || view === "reporting") {
      event.stopPropagation();
      this._dispatch({ type: "report-cancel" });
    } else if (this._expanded) {
      event.stopPropagation();
      this._toggleIndicator();
    }
  }

  _onFocusIn() {
    // no-op hook kept for symmetry; focus is moved explicitly after render.
  }

  _toggleIndicator() {
    this._expanded = !this._expanded;
    this.render();
  }

  _submitReview() {
    const input = this.querySelector("[data-tw-input]");
    const value = input ? input.value : "";
    this._dispatch({ type: "review-submit", value, fingerprint: this._context.fingerprint });
  }

  _dispatch(event) {
    const prevState = this._state;
    this._state = reduce(this._state, event);
    this.render();
    const confirmed = event.type === "review-submit" && this._state.view === "done";
    if (event.type === "action" || confirmed) {
      this.dispatchEvent(new CustomEvent("tw-decision", {
        detail: {
          action: confirmed ? "review-confirmed" : event.action,
          situation: this._result.situation,
          severity: this._result.severity,
          view: this._state.view,
        },
        bubbles: true,
      }));
    }
    if (prevState.view !== this._state.view) this._focusTitle();
  }

  // -- rendering --------------------------------------------------------

  render() {
    if (!this._result || this._result.severity === SEVERITY.NONE || !this.open) {
      this.innerHTML = "";
      return;
    }
    if (this._result.severity === SEVERITY.NOTICE) {
      this.innerHTML = this._renderIndicator();
    } else {
      this.innerHTML = this._renderPanel();
    }
  }

  _focusTitle() {
    const h2 = this.querySelector(".tw-title");
    if (h2) h2.focus();
  }

  _renderActions(view) {
    const { actions, situation } = this._result;
    const buttons = actions.map((action, i) => {
      const label = esc((COPY[situation].actions || {})[action] || action);
      let cls = "tw-btn tw-btn-secondary";
      if (i === 0) cls = "tw-btn tw-btn-primary";
      if (action === ACTION.REVIEW_CHANGE) cls = "tw-btn tw-btn-link";
      return `<button type="button" class="${cls}" data-tw-action="${esc(action)}">${label}</button>`;
    }).join("");
    return `<div class="tw-actions">${buttons}</div>`;
  }

  _renderDetails(vars) {
    const copy = COPY[this._result.situation];
    let html = "";
    if (copy.detailLabel) {
      html += `<div class="tw-detail"><span class="tw-detail-label">${esc(copy.detailLabel)}</span><span class="tw-detail-value tw-fingerprint">${formatFingerprint(fill(copy.detail, vars))}</span></div>`;
    }
    if (copy.detailLabel2) {
      html += `<div class="tw-detail"><span class="tw-detail-label">${esc(copy.detailLabel2)}</span><span class="tw-detail-value tw-fingerprint">${formatFingerprint(fill(copy.detail2, vars))}</span></div>`;
    }
    return html;
  }

  _renderComparingExtra(vars) {
    if (this._result.situation !== "local-unverifiable") return "";
    return `
      <div class="tw-compare">
        <p class="tw-compare-hint">Check this against the device's screen, label or setup page.</p>
        <button type="button" class="tw-btn tw-btn-link" data-tw-event="compare-toggle">Hide fingerprint</button>
      </div>`;
  }

  _renderReviewing(vars) {
    const copy = COPY[this._result.situation].review;
    const errorHtml = this._state.error === "mismatch"
      ? `<p class="tw-error" role="alert">${esc(fill(copy.mismatch, vars))}</p>` : "";
    return `
      <p class="tw-body">${esc(fill(copy.body, vars))}</p>
      <div class="tw-field">
        <label class="tw-field-label" for="${this._uid}-input">${esc(copy.inputLabel)}</label>
        <input id="${this._uid}-input" class="tw-input" type="text" autocomplete="off" spellcheck="false" data-tw-input>
      </div>
      ${errorHtml}
      <div class="tw-actions">
        <button type="button" class="tw-btn tw-btn-primary" data-tw-event="review-submit">${esc(copy.confirm)}</button>
        <button type="button" class="tw-btn tw-btn-secondary" data-tw-event="report-cancel">Cancel</button>
      </div>`;
  }

  _renderReporting(vars) {
    const copy = COPY.report;
    const hint = this._context.renewalChanges
      ? `<p class="tw-hint">${esc(fill(copy.hint["renewal-pattern"], vars))}</p>` : "";
    const body = reportBody(this._context, this._result);
    return `
      <p class="tw-body">${esc(fill(copy.body, vars))}</p>
      ${hint}
      <pre class="tw-report-pre">${esc(body)}</pre>
      <div class="tw-field">
        <label class="tw-field-label" for="${this._uid}-note">${esc(copy.noteLabel)}</label>
        <textarea id="${this._uid}-note" class="tw-textarea" rows="3" data-tw-note></textarea>
      </div>
      <div class="tw-actions">
        <button type="button" class="tw-btn tw-btn-primary" data-tw-event="report-send">${esc(copy.send)}</button>
        <button type="button" class="tw-btn tw-btn-secondary" data-tw-event="report-cancel">${esc(copy.cancel)}</button>
      </div>`;
  }

  _renderSent(vars) {
    const copy = COPY.report;
    return `
      <p class="tw-body">${esc(fill(copy.sent, vars))}</p>
      <div class="tw-actions">
        <button type="button" class="tw-btn tw-btn-secondary" data-tw-event="report-cancel">Close</button>
      </div>`;
  }

  _bodyAndActions(vars) {
    const view = this._state.view;
    const copy = COPY[this._result.situation];
    if (view === "reviewing") {
      return `<h2 class="tw-title tw-review-title" tabindex="-1">${esc(fill(copy.review.title, vars))}</h2>` + this._renderReviewing(vars);
    }
    if (view === "reporting") {
      return `<h2 class="tw-title" tabindex="-1">${esc(fill(COPY.report.title, vars))}</h2>` + this._renderReporting(vars);
    }
    if (view === "sent") {
      return `<h2 class="tw-title" tabindex="-1">${esc(fill(COPY.report.title, vars))}</h2>` + this._renderSent(vars);
    }
    // warning or comparing
    const bodyLines = (copy.body || []).map((line) => `<p class="tw-body">${esc(fill(line, vars))}</p>`).join("");
    const details = this._renderDetails(vars);
    const comparingExtra = view === "comparing" ? this._renderComparingExtra(vars) : "";
    const afterHtml = copy.after ? `<p class="tw-after">${esc(fill(copy.after, vars))}</p>` : "";
    return `<h2 class="tw-title" tabindex="-1">${esc(fill(copy.title, vars))}</h2>`
      + bodyLines + details + comparingExtra + this._renderActions(view) + afterHtml;
  }

  _renderPanel() {
    const { severity } = this._result;
    const vars = buildVars(this._context, this._result);
    const titleId = `${this._uid}-title`;
    const descId = `${this._uid}-desc`;
    const inner = this._bodyAndActions(vars);
    return `
      <section class="tw-panel tw-panel-${esc(severity)}" role="alertdialog" aria-labelledby="${titleId}" aria-describedby="${descId}">
        <div class="tw-severity-row">
          <span class="tw-severity-icon">${ICONS[severity]}</span>
          <span class="tw-severity-label">${esc(SEVERITY_LABEL[severity])}</span>
        </div>
        <div class="tw-panel-body" id="${descId}">${inner.replace('class="tw-title"', `class="tw-title" id="${titleId}"`).replace('class="tw-title tw-review-title"', `class="tw-title tw-review-title" id="${titleId}"`)}</div>
      </section>`;
  }

  _renderIndicator() {
    const { situation } = this._result;
    const vars = buildVars(this._context, this._result);
    const copy = COPY[situation];
    const text = esc(fill(copy.indicator || copy.title, vars));
    const popover = this._expanded
      ? `<div class="tw-popover" role="dialog" aria-label="${esc(SEVERITY_LABEL.notice)}">${this._bodyAndActionsForIndicator(vars)}</div>`
      : "";
    return `
      <span class="tw-indicator-wrap">
        <button type="button" class="tw-indicator" aria-expanded="${this._expanded}" data-tw-event="indicator-toggle">
          <span class="tw-severity-icon">${ICONS.notice}</span>
          <span class="tw-indicator-text">${text}</span>
        </button>
        ${popover}
      </span>`;
  }

  _bodyAndActionsForIndicator(vars) {
    return this._bodyAndActions(vars);
  }
}

if (typeof customElements !== "undefined" && !customElements.get("trust-warning")) {
  customElements.define("trust-warning", TrustWarning);
}

export { PLACEHOLDER_KEYS };
