// The five scenarios every prototype, harness task and test draws on.
// Each is grounded in a clicked-through code; `evidence` names the item that
// describes it. Hostnames, fingerprints and organisations are invented.

const FP_A = "4F:9C:1E:77:0B:D2:58:A3:6E:21:C4:90:3B:7F:E8:15:A6:2D:94:C0:71:5E:B8:03:DA:6F:42:19:8C:E7:30:5B";
const FP_B = "B1:07:6A:E4:3C:98:25:DF:10:7B:C6:52:E9:84:0D:A7:3F:61:9E:28:C5:4A:B3:76:1D:E0:8F:52:97:6C:0A:E3";
const FP_C = "2E:A8:53:C1:9F:06:7D:B4:38:E5:12:6A:F7:0C:95:4B:D8:21:6E:A3:57:BC:04:F9:83:1A:C6:7E:25:D0:9B:44";
const KEY_1 = "spki:7d1f0a";
const KEY_2 = "spki:c02e98";

export const SCENARIOS = [
  {
    id: "printer",
    name: "A printer on the office network",
    code: "warning-cannot-be-satisfied",
    evidence: "26584730",
    setup: "You are in the office and want to check the toner level on the shared printer. You type its address into the browser.",
    today: { headline: "Your connection is not private", code: "ERR_CERT_AUTHORITY_INVALID" },
    steps: [
      { state: "first", label: "First visit", ctx: { kind: "tls", host: "192.168.1.40", certProblem: "self-signed", fingerprint: FP_A, publicKey: KEY_1, issuer: "192.168.1.40", accepted: null } },
      { state: "remembered", label: "Next visit, after trusting it", ctx: { kind: "tls", host: "192.168.1.40", certProblem: "self-signed", fingerprint: FP_A, publicKey: KEY_1, issuer: "192.168.1.40", accepted: { fingerprint: FP_A, publicKey: KEY_1, acceptedAt: "3 March 2026" } } },
    ],
  },
  {
    id: "changed",
    name: "A trusted device shows a new certificate",
    code: "removing-the-warning-is-the-goal",
    evidence: "36508087",
    setup: "You visit the storage box on your home network, as you do most days. You trusted it months ago.",
    today: { headline: "Your connection is not private", code: "ERR_CERT_AUTHORITY_INVALID" },
    steps: [
      { state: "changed", label: "The certificate has changed", ctx: { kind: "tls", host: "nas.home.arpa", certProblem: "self-signed", fingerprint: FP_B, publicKey: KEY_2, issuer: "nas.home.arpa", accepted: { fingerprint: FP_A, publicKey: KEY_1, acceptedAt: "14 January 2026" } } },
    ],
  },
  {
    id: "inspection",
    name: "A school network inspecting traffic",
    code: "sanctioned-mitm",
    evidence: "41480034",
    setup: "You are on your own laptop, on the campus wifi, opening a news site.",
    today: { headline: "Your connection is not private", code: "NET::ERR_CERT_AUTHORITY_INVALID" },
    steps: [
      { state: "first", label: "First visit", ctx: { kind: "tls", host: "news.example", certProblem: "untrusted-issuer", fingerprint: FP_C, publicKey: KEY_2, issuer: "Fortinet FortiGate CA", issuerIsInspectionProduct: true, accepted: null, admin: { name: "Campus IT", contact: "it-help@campus.example" } } },
    ],
  },
  {
    id: "renewal",
    name: "An internal server that renews its certificate",
    code: "habituation-by-design",
    evidence: "41436340",
    setup: "You connect to a build server at work that you have used for a year. Its certificate is generated automatically and expires every six months.",
    today: { headline: "The identity of the remote computer cannot be verified", code: "CERT_EXPIRED" },
    steps: [
      { state: "renewed-same-key", label: "Renewed with the same key", ctx: { kind: "tls", host: "build-07.corp.internal", certProblem: "self-signed", fingerprint: FP_B, publicKey: KEY_1, issuer: "build-07", accepted: { fingerprint: FP_A, publicKey: KEY_1, acceptedAt: "2 April 2026" }, admin: { name: "Platform team", contact: "platform@corp.example" } } },
      { state: "renewed-new-key", label: "Renewed with a new key", ctx: { kind: "tls", host: "build-07.corp.internal", certProblem: "self-signed", fingerprint: FP_C, publicKey: KEY_2, issuer: "build-07", accepted: { fingerprint: FP_A, publicKey: KEY_1, acceptedAt: "2 April 2026" }, admin: { name: "Platform team", contact: "platform@corp.example" }, renewalChanges: 2 } },
    ],
  },
  {
    id: "phishing",
    name: "A link to an unfamiliar sign-in page",
    code: "control-teaches-opposite",
    evidence: "45530891",
    setup: "An email from HR asks you to complete a benefits survey. The link goes through a shortener to a survey site you haven’t used.",
    today: { headline: "Suspicious link", code: "Clicking this link has been reported to your security team." },
    steps: [
      { state: "link-opened", label: "Opening the link", ctx: { kind: "link", host: "benefits-survey.example", credentialFieldFocused: false, signedInHereBefore: false, orgListed: false, org: "Northwind", orgTeam: "Northwind IT", admin: { name: "Northwind IT", contact: "it@northwind.example" } } },
      { state: "credential", label: "Typing a password", ctx: { kind: "link", host: "benefits-survey.example", credentialFieldFocused: true, signedInHereBefore: false, orgListed: false, org: "Northwind", orgTeam: "Northwind IT", admin: { name: "Northwind IT", contact: "it@northwind.example" } } },
    ],
  },
];
