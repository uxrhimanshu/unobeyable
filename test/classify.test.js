import test from "node:test";
import assert from "node:assert/strict";
import { classify, isPrivateHost, reportBody, SEVERITY, ACTION } from "../component/classify.js";
import { SCENARIOS } from "../prototypes/scenarios.js";

// Map scenario step "state" to expected situation/severity, per the spec's
// enumeration of scenario steps.
const EXPECTED = {
  first: { situation: "local-unverifiable", severity: "caution" },       // printer first visit
  remembered: { situation: "remembered", severity: "notice" },
  changed: { situation: "changed-after-trust", severity: "stop" },
  "renewed-same-key": { situation: "renewed-same-key", severity: "notice" },
  "renewed-new-key": { situation: "changed-after-trust", severity: "stop" },
  "link-opened": { situation: "link-opened", severity: "none" },
  credential: { situation: "credential-on-unfamiliar", severity: "caution" },
};

// The inspection scenario's single step is named "first" too, but it must
// classify as inspected-by-network/caution rather than local-unverifiable.
// Disambiguate by scenario id.
function expectedFor(scenarioId, step) {
  if (scenarioId === "inspection") {
    return { situation: "inspected-by-network", severity: "caution" };
  }
  return EXPECTED[step.state];
}

test("every scenario step maps to its expected situation/severity", () => {
  for (const scenario of SCENARIOS) {
    for (const step of scenario.steps) {
      const expected = expectedFor(scenario.id, step);
      assert.ok(expected, `no expectation registered for ${scenario.id}/${step.state}`);
      const result = classify(step.ctx);
      assert.equal(
        result.situation,
        expected.situation,
        `${scenario.id}/${step.state}: situation`
      );
      assert.equal(
        result.severity,
        expected.severity,
        `${scenario.id}/${step.state}: severity`
      );
    }
  }
});

test("public host with an invalid cert -> public-invalid/stop", () => {
  const result = classify({
    kind: "tls",
    host: "example.com",
    certProblem: "name-mismatch",
    fingerprint: "AA:BB",
    accepted: null,
  });
  assert.equal(result.situation, "public-invalid");
  assert.equal(result.severity, "stop");
});

test("changed cert on a private host with an inspection issuer is still changed-after-trust (P6 precedence)", () => {
  const result = classify({
    kind: "tls",
    host: "192.168.1.40",
    certProblem: "untrusted-issuer",
    fingerprint: "NEWFP",
    issuer: "Fortinet FortiGate CA",
    issuerIsInspectionProduct: true,
    accepted: { fingerprint: "OLDFP", acceptedAt: "1 January 2026" },
  });
  assert.equal(result.situation, "changed-after-trust");
  assert.equal(result.severity, "stop");
});

test("isPrivateHost table", () => {
  const cases = [
    ["10.1.2.3", true],
    ["172.16.0.1", true],
    ["172.31.255.255", true],
    ["172.32.0.1", false],
    ["192.168.1.1", true],
    ["169.254.1.1", true],
    ["100.64.0.1", true],
    ["8.8.8.8", false],
    ["printer.local", true],
    ["nas.home.arpa", true],
    ["fd12:3456:789a::1", true],
    ["example.com", false],
    ["256.1.1.1", false],
  ];
  for (const [host, expected] of cases) {
    assert.equal(isPrivateHost(host), expected, `isPrivateHost(${host})`);
  }
});

test("first action for every stop situation is go-back", () => {
  const stopContexts = [
    { kind: "tls", host: "nas.home.arpa", certProblem: "self-signed", fingerprint: "B",
      accepted: { fingerprint: "A", acceptedAt: "x" } }, // changed-after-trust
    { kind: "tls", host: "example.com", certProblem: "name-mismatch", fingerprint: "X",
      accepted: null }, // public-invalid
  ];
  for (const ctx of stopContexts) {
    const result = classify(ctx);
    assert.equal(result.severity, SEVERITY.STOP);
    assert.equal(result.actions[0], ACTION.GO_BACK);
  }
});

test("no stop result ever includes trust-device or sign-in-anyway", () => {
  const stopContexts = [
    { kind: "tls", host: "nas.home.arpa", certProblem: "self-signed", fingerprint: "B",
      accepted: { fingerprint: "A", acceptedAt: "x" } },
    { kind: "tls", host: "example.com", certProblem: "name-mismatch", fingerprint: "X",
      accepted: null },
  ];
  for (const ctx of stopContexts) {
    const result = classify(ctx);
    assert.equal(result.severity, SEVERITY.STOP);
    assert.ok(!result.actions.includes(ACTION.TRUST_DEVICE));
    assert.ok(!result.actions.includes(ACTION.SIGN_IN_ANYWAY));
  }
});

test("reportBody includes the fingerprint and the previously accepted fingerprint when present", () => {
  const ctx = {
    kind: "tls",
    host: "nas.home.arpa",
    certProblem: "self-signed",
    fingerprint: "NEWFP123",
    accepted: { fingerprint: "OLDFP456", acceptedAt: "14 January 2026" },
  };
  const result = classify(ctx);
  const body = reportBody(ctx, result, new Date("2026-01-01T00:00:00.000Z"));
  assert.match(body, /NEWFP123/);
  assert.match(body, /OLDFP456/);
});

test("reportBody omits accepted fingerprint lines when there is no prior acceptance", () => {
  const ctx = {
    kind: "tls",
    host: "example.com",
    certProblem: "name-mismatch",
    fingerprint: "SOLOFP",
    accepted: null,
  };
  const result = classify(ctx);
  const body = reportBody(ctx, result, new Date("2026-01-01T00:00:00.000Z"));
  assert.match(body, /SOLOFP/);
  assert.doesNotMatch(body, /Previously accepted fingerprint/);
});
