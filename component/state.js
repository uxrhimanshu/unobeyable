// Pure, DOM-free view-state logic for <trust-warning>. No imports, no
// storage, no rendering: this file only ever gets an event in and a new
// state out, so it can be exercised directly by node --test.
//
// View states:
//   warning   - the first screen (or the notice indicator's default content)
//   comparing - fingerprint comparison expanded (local-unverifiable only)
//   reviewing - second screen of a changed-after-trust stop
//   reporting - the report draft is visible
//   sent      - the report was "sent" (nothing is transmitted, this is a prototype)
//   done      - resolved: trusted / went back / continued / forgotten
//
// `outcome` records what "done" means, so tests (and the harness) can tell
// a trust outcome apart from a retreat without re-deriving it from `action`.

export function initialState(result) {
  return {
    result,
    situation: result.situation,
    severity: result.severity,
    view: "warning",
    error: null,
    outcome: null,
  };
}

/**
 * Does `value` (whitespace/colons ignored, case-insensitive) equal the last
 * four hex characters of `fingerprint`?
 */
export function matchesFingerprint(value, fingerprint) {
  const norm = (s) => String(s || "").replace(/[:\s]/g, "").toLowerCase();
  const v = norm(value);
  const fp = norm(fingerprint);
  if (!v || !fp) return false;
  return v === fp.slice(-4);
}

const TRUST_ACTIONS = new Set(["trust-device"]);
const RETREAT_ACTIONS = new Set(["go-back", "forget"]);
const CONTINUE_ACTIONS = new Set(["continue-to-network-page", "sign-in-anyway"]);

export function reduce(state, event) {
  switch (event.type) {
    case "action":
      return applyAction(state, event.action);

    case "compare-toggle":
      return { ...state, view: state.view === "comparing" ? "warning" : "comparing", error: null };

    case "review-submit": {
      if (matchesFingerprint(event.value, event.fingerprint)) {
        return { ...state, view: "done", outcome: "trusted", error: null };
      }
      return { ...state, view: "reviewing", error: "mismatch" };
    }

    case "report-send":
      return { ...state, view: "sent" };

    case "report-cancel":
      return { ...state, view: "warning", error: null };

    default:
      return state;
  }
}

function applyAction(state, action) {
  switch (action) {
    case "compare-fingerprint":
      return { ...state, view: "comparing", error: null };
    case "review-change":
      return { ...state, view: "reviewing", error: null };
    case "report":
      return { ...state, view: "reporting", error: null };
    default:
      break;
  }
  if (TRUST_ACTIONS.has(action)) return { ...state, view: "done", outcome: "trusted" };
  if (RETREAT_ACTIONS.has(action)) return { ...state, view: "done", outcome: "went-back" };
  if (CONTINUE_ACTIONS.has(action)) return { ...state, view: "done", outcome: "continued" };
  return state;
}
