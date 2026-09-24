import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COPY, SEVERITY_LABEL, fill } from "../component/copy.js";
import { SITUATION, classify } from "../component/classify.js";
import principles from "../principles.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Every situation classify can return, except "ok" and "link-opened" (both
// silent, no COPY entry needed).
const SITUATIONS_NEEDING_COPY = Object.values(SITUATION).filter(
  (s) => s !== SITUATION.OK && s !== SITUATION.LINK_OPENED
);

test("every situation classify can return (except ok, link-opened) has a COPY entry", () => {
  for (const situation of SITUATIONS_NEEDING_COPY) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(COPY, situation),
      `COPY missing entry for situation "${situation}"`
    );
  }
});

// Build situation -> possible actions[] by exercising classify with contexts
// that are known (from classify.test.js / the spec) to hit each situation.
const SAMPLE_CONTEXTS = [
  { kind: "tls", host: "192.168.1.40", certProblem: "self-signed", fingerprint: "A", accepted: null },
  { kind: "tls", host: "192.168.1.40", certProblem: "self-signed", fingerprint: "A", accepted: { fingerprint: "A", acceptedAt: "x" } },
  { kind: "tls", host: "nas.home.arpa", certProblem: "self-signed", fingerprint: "B", accepted: { fingerprint: "A", acceptedAt: "x" } },
  { kind: "tls", host: "build-07.corp.internal", certProblem: "self-signed", fingerprint: "B", publicKey: "k1", accepted: { fingerprint: "A", publicKey: "k1", acceptedAt: "x" } },
  { kind: "tls", host: "news.example", certProblem: "untrusted-issuer", fingerprint: "C", issuer: "Fortinet FortiGate CA", issuerIsInspectionProduct: true, accepted: null },
  { kind: "tls", host: "example.com", certProblem: "name-mismatch", fingerprint: "X", accepted: null },
  { kind: "link", host: "benefits-survey.example", credentialFieldFocused: true, signedInHereBefore: false, orgListed: false },
];

test("every action any situation can return has a label in that situation's actions", () => {
  for (const ctx of SAMPLE_CONTEXTS) {
    const result = classify(ctx);
    if (result.situation === SITUATION.OK || result.situation === SITUATION.LINK_OPENED) continue;
    const copy = COPY[result.situation];
    assert.ok(copy, `no COPY entry for ${result.situation}`);
    for (const action of result.actions) {
      assert.ok(
        copy.actions && Object.prototype.hasOwnProperty.call(copy.actions, action),
        `COPY["${result.situation}"].actions missing label for action "${action}"`
      );
    }
  }
});

// Collect every string value in COPY (recursively) for the banned-content and
// placeholder checks.
function collectStrings(obj, out = []) {
  if (typeof obj === "string") {
    out.push(obj);
  } else if (Array.isArray(obj)) {
    for (const v of obj) collectStrings(v, out);
  } else if (obj && typeof obj === "object") {
    for (const v of Object.values(obj)) collectStrings(v, out);
  }
  return out;
}

const ALL_COPY_STRINGS = collectStrings(COPY);
const ALL_SEVERITY_LABEL_STRINGS = collectStrings(SEVERITY_LABEL);
const ALL_STRINGS = [...ALL_COPY_STRINGS, ...ALL_SEVERITY_LABEL_STRINGS];

test("no copy string contains U+2014", () => {
  for (const s of ALL_STRINGS) {
    assert.ok(!s.includes("\u2014"), `em-dash found in: ${s}`);
  }
});

test('no copy string contains "!"', () => {
  for (const s of ALL_STRINGS) {
    assert.ok(!s.includes("!"), `exclamation mark found in: ${s}`);
  }
});

test('no copy string contains "secure" as a whole word (case-insensitive)', () => {
  const re = /\bsecure\b/i;
  for (const s of ALL_STRINGS) {
    assert.ok(!re.test(s), `"secure" found in: ${s}`);
  }
});

test('no copy string contains "Warning:"', () => {
  for (const s of ALL_STRINGS) {
    assert.ok(!/warning:/i.test(s), `"Warning:" found in: ${s}`);
  }
});

const KNOWN_PLACEHOLDERS = new Set([
  "host",
  "fingerprint",
  "acceptedFingerprint",
  "acceptedAt",
  "issuer",
  "org",
  "orgTeam",
  "reportName",
  "changes",
]);

test("every {placeholder} used in copy is one of the known set", () => {
  const re = /\{(\w+)\}/g;
  for (const s of ALL_STRINGS) {
    let m;
    while ((m = re.exec(s))) {
      assert.ok(
        KNOWN_PLACEHOLDERS.has(m[1]),
        `unknown placeholder {${m[1]}} in: ${s}`
      );
    }
  }
});

test("fill() replaces known placeholders", () => {
  assert.equal(fill("{host} said hello", { host: "example.com" }), "example.com said hello");
  assert.equal(fill("{missing} stays", {}), "{missing} stays");
});

test("if prototypes/principles.js exists, its data deep-equals principles.json", async () => {
  const principlesJsPath = path.join(ROOT, "prototypes", "principles.js");
  if (!fs.existsSync(principlesJsPath)) {
    // Agent A's file; may not exist yet or ever. Nothing to check.
    return;
  }
  const mod = await import(principlesJsPath);
  const exported = mod.default ?? mod.principles ?? mod.PRINCIPLES;
  assert.deepEqual(exported, principles);
});
