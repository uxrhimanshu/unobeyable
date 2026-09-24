import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { initialState, reduce, matchesFingerprint } from "../component/state.js";
import { classify, SEVERITY, ACTION } from "../component/classify.js";
import { SCENARIOS } from "../prototypes/scenarios.js";

function resultFor(situation) {
  for (const scenario of SCENARIOS) {
    for (const step of scenario.steps) {
      const r = classify(step.ctx);
      if (r.situation === situation) return r;
    }
  }
  throw new Error(`no scenario step produces situation ${situation}`);
}

describe("initialState", () => {
  test("starts on the warning view with no error or outcome", () => {
    const result = resultFor("local-unverifiable");
    const state = initialState(result);
    assert.equal(state.view, "warning");
    assert.equal(state.error, null);
    assert.equal(state.outcome, null);
    assert.equal(state.result, result);
    assert.equal(state.situation, result.situation);
    assert.equal(state.severity, result.severity);
  });
});

describe("matchesFingerprint", () => {
  const fp = "4F:9C:1E:77:0B:D2:58:A3:6E:21:C4:90:3B:7F:E8:15:A6:2D:94:C0:71:5E:B8:03:DA:6F:42:19:8C:E7:30:5B";

  test("matches the last four hex characters", () => {
    assert.equal(matchesFingerprint("305B", fp), true);
  });

  test("is case-insensitive", () => {
    assert.equal(matchesFingerprint("305b", fp), true);
    assert.equal(matchesFingerprint("305B", fp.toLowerCase()), true);
  });

  test("ignores colons and spaces in the typed value", () => {
    assert.equal(matchesFingerprint("30:5B", fp), true);
    assert.equal(matchesFingerprint("30 5B", fp), true);
    assert.equal(matchesFingerprint(" 3 0 5 B ", fp), true);
  });

  test("rejects a mismatch", () => {
    assert.equal(matchesFingerprint("0000", fp), false);
  });

  test("rejects empty input", () => {
    assert.equal(matchesFingerprint("", fp), false);
    assert.equal(matchesFingerprint(null, fp), false);
  });
});

describe("action events", () => {
  test("compare-fingerprint moves local-unverifiable into comparing", () => {
    const result = resultFor("local-unverifiable");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.COMPARE_FINGERPRINT });
    assert.equal(state.view, "comparing");
    assert.equal(state.outcome, null);
  });

  test("trust-device resolves to done/trusted", () => {
    const result = resultFor("local-unverifiable");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.TRUST_DEVICE });
    assert.equal(state.view, "done");
    assert.equal(state.outcome, "trusted");
  });

  test("go-back resolves to done/went-back, never trusted", () => {
    const result = resultFor("changed-after-trust");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.GO_BACK });
    assert.equal(state.view, "done");
    assert.equal(state.outcome, "went-back");
  });

  test("forget resolves to done/went-back", () => {
    const result = resultFor("remembered");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.FORGET });
    assert.equal(state.view, "done");
    assert.equal(state.outcome, "went-back");
  });

  test("report moves to reporting regardless of situation", () => {
    const result = resultFor("inspected-by-network");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.REPORT });
    assert.equal(state.view, "reporting");
  });

  test("continue-to-network-page resolves to done/continued", () => {
    const result = resultFor("inspected-by-network");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.CONTINUE_TO_NETWORK_PAGE });
    assert.equal(state.view, "done");
    assert.equal(state.outcome, "continued");
  });

  test("sign-in-anyway resolves to done/continued", () => {
    const result = resultFor("credential-on-unfamiliar");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.SIGN_IN_ANYWAY });
    assert.equal(state.view, "done");
    assert.equal(state.outcome, "continued");
  });

  test("review-change moves changed-after-trust into reviewing", () => {
    const result = resultFor("changed-after-trust");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.REVIEW_CHANGE });
    assert.equal(state.view, "reviewing");
  });

  test("an unknown action leaves the state unchanged", () => {
    const result = resultFor("local-unverifiable");
    const state = initialState(result);
    const next = reduce(state, { type: "action", action: "not-a-real-action" });
    assert.deepEqual(next, state);
  });
});

describe("compare-toggle", () => {
  test("toggles warning <-> comparing", () => {
    const result = resultFor("local-unverifiable");
    let state = initialState(result);
    state = reduce(state, { type: "compare-toggle" });
    assert.equal(state.view, "comparing");
    state = reduce(state, { type: "compare-toggle" });
    assert.equal(state.view, "warning");
  });

  test("clears any pending error", () => {
    const result = resultFor("changed-after-trust");
    let state = initialState(result);
    state = { ...state, view: "reviewing", error: "mismatch" };
    state = reduce(state, { type: "compare-toggle" });
    assert.equal(state.error, null);
  });
});

describe("review-submit", () => {
  const fingerprint = "B1:07:6A:E4:3C:98:25:DF:10:7B:C6:52:E9:84:0D:A7:3F:61:9E:28:C5:4A:B3:76:1D:E0:8F:52:97:6C:0A:E3";

  test("a matching value resolves to done/trusted", () => {
    const result = resultFor("changed-after-trust");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.REVIEW_CHANGE });
    state = reduce(state, { type: "review-submit", value: "0AE3", fingerprint });
    assert.equal(state.view, "done");
    assert.equal(state.outcome, "trusted");
    assert.equal(state.error, null);
  });

  test("matching is case-insensitive and ignores colons/spaces", () => {
    const result = resultFor("changed-after-trust");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.REVIEW_CHANGE });
    state = reduce(state, { type: "review-submit", value: "0a:e3", fingerprint });
    assert.equal(state.view, "done");
    assert.equal(state.outcome, "trusted");
  });

  test("a mismatch stays in reviewing with an error, never done", () => {
    const result = resultFor("changed-after-trust");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.REVIEW_CHANGE });
    state = reduce(state, { type: "review-submit", value: "0000", fingerprint });
    assert.equal(state.view, "reviewing");
    assert.equal(state.error, "mismatch");
    assert.equal(state.outcome, null);
  });
});

describe("report-send / report-cancel", () => {
  test("report-send moves reporting to sent", () => {
    const result = resultFor("local-unverifiable");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.REPORT });
    state = reduce(state, { type: "report-send" });
    assert.equal(state.view, "sent");
  });

  test("report-cancel returns to warning from reporting", () => {
    const result = resultFor("local-unverifiable");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.REPORT });
    state = reduce(state, { type: "report-cancel" });
    assert.equal(state.view, "warning");
  });

  test("report-cancel returns to warning from reviewing (Escape semantics)", () => {
    const result = resultFor("changed-after-trust");
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.REVIEW_CHANGE });
    state = reduce(state, { type: "report-cancel" });
    assert.equal(state.view, "warning");
  });
});

describe("stop situations can never be trusted without a successful review-submit", () => {
  const stopResults = {
    "changed-after-trust": resultFor("changed-after-trust"),
    "public-invalid": classify({ kind: "tls", host: "example.com", certProblem: "expired", fingerprint: "AA:BB" }),
  };

  function allEventsFrom(result) {
    const fingerprint = result.reportTo ? "irrelevant" : "irrelevant";
    return [
      { type: "action", action: ACTION.GO_BACK },
      { type: "action", action: ACTION.REPORT },
      { type: "action", action: ACTION.REVIEW_CHANGE },
      { type: "compare-toggle" },
      { type: "review-submit", value: "0000", fingerprint },
      { type: "report-send" },
      { type: "report-cancel" },
    ];
  }

  for (const [situation, result] of Object.entries(stopResults)) {
    test(`${situation}: every action in result.actions is a retreat, never a direct trust`, () => {
      assert.equal(result.severity, "stop");
      assert.equal(result.actions[0], ACTION.GO_BACK, "first action for every stop is go-back");
      assert.ok(!result.actions.includes(ACTION.TRUST_DEVICE));
      assert.ok(!result.actions.includes(ACTION.SIGN_IN_ANYWAY));
    });
  }

  test("changed-after-trust: no random sequence of events reaches done/trusted without a matching review-submit", () => {
    const result = resultFor("changed-after-trust");
    const events = allEventsFrom(result);
    // Exhaustively try every sequence of length <= 4 built from the fixed
    // event vocabulary (excluding review-submit with the real fingerprint,
    // which is the one legitimate path) and assert none of them trust.
    const withoutRealSubmit = events; // review-submit above uses a wrong value
    function explore(state, depth) {
      if (state.view === "done") {
        if (state.outcome === "trusted") {
          throw new Error("reached done/trusted without a successful review-submit");
        }
        return;
      }
      if (depth === 0) return;
      for (const event of withoutRealSubmit) {
        explore(reduce(state, event), depth - 1);
      }
    }
    explore(initialState(result), 4);
  });

  test("changed-after-trust: review-submit with the correct fingerprint is the only way to reach done/trusted", () => {
    const result = resultFor("changed-after-trust");
    // Find the real fingerprint from the scenario this result came from.
    let realFingerprint = null;
    for (const scenario of SCENARIOS) {
      for (const step of scenario.steps) {
        const r = classify(step.ctx);
        if (r.situation === "changed-after-trust" && step.ctx.fingerprint) {
          realFingerprint = step.ctx.fingerprint;
        }
      }
    }
    assert.ok(realFingerprint, "fixture must provide a fingerprint");
    const last4 = realFingerprint.replace(/:/g, "").slice(-4);
    let state = initialState(result);
    state = reduce(state, { type: "action", action: ACTION.REVIEW_CHANGE });
    state = reduce(state, { type: "review-submit", value: last4, fingerprint: realFingerprint });
    assert.equal(state.view, "done");
    assert.equal(state.outcome, "trusted");
  });
});
