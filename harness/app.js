// Harness DOM logic. Imports the pure logic from ./runner.js, the design
// source of truth from ../component and ../prototypes, and renders the
// unmoderated comparison study directly into #app.
//
// The redesign condition imports ../component/trust-warning.js dynamically,
// so the harness still loads (and the "today" condition still runs) even
// before that file exists.

import { classify } from "../component/classify.js";
import { SCENARIOS } from "../prototypes/scenarios.js";
import {
  TASKS,
  assignConditions,
  taskOrderFor,
  generateParticipantId,
  toCSV,
} from "./runner.js";

const STORAGE_KEY = "unobeyable.harness.v1";
const PARTICIPANT_INDEX_KEY = "unobeyable.harness.v1.participantIndex";

const app = document.getElementById("app");

// Which scenario + step each task draws on. All four are severity "caution"
// or "stop" in the redesign, so every task shows a panel (never a silent or
// indicator-only state) which keeps the comparison legible.
const TASK_CONFIG = {
  printer: { scenarioId: "printer", step: "first" },
  changed: { scenarioId: "changed", step: "changed" },
  inspection: { scenarioId: "inspection", step: "first" },
  "phishing-credential": { scenarioId: "phishing", step: "credential" },
};

// Actions that resolve a redesign panel one way or another, for the purposes
// of recording a single decision per trial. Non-terminal actions (report,
// compare-fingerprint, review-change) keep the panel open.
const TERMINAL_ACTIONS = new Set([
  "go-back",
  "trust-device",
  "continue-to-network-page",
  "sign-in-anyway",
  "forget",
]);

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { trials: [] };
  } catch {
    return { trials: [] };
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable (private browsing, quota, disabled). The harness
    // keeps running in memory; data just won't survive a reload.
  }
}

function nextParticipantIndex() {
  try {
    const raw = localStorage.getItem(PARTICIPANT_INDEX_KEY);
    const idx = raw ? parseInt(raw, 10) : 0;
    localStorage.setItem(PARTICIPANT_INDEX_KEY, String(idx + 1));
    return Number.isFinite(idx) ? idx : 0;
  } catch {
    return 0;
  }
}

// ---- session state --------------------------------------------------------

const store = loadStore();
if (!Array.isArray(store.trials)) store.trials = [];

const session = {
  participantId: null,
  participantIndex: 0,
  conditions: null, // task -> "today" | "redesign"
  order: [],        // shuffled TASKS
  taskCursor: 0,
  trial: null,      // in-progress trial record
};

function clearApp() {
  app.textContent = "";
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2), v);
    } else if (v !== null && v !== undefined) {
      node.setAttribute(k, v);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

// ---- routing ---------------------------------------------------------------

function route() {
  if (location.hash === "#results") {
    renderResults();
  } else {
    renderConsent();
  }
}

window.addEventListener("hashchange", route);
route();

// ---- consent ---------------------------------------------------------------

function renderConsent() {
  clearApp();
  const card = el("div", { class: "h-card" }, [
    el("h1", { text: "Before you start" }),
    el("div", { class: "h-prose" }, [
      el("p", { text: "This is a short study comparing two versions of a browser security message. You will see four short scenarios and make the choice you would normally make." }),
      el("p", { text: "What is recorded: your choices, how long you take to decide, a short written answer, and a confidence rating. No names, no account details, no network requests. Everything stays in this browser until you (the researcher) export it as a CSV file." }),
      el("p", { text: "You can stop at any time by closing this tab. There is no penalty for stopping." }),
    ]),
    el("div", { class: "h-actions" }, [
      el("button", {
        class: "h-btn h-btn--primary",
        text: "I understand, start",
        onclick: startSession,
      }),
    ]),
  ]);
  app.appendChild(card);
}

function startSession() {
  session.participantId = generateParticipantId();
  session.participantIndex = nextParticipantIndex();
  session.conditions = assignConditions(session.participantIndex);
  session.order = taskOrderFor(session.participantId);
  session.taskCursor = 0;
  renderTaskSetup();
}

// ---- per-task flow ----------------------------------------------------------

function currentTask() {
  return session.order[session.taskCursor];
}

function renderProgress(container) {
  container.appendChild(
    el("div", {
      class: "h-progress",
      text: `Participant ${session.participantId} · task ${session.taskCursor + 1} of ${session.order.length}`,
    })
  );
}

function renderTaskSetup() {
  const task = currentTask();
  const config = TASK_CONFIG[task];
  const scenario = SCENARIOS.find((s) => s.id === config.scenarioId);

  clearApp();
  const card = el("div", { class: "h-card" });
  renderProgress(card);
  card.appendChild(el("h2", { text: scenario.name }));
  card.appendChild(
    el("div", { class: "h-prose" }, [el("p", { text: scenario.setup })])
  );
  card.appendChild(
    el("div", { class: "h-actions" }, [
      el("button", {
        class: "h-btn h-btn--primary",
        text: "Continue",
        onclick: () => beginTrial(task, config, scenario),
      }),
    ])
  );
  app.appendChild(card);
}

function beginTrial(task, config, scenario) {
  const condition = session.conditions[task];
  const step = scenario.steps.find((s) => s.state === config.step);
  session.trial = {
    participant_id: session.participantId,
    task_id: task,
    condition,
    order_index: session.taskCursor,
    decision: null,
    ms_to_decision: null,
    opened_details: false,
    reported: false,
    comprehension_text: "",
    confidence: null,
    timestamp: new Date().toISOString(),
    shownAt: performance.now(),
  };

  clearApp();
  const card = el("div", { class: "h-card" });
  renderProgress(card);
  card.appendChild(el("h2", { text: scenario.name }));

  if (condition === "today") {
    card.appendChild(renderTodayCondition(task, scenario, step));
  } else {
    card.appendChild(renderRedesignCondition(task, scenario, step));
  }

  app.appendChild(card);
}

function recordDecision(decision) {
  const trial = session.trial;
  if (!trial || trial.decision) return; // one decision per trial
  trial.decision = decision;
  trial.ms_to_decision = Math.round(performance.now() - trial.shownAt);
  renderComprehension();
}

// ---- "today" condition: generic interstitial / banner ----------------------

function renderTodayCondition(task, scenario, step) {
  const host = step.ctx.host;
  const wrap = el("div");

  if (task === "phishing-credential") {
    wrap.appendChild(renderPhishingToday(scenario, step));
    return wrap;
  }

  const body = el("div", { class: "h-chrome__body h-interstitial" });
  const advancedWrap = el("div", { class: "h-actions", "aria-hidden": "true" });
  advancedWrap.style.display = "none";

  const renderAdvancedLink = () => {
    advancedWrap.style.display = "";
    advancedWrap.removeAttribute("aria-hidden");
    advancedWrap.textContent = "";
    advancedWrap.appendChild(
      el("button", {
        class: "h-btn",
        text: `Proceed to ${host} (unsafe)`,
        onclick: () => recordDecision("proceed"),
      })
    );
  };

  body.appendChild(el("h2", { text: scenario.today.headline }));
  body.appendChild(
    el("p", { text: `Attackers might be trying to steal your information from ${host}.` })
  );
  body.appendChild(el("p", { class: "h-interstitial__code", text: scenario.today.code }));
  body.appendChild(
    el("div", { class: "h-actions" }, [
      el("button", {
        class: "h-btn h-btn--primary",
        text: "Back to safety",
        onclick: () => recordDecision("back"),
      }),
      el("button", {
        class: "h-btn",
        text: "Advanced",
        onclick: () => {
          if (session.trial) session.trial.opened_details = true;
          renderAdvancedLink();
        },
      }),
    ])
  );
  body.appendChild(advancedWrap);

  return el("div", { class: "h-chrome" }, [
    el("div", { class: "h-chrome__bar" }, [el("span", { text: `https://${host}` }), el("span", { class: "h-mono", text: "Not verified" })]),
    body,
  ]);
}

function renderPhishingToday(scenario, step) {
  const host = step.ctx.host;
  const container = el("div");
  const banner = el("div", { class: "h-chrome" }, [
    el("div", { class: "h-chrome__bar" }, [el("span", { text: "Inbox" })]),
    el("div", { class: "h-chrome__body" }, [
      el("div", { class: "h-interstitial" }, [
        el("h2", { text: scenario.today.headline }),
        el("p", { class: "h-interstitial__code", text: scenario.today.code }),
        el("div", { class: "h-actions" }, [
          el("button", {
            class: "h-btn h-btn--primary",
            text: "Back to safety",
            onclick: () => recordDecision("back"),
          }),
          el("button", {
            class: "h-btn",
            text: "Continue to page",
            onclick: () => {
              if (session.trial) session.trial.opened_details = true;
              container.textContent = "";
              container.appendChild(renderSignInMock(host, () => recordDecision("proceed")));
            },
          }),
        ]),
      ]),
    ]),
  ]);
  container.appendChild(banner);
  return container;
}

function renderSignInMock(host, onSubmit) {
  const form = el("form", {
    class: "h-chrome",
    onsubmit: (e) => {
      e.preventDefault();
      onSubmit();
    },
  });
  form.appendChild(
    el("div", { class: "h-chrome__bar" }, [el("span", { text: `https://${host}` })])
  );
  const body = el("div", { class: "h-chrome__body" });
  body.appendChild(el("h2", { text: "Sign in to continue" }));
  body.appendChild(
    el("div", { class: "h-field" }, [
      el("label", { for: "h-email", text: "Email" }),
      el("input", { type: "email", id: "h-email", name: "email" }),
    ])
  );
  body.appendChild(
    el("div", { class: "h-field" }, [
      el("label", { for: "h-password", text: "Password" }),
      el("input", { type: "password", id: "h-password", name: "password" }),
    ])
  );
  body.appendChild(
    el("div", { class: "h-actions" }, [
      el("button", { class: "h-btn h-btn--primary", type: "submit", text: "Sign in" }),
    ])
  );
  form.appendChild(body);
  return form;
}

// ---- "redesign" condition: <trust-warning> ---------------------------------

function renderRedesignCondition(task, scenario, step) {
  const container = el("div");
  const result = classify(step.ctx);
  import("../component/trust-warning.js")
    .then(() => {
      const warning = document.createElement("trust-warning");
      warning.toggleAttribute("open", true);
      warning.addEventListener("tw-decision", (event) => {
        const detail = event.detail || {};
        const trial = session.trial;
        if (!trial) return;
        if (detail.action === "report") trial.reported = true;
        if (detail.action === "compare-fingerprint" || detail.action === "review-change") {
          trial.opened_details = true;
        }
        if (TERMINAL_ACTIONS.has(detail.action) || detail.view === "done") {
          recordDecision(detail.action);
        }
      });
      warning.context = step.ctx;
      container.appendChild(warning);
      // Participants meet the warning as they would in a browser: focus lands on it.
      warning.querySelector(".tw-title, .tw-indicator")?.focus();
    })
    .catch(() => {
      container.appendChild(
        el("p", {
          class: "h-prose",
          text: "The redesigned component (component/trust-warning.js) is not built yet, so this trial cannot be run.",
        })
      );
    });

  return container;
}

// ---- comprehension + confidence ---------------------------------------------

function renderComprehension() {
  clearApp();
  const card = el("div", { class: "h-card" });
  renderProgress(card);
  card.appendChild(el("h2", { text: "One question about what you just saw" }));
  const field = el("div", { class: "h-field" }, [
    el("label", { for: "h-comprehension", text: "In your own words, what do you think is happening?" }),
    el("textarea", { id: "h-comprehension", name: "comprehension" }),
  ]);
  card.appendChild(field);
  card.appendChild(
    el("div", { class: "h-actions" }, [
      el("button", {
        class: "h-btn h-btn--primary",
        text: "Continue",
        onclick: () => {
          const textarea = document.getElementById("h-comprehension");
          session.trial.comprehension_text = textarea ? textarea.value : "";
          renderConfidence();
        },
      }),
    ])
  );
  app.appendChild(card);
}

const CONFIDENCE_LABELS = [
  "Not at all sure",
  "Slightly sure",
  "Moderately sure",
  "Very sure",
  "Completely sure",
];

function renderConfidence() {
  clearApp();
  const card = el("div", { class: "h-card" });
  renderProgress(card);
  card.appendChild(el("h2", { text: "How sure are you about that" }));

  const groupName = "h-confidence";
  const group = el("div", {
    class: "h-radiogroup",
    role: "radiogroup",
    "aria-label": "Confidence",
  });
  CONFIDENCE_LABELS.forEach((label, i) => {
    const value = i + 1;
    const id = `${groupName}-${value}`;
    group.appendChild(
      el("label", { for: id }, [
        el("input", { type: "radio", id, name: groupName, value: String(value) }),
        `${value}. ${label}`,
      ])
    );
  });
  card.appendChild(group);

  card.appendChild(
    el("div", { class: "h-actions" }, [
      el("button", {
        class: "h-btn h-btn--primary",
        text: "Continue",
        onclick: () => {
          const checked = card.querySelector(`input[name="${groupName}"]:checked`);
          session.trial.confidence = checked ? parseInt(checked.value, 10) : null;
          finishTrial();
        },
      }),
    ])
  );
  app.appendChild(card);
}

function finishTrial() {
  const trial = { ...session.trial };
  delete trial.shownAt;
  store.trials.push(trial);
  saveStore(store);
  session.trial = null;
  session.taskCursor += 1;
  if (session.taskCursor < session.order.length) {
    renderTaskSetup();
  } else {
    renderDone();
  }
}

function renderDone() {
  clearApp();
  const card = el("div", { class: "h-card" }, [
    el("h1", { text: "That is everything" }),
    el("div", { class: "h-prose" }, [
      el("p", { text: "Thank you. Your responses are stored in this browser only." }),
    ]),
  ]);
  app.appendChild(card);
}

// ---- researcher view ---------------------------------------------------------

const TRIAL_FIELDS = [
  "participant_id",
  "task_id",
  "condition",
  "order_index",
  "decision",
  "ms_to_decision",
  "opened_details",
  "reported",
  "comprehension_text",
  "confidence",
  "timestamp",
];

function renderResults() {
  clearApp();
  const card = el("div", { class: "h-card" });
  card.style.maxWidth = "none";
  card.appendChild(el("h1", { text: "Researcher view" }));
  card.appendChild(
    el("p", { class: "h-prose", text: `${store.trials.length} trial(s) recorded in this browser.` })
  );

  const wrap = el("div", { class: "h-table-wrap" });
  const table = el("table", { class: "h-table" });
  const thead = el("tr");
  TRIAL_FIELDS.forEach((f) => thead.appendChild(el("th", { text: f })));
  table.appendChild(el("thead", {}, [thead]));
  const tbody = el("tbody");
  for (const trial of store.trials) {
    const row = el("tr");
    TRIAL_FIELDS.forEach((f) => row.appendChild(el("td", { text: String(trial[f] ?? "") })));
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  card.appendChild(wrap);

  const actions = el("div", { class: "h-actions" });
  actions.appendChild(
    el("button", {
      class: "h-btn h-btn--primary",
      text: "Export CSV",
      onclick: exportCSV,
    })
  );

  const clearBtn = el("button", { class: "h-btn", text: "Clear data" });
  const confirmWrap = el("div");
  clearBtn.addEventListener("click", () => {
    confirmWrap.textContent = "";
    confirmWrap.appendChild(
      el("div", { class: "h-confirm" }, [
        el("p", { text: "This removes every trial stored in this browser. This cannot be undone." }),
        el("div", { class: "h-actions" }, [
          el("button", {
            class: "h-btn h-btn--primary",
            text: "Yes, clear data",
            onclick: () => {
              store.trials = [];
              saveStore(store);
              renderResults();
            },
          }),
          el("button", {
            class: "h-btn",
            text: "Cancel",
            onclick: () => {
              confirmWrap.textContent = "";
            },
          }),
        ]),
      ])
    );
  });
  actions.appendChild(clearBtn);
  card.appendChild(actions);
  card.appendChild(confirmWrap);

  app.appendChild(card);
}

function exportCSV() {
  const csv = toCSV(store.trials.map((t) => {
    const row = {};
    TRIAL_FIELDS.forEach((f) => (row[f] = t[f]));
    return row;
  }));
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "unobeyable-harness-export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
