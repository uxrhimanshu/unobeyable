// Behaviour for component/index.html: the states grid, the anatomy diagram's
// numbered callouts, and the theme toggle. Everything here is display logic
// for the documentation page; classify.js and copy.js stay untouched.

import { classify } from "./classify.js";
import { SCENARIOS } from "../prototypes/scenarios.js";
import "./trust-warning.js";
import { initThemeToggle } from "./theme.js";

initThemeToggle(document);

// -- States: one <trust-warning> per distinct situation in scenarios.js ----

function collectSituations() {
  const seen = new Map();
  for (const scenario of SCENARIOS) {
    for (const step of scenario.steps) {
      const result = classify(step.ctx);
      if (!seen.has(result.situation)) seen.set(result.situation, step.ctx);
    }
  }
  return seen;
}

const statesGrid = document.getElementById("states-grid");
if (statesGrid) {
  for (const [situation, ctx] of collectSituations()) {
    const card = document.createElement("div");
    card.className = "state-card";
    const label = document.createElement("p");
    label.className = "state-label";
    label.textContent = situation;
    card.appendChild(label);

    const tw = document.createElement("trust-warning");
    tw.context = ctx;
    tw.open = true;
    card.appendChild(tw);

    if (!tw.result || tw.result.severity === "none") {
      const note = document.createElement("p");
      note.className = "state-note";
      note.textContent = "Severity none: renders nothing. This situation is silent by design.";
      card.appendChild(note);
    }

    statesGrid.appendChild(card);
  }
}

// -- Anatomy: numbered callouts computed against a real rendered panel ------

const anatomySlot = document.getElementById("anatomy-panel");
const anatomyCallouts = document.getElementById("anatomy-callouts");

if (anatomySlot && anatomyCallouts) {
  const tw = document.createElement("trust-warning");
  tw.context = {
    kind: "tls",
    host: "192.168.1.40",
    certProblem: "self-signed",
    fingerprint: "4F:9C:1E:77:0B:D2:58:A3:6E:21:C4:90:3B:7F:E8:15:A6:2D:94:C0:71:5E:B8:03:DA:6F:42:19:8C:E7:30:5B",
    publicKey: "spki:7d1f0a",
    issuer: "192.168.1.40",
    accepted: null,
  };
  tw.open = true;
  anatomySlot.appendChild(tw);

  const parts = [
    { selector: ".tw-severity-row", label: "Severity row: icon (shape, not just colour) + label" },
    { selector: ".tw-title", label: "Title: what is happening" },
    { selector: ".tw-body", label: "Body: what the browser knows, then what it can't know" },
    { selector: ".tw-detail", label: "Detail block: the fingerprint, mono, grouped to break cleanly" },
    { selector: ".tw-actions", label: "Actions: primary first, always in DOM order" },
    { selector: ".tw-after", label: "After text: a small, muted addendum" },
  ];

  function placeCallouts() {
    anatomyCallouts.innerHTML = "";
    anatomySlot.querySelectorAll(".anatomy-badge").forEach((b) => b.remove());
    const wrapRect = anatomySlot.getBoundingClientRect();
    let n = 0;
    for (const part of parts) {
      const el = anatomySlot.querySelector(part.selector);
      if (!el) continue;
      n += 1;
      const rect = el.getBoundingClientRect();
      const top = rect.top - wrapRect.top + rect.height / 2;

      const badge = document.createElement("span");
      badge.className = "anatomy-badge";
      badge.style.top = `${top}px`;
      badge.textContent = String(n);
      anatomySlot.appendChild(badge);

      const li = document.createElement("li");
      li.innerHTML = `<span class="anatomy-num">${n}</span> ${part.label}`;
      anatomyCallouts.appendChild(li);
    }
  }

  // Layout needs a frame to settle (fonts, panel entry animation) before
  // measuring; re-run on resize too since callouts are position: absolute.
  requestAnimationFrame(() => requestAnimationFrame(placeCallouts));
  window.addEventListener("resize", placeCallouts);
}
