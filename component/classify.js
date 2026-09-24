// classify(context) decides which situation a connection is in, and so which
// warning (if any) it gets. It is the design argument in executable form: every
// branch below cites the principle it implements (see PRINCIPLES.md).
//
// Pure function, no DOM, no storage. Runs in the browser and under `node --test`.

export const SEVERITY = Object.freeze({
  NONE: "none",       // no interrupt, no indicator
  NOTICE: "notice",   // no interrupt; a quiet persistent indicator (P4)
  CAUTION: "caution", // interrupt; proceeding is a reasonable, remembered choice
  STOP: "stop",       // interrupt; no proceed on the first screen
});

// The situations a warning can be about. Each has its own copy in copy.js.
export const SITUATION = Object.freeze({
  OK: "ok",
  REMEMBERED: "remembered",
  LOCAL_UNVERIFIABLE: "local-unverifiable",
  CHANGED_AFTER_TRUST: "changed-after-trust",
  RENEWED_SAME_KEY: "renewed-same-key",
  INSPECTED_BY_NETWORK: "inspected-by-network",
  PUBLIC_INVALID: "public-invalid",
  LINK_OPENED: "link-opened",
  CREDENTIAL_ON_UNFAMILIAR: "credential-on-unfamiliar",
});

// Actions a warning can offer. The component renders them in the order given;
// the first is the primary (default-focused) action.
export const ACTION = Object.freeze({
  GO_BACK: "go-back",
  TRUST_DEVICE: "trust-device",           // remember host + fingerprint (P3)
  COMPARE_FINGERPRINT: "compare-fingerprint", // the best check that exists (P1)
  REPORT: "report",                       // prefilled, addressed to someone (P5)
  REVIEW_CHANGE: "review-change",         // second screen of a STOP (P6)
  CONTINUE_TO_NETWORK_PAGE: "continue-to-network-page",
  SIGN_IN_ANYWAY: "sign-in-anyway",
  FORGET: "forget",
});

const PRIVATE_V4 = [
  [10, 0, 0, 0, 8], [172, 16, 0, 0, 12], [192, 168, 0, 0, 16],
  [169, 254, 0, 0, 16], [127, 0, 0, 0, 8], [100, 64, 0, 0, 10],
];

/** True for RFC 1918, link-local, loopback, CGNAT, .local / .lan / .home.arpa names. */
export function isPrivateHost(host) {
  if (!host) return false;
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (/\.(local|lan|internal|home\.arpa)$/.test(h) || h === "localhost") return true;
  if (/^(fc|fd)[0-9a-f]{2}:/.test(h) || /^fe80:/.test(h) || h === "::1") return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const ip = m.slice(1).map(Number);
  if (ip.some((o) => o > 255)) return false;
  const n = (ip[0] << 24 >>> 0) + (ip[1] << 16) + (ip[2] << 8) + ip[3];
  return PRIVATE_V4.some(([a, b, c, d, bits]) => {
    const base = (a << 24 >>> 0) + (b << 16) + (c << 8) + d;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return ((n & mask) >>> 0) === ((base & mask) >>> 0);
  });
}

/**
 * @param {object} ctx
 * @param {"tls"|"link"} ctx.kind
 * @param {string} ctx.host
 * For kind "tls":
 * @param {null|"self-signed"|"expired"|"name-mismatch"|"untrusted-issuer"} ctx.certProblem
 * @param {string} ctx.fingerprint        SHA-256 of the presented certificate
 * @param {string} [ctx.publicKey]        SPKI hash of the presented key
 * @param {string} [ctx.issuer]           issuer display name
 * @param {boolean} [ctx.issuerIsInspectionProduct] issuer matches a known TLS-inspection product
 * @param {null|{fingerprint:string, publicKey?:string, acceptedAt:string}} [ctx.accepted]
 *        what the person previously accepted for this host, if anything
 * For kind "link":
 * @param {boolean} ctx.credentialFieldFocused
 * @param {boolean} ctx.signedInHereBefore
 * @param {boolean} ctx.orgListed        the organisation has declared this domain as one it uses
 * @param {boolean} [ctx.signInAnywayChosen]
 * Both:
 * @param {null|{name:string, contact:string}} [ctx.admin] who can fix it (P5)
 * @returns {{situation:string, severity:string, actions:string[], reportTo:null|{name:string, contact:string, role:string}}}
 */
export function classify(ctx) {
  if (ctx.kind === "link") return classifyLink(ctx);
  return classifyTls(ctx);
}

function classifyTls(ctx) {
  const privateHost = isPrivateHost(ctx.host);
  const acc = ctx.accepted || null;

  // P6. A change after trust is the one signal that means the most. Checked
  // before anything else so no later branch can quieten it.
  if (acc && acc.fingerprint !== ctx.fingerprint) {
    // P3. A certificate re-issued with the same key (routine renewal, e.g. an
    // auto-generated server cert that expires every six months) is not the
    // change an attacker makes: an attacker does not hold the private key.
    if (acc.publicKey && ctx.publicKey && acc.publicKey === ctx.publicKey) {
      return out(SITUATION.RENEWED_SAME_KEY, SEVERITY.NOTICE, [ACTION.REPORT, ACTION.FORGET],
        report(ctx, privateHost));
    }
    return out(SITUATION.CHANGED_AFTER_TRUST, SEVERITY.STOP,
      [ACTION.GO_BACK, ACTION.REPORT, ACTION.REVIEW_CHANGE], report(ctx, privateHost));
  }

  // P4. Accepted before, same certificate: no interrupt, but never "secure".
  if (acc && acc.fingerprint === ctx.fingerprint) {
    return out(SITUATION.REMEMBERED, SEVERITY.NOTICE, [ACTION.FORGET], null);
  }

  if (!ctx.certProblem) return out(SITUATION.OK, SEVERITY.NONE, [], null);

  // P2. A known inspection product in the chain means the interception is the
  // network's, not a stranger's. Say who, and do not offer to trust it.
  if (ctx.issuerIsInspectionProduct) {
    return out(SITUATION.INSPECTED_BY_NETWORK, SEVERITY.CAUTION,
      [ACTION.GO_BACK, ACTION.REPORT, ACTION.CONTINUE_TO_NETWORK_PAGE],
      { ...(ctx.admin || { name: "Network administrator", contact: "" }), role: "network" });
  }

  // P1 + P2. First visit to a device on a private network. There is usually no
  // certificate the browser would accept, so say that and offer the check that exists.
  if (privateHost && (ctx.certProblem === "self-signed" || ctx.certProblem === "untrusted-issuer")) {
    return out(SITUATION.LOCAL_UNVERIFIABLE, SEVERITY.CAUTION,
      [ACTION.COMPARE_FINGERPRINT, ACTION.TRUST_DEVICE, ACTION.GO_BACK, ACTION.REPORT],
      report(ctx, true));
  }

  // Out of scope for the redesign: a public site with an invalid certificate
  // keeps today's full-strength warning. The redesign must not weaken it.
  return out(SITUATION.PUBLIC_INVALID, SEVERITY.STOP, [ACTION.GO_BACK, ACTION.REPORT],
    report(ctx, privateHost));
}

function classifyLink(ctx) {
  // P7. Opening a link is ordinary work. Say nothing.
  if (!ctx.credentialFieldFocused) return out(SITUATION.LINK_OPENED, SEVERITY.NONE, [], null);
  if (ctx.signedInHereBefore || ctx.orgListed || ctx.signInAnywayChosen) {
    return out(SITUATION.OK, SEVERITY.NONE, [], null);
  }
  // P7. The harm is the password, so this is where the warning goes.
  return out(SITUATION.CREDENTIAL_ON_UNFAMILIAR, SEVERITY.CAUTION,
    [ACTION.GO_BACK, ACTION.REPORT, ACTION.SIGN_IN_ANYWAY],
    { ...(ctx.admin || { name: "IT team", contact: "" }), role: "it" });
}

function report(ctx, privateHost) {
  if (ctx.admin) return { ...ctx.admin, role: privateHost ? "device-owner" : "site-owner" };
  return privateHost
    ? { name: "Whoever manages this device", contact: "", role: "device-owner" }
    : { name: "The site's owner", contact: "", role: "site-owner" };
}

function out(situation, severity, actions, reportTo) {
  return { situation, severity, actions, reportTo };
}

/**
 * The details a report carries, so nobody writes a ticket from memory (P5).
 * Returns plain text; the component shows it for review before anything is sent.
 */
export function reportBody(ctx, result, now = new Date()) {
  const lines = [
    `What happened: ${result.situation}`,
    `Address: ${ctx.host}`,
    `When: ${now.toISOString()}`,
  ];
  if (ctx.kind !== "link") {
    if (ctx.certProblem) lines.push(`Certificate problem: ${ctx.certProblem}`);
    if (ctx.issuer) lines.push(`Issued by: ${ctx.issuer}`);
    if (ctx.fingerprint) lines.push(`Fingerprint (SHA-256): ${ctx.fingerprint}`);
    if (ctx.accepted) {
      lines.push(`Previously accepted fingerprint: ${ctx.accepted.fingerprint}`);
      lines.push(`Accepted on: ${ctx.accepted.acceptedAt}`);
    }
  }
  return lines.join("\n");
}
