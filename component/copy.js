// Every word the redesigned warnings say, keyed by situation. Placeholders in
// {braces} are filled by fill(). Copy rules are in component/index.html#copy.
//
// Rules this file is held to:
//  - The title says what is happening, not how the reader should feel.
//  - Say what the browser knows and what it cannot know, in that order.
//  - Every action label is a verb phrase that describes its outcome.
//  - "Secure" is never used. The browser only knows "verified" or "not verified".
//  - No exclamation marks, no "Warning:", no "Your connection is not private".

export const SEVERITY_LABEL = {
  notice: "Trusted by you",
  caution: "Needs a decision",
  stop: "Stopped",
};

export const COPY = {
  "local-unverifiable": {
    title: "{host} is a device on your own network",
    body: [
      "Your browser can’t verify devices like printers, routers and storage boxes. They can’t get the kind of certificate it checks, so this message appears for almost all of them. On its own it is not a sign of attack.",
      "You can check it yourself. The device’s screen, label or setup page shows a fingerprint. If it matches the one below, this is the device you meant to reach.",
    ],
    detailLabel: "Fingerprint",
    detail: "{fingerprint}",
    actions: {
      "compare-fingerprint": "Compare fingerprint",
      "trust-device": "Trust this device",
      "go-back": "Go back",
      "report": "Tell whoever manages it",
    },
    after: "If this certificate ever changes, you’ll be stopped and told.",
  },

  "remembered": {
    indicator: "Trusted by you on {acceptedAt}",
    title: "You chose to trust {host}",
    body: [
      "You compared its fingerprint and trusted it on {acceptedAt}. The certificate hasn’t changed since. Your browser still can’t verify it independently, which is why this isn’t shown as verified.",
    ],
    actions: { "forget": "Forget this device" },
  },

  "changed-after-trust": {
    title: "{host} is presenting a different certificate",
    body: [
      "You trusted this device on {acceptedAt}. The certificate it is showing now is not the one you trusted.",
      "This happens when a device is reset or replaced. It is also exactly what an attacker in the middle of your connection would look like, and your browser can’t tell the two apart.",
    ],
    detailLabel: "Trusted",
    detail: "{acceptedFingerprint}",
    detailLabel2: "Now showing",
    detail2: "{fingerprint}",
    actions: {
      "go-back": "Go back",
      "report": "Report this change",
      "review-change": "I changed this device",
    },
    review: {
      title: "Confirm the new certificate",
      body: "Only continue if you reset or replaced this device yourself. Type the last four characters of the fingerprint shown on the device.",
      inputLabel: "Last four characters",
      confirm: "Trust the new certificate",
      mismatch: "Those characters don’t match. Check the device again, or go back.",
    },
  },

  "renewed-same-key": {
    indicator: "Certificate renewed · same key",
    title: "{host} renewed its certificate",
    body: [
      "The certificate changed, but it was issued for the same key you trusted on {acceptedAt}. Someone intercepting your connection wouldn’t have that key, so your trust carries over.",
    ],
    actions: {
      "report": "Tell whoever manages it",
      "forget": "Forget this device",
    },
  },

  "inspected-by-network": {
    title: "This network is inspecting encrypted traffic",
    body: [
      "The certificate for {host} wasn’t issued by {host}. It was issued by {issuer}, a product networks use to inspect or filter traffic. Schools and workplaces do this deliberately.",
      "On a device the network manages, this is set up in advance and you wouldn’t see this message. On your own device, continuing means the network can read what you send.",
    ],
    detailLabel: "Issued by",
    detail: "{issuer}",
    actions: {
      "go-back": "Go back",
      "report": "Ask the network admin",
      "continue-to-network-page": "Continue to the network’s page",
    },
  },

  "public-invalid": {
    title: "{host} can’t prove it is {host}",
    body: [
      "This is a public site, and public sites can get certificates your browser verifies. This one didn’t present a valid one, so someone may be impersonating it.",
    ],
    actions: {
      "go-back": "Go back",
      "report": "Tell the site’s owner",
    },
  },

  "credential-on-unfamiliar": {
    title: "You haven’t signed in to {host} before",
    body: [
      "Neither you nor {org} has used this site for signing in. That doesn’t make it fake, but it is worth ten seconds before you type a password.",
      "Opening the link was fine. The password is what matters.",
    ],
    actions: {
      "go-back": "Leave without signing in",
      "report": "Check with {orgTeam}",
      "sign-in-anyway": "I expected this site",
    },
  },

  report: {
    title: "Send to {reportName}",
    body: "These details are filled in so you don’t have to write them. Nothing is sent until you choose Send.",
    noteLabel: "Anything to add (optional)",
    send: "Send",
    cancel: "Cancel",
    sent: "Sent to {reportName}. You can close this.",
    hint: {
      "renewal-pattern": "This device’s certificate has changed {changes} times in the last year. Each change looks the same as an attack, so people learn to dismiss it. A longer-lived certificate would stop this.",
    },
  },
};

export function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}
