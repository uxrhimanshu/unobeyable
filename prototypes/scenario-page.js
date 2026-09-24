// Renders prototypes/scenario.html?id=<id> for any scenario in scenarios.js.
// One page, not five copies. DOM-heavy by nature (this is a page, not a
// pure module), but every decision it makes about *what* to show comes
// straight from scenarios.js / classify.js / principles.js.

import { SCENARIOS } from "./scenarios.js";
import { PRINCIPLES } from "./principles.js";
import { classify } from "../component/classify.js";
import "../component/trust-warning.js";
import { initThemeToggle } from "../component/theme.js";

const PRINCIPLE_MAP = {
  "local-unverifiable": ["P1", "P2", "P3"],
  "remembered": ["P3", "P4"],
  "changed-after-trust": ["P6"],
  "renewed-same-key": ["P3", "P6"],
  "inspected-by-network": ["P2", "P5"],
  "credential-on-unfamiliar": ["P7"],
  "link-opened": ["P7"],
};

const params = new URLSearchParams(location.search);
const id = params.get("id") || SCENARIOS[0].id;
const scenarioIndex = SCENARIOS.findIndex((s) => s.id === id);
const scenario = SCENARIOS[scenarioIndex];
const root = document.getElementById("scenario-root");

if (!scenario) {
  root.innerHTML = `<p>No scenario named &ldquo;${escapeHtml(id)}&rdquo;. <a href="index.html">Back to all scenarios</a>.</p>`;
} else {
  render(scenario, scenarioIndex);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function render(scenario, index) {
  document.title = `Unobeyable · ${scenario.name}`;

  root.innerHTML = `
    <h1>${escapeHtml(scenario.name)}</h1>
    <p class="scenario-setup">${escapeHtml(scenario.setup)}</p>
    <div class="scenario-meta">
      <a href="https://news.ycombinator.com/item?id=${encodeURIComponent(scenario.evidence)}" target="_blank" rel="noopener">Evidence · ${escapeHtml(scenario.evidence)}</a>
      <span class="code-chip">${escapeHtml(scenario.code)}</span>
    </div>

    <div class="tabs" role="tablist" aria-label="View">
      <button type="button" class="tab" role="tab" data-tab="today">Today</button>
      ${scenario.steps.map((step, i) => `<button type="button" class="tab" role="tab" data-tab="step-${i}">${escapeHtml(step.label)}</button>`).join("")}
    </div>

    <div class="stage">
      <div class="mock-window">
        <div class="mock-chrome">
          <span class="mock-dots" aria-hidden="true"><span></span><span></span><span></span></span>
          <span class="mock-address-bar" id="address-bar">
            <span class="mock-address-host" id="address-host"></span>
          </span>
        </div>
        <div class="mock-body" id="mock-body"></div>
      </div>
      <aside class="why-panel" aria-label="Why this happens">
        <h2>Why</h2>
        <div id="why-content"></div>
      </aside>
    </div>

    <nav class="proto-nav">
      <a href="scenario.html?id=${encodeURIComponent(prevId(index))}">&larr; Prev scenario</a>
      <a href="index.html">All scenarios</a>
      <a href="scenario.html?id=${encodeURIComponent(nextId(index))}">Next scenario &rarr;</a>
    </nav>
  `;

  initThemeToggle(document);

  const tabs = Array.from(root.querySelectorAll(".tab"));
  let current = "today";

  function selectTab(tabId) {
    current = tabId;
    for (const tab of tabs) {
      const selected = tab.dataset.tab === tabId;
      tab.setAttribute("aria-selected", String(selected));
    }
    renderStage(tabId);
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => selectTab(tab.dataset.tab));
  }

  function renderStage(tabId) {
    const addressHost = document.getElementById("address-host");
    const addressBar = document.getElementById("address-bar");
    const body = document.getElementById("mock-body");
    const why = document.getElementById("why-content");

    // reset address bar to just the host span
    addressBar.innerHTML = "";
    body.innerHTML = "";
    body.className = "mock-body";

    if (tabId === "today") {
      addressBar.innerHTML = `<span class="mock-address-host">https://${escapeHtml(scenario.steps[0].ctx.host)}</span><span class="mock-address-chip">Not verified</span>`;
      renderToday(scenario, body);
      why.innerHTML = `<p class="mock-caption">Today this situation gets the same screen as every other certificate problem: the same headline, the same explanation, the same way through. Select a redesign step to see what changes and which principle it rests on.</p>`;
      return;
    }

    const stepIndex = Number(tabId.replace("step-", ""));
    const step = scenario.steps[stepIndex];
    const ctx = step.ctx;
    const result = classify(ctx);

    addressBar.innerHTML = `<span class="mock-address-host">https://${escapeHtml(ctx.host)}</span>`;

    if (result.severity === "none") {
      body.classList.add("mock-body-center");
      renderDestination(scenario, ctx, body, selectTab);
    } else if (result.severity === "notice") {
      const tw = document.createElement("trust-warning");
      tw.context = ctx;
      tw.open = true;
      addressBar.appendChild(tw);
      body.innerHTML = `<p class="mock-caption">The page loads as usual. The indicator in the address bar shows what you already decided about this device.</p>`;
    } else {
      const tw = document.createElement("trust-warning");
      tw.context = ctx;
      tw.open = true;
      body.appendChild(tw);
    }

    renderWhy(result.situation, why);
  }

  selectTab("today");
}

function renderToday(scenario, body) {
  if (scenario.id === "phishing") {
    body.innerHTML = `
      <div class="mock-email">
        <div class="today-banner">
          <p class="today-headline">${escapeHtml(scenario.today.headline)}</p>
          <p class="today-code">${escapeHtml(scenario.today.code)}</p>
        </div>
        <p>An email asks you to open a link to complete a form. The banner above sits over the
        message; nothing about the email itself is changed.</p>
      </div>`;
    return;
  }

  const host = scenario.steps[0].ctx.host;
  body.classList.add("mock-body-center");
  body.innerHTML = `
    <div class="today-interstitial">
      <h2 class="today-headline">${escapeHtml(scenario.today.headline)}</h2>
      <p class="today-explain">Attackers might be trying to steal your information from ${escapeHtml(host)}.</p>
      <p class="today-code">${escapeHtml(scenario.today.code)}</p>
      <div class="today-actions">
        <button type="button" class="tw-btn tw-btn-primary" id="today-back">Back to safety</button>
        <button type="button" class="tw-btn tw-btn-secondary" id="today-advanced">Advanced</button>
      </div>
      <div class="today-advanced" id="today-advanced-panel" hidden>
        <button type="button" class="tw-btn tw-btn-link" id="today-proceed">Proceed to ${escapeHtml(host)} (unsafe)</button>
      </div>
    </div>`;

  body.querySelector("#today-advanced").addEventListener("click", () => {
    body.querySelector("#today-advanced-panel").hidden = false;
  });
}

function renderDestination(scenario, ctx, body, selectTab) {
  body.innerHTML = `
    <form class="mock-survey" id="survey-form">
      <h3>Benefits survey sign-in</h3>
      <div class="mock-field">
        <label for="survey-email">Work email</label>
        <input id="survey-email" type="email" autocomplete="off">
      </div>
      <div class="mock-field">
        <label for="survey-password">Password</label>
        <input id="survey-password" type="password" autocomplete="off">
      </div>
      <p class="mock-caption">No warning. Opening a link is ordinary work.</p>
    </form>`;

  const passwordField = body.querySelector("#survey-password");
  passwordField.addEventListener("focus", () => {
    const credentialIndex = scenario.steps.findIndex((s) => s.ctx.credentialFieldFocused);
    if (credentialIndex >= 0) selectTab(`step-${credentialIndex}`);
  });
}

function renderWhy(situation, container) {
  const ids = PRINCIPLE_MAP[situation] || [];
  if (ids.length === 0) {
    container.innerHTML = `<p class="mock-caption">No principle recorded for this situation.</p>`;
    return;
  }
  container.innerHTML = ids.map((id) => {
    const p = PRINCIPLES.principles.find((pr) => pr.id === id);
    if (!p) return "";
    return `
      <div class="why-principle">
        <span class="why-id">${escapeHtml(p.id)}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.body)}</p>
      </div>`;
  }).join("");
}

function prevId(index) {
  return SCENARIOS[(index - 1 + SCENARIOS.length) % SCENARIOS.length].id;
}

function nextId(index) {
  return SCENARIOS[(index + 1) % SCENARIOS.length].id;
}
