# Decisions

Design decisions in the order they were made, including the directions that were
rejected. Each entry says what the evidence was. Where the evidence is thin, it says
that too.

---

### D1 · One warning per situation, not one warning with an Advanced section

**Decided:** each situation gets its own title, explanation and actions.

**Rejected:** keeping one warning and putting situation-specific help behind
"Advanced". An Advanced disclosure keeps the headline's single meaning (someone may
be attacking you) and asks people to discover that it doesn't apply. The whole
finding is that the headline is wrong for most of the situations people meet it in
(P2).

### D2 · Don't add friction to the proceed path

**Rejected:** hiding the proceed link deeper, adding a countdown, or requiring a
typed phrase to continue past a first-visit local device. This is the most common
response to click-through, and the corpus is a record of what it produces: when the
compliant path is unavailable, friction doesn't stop people, it pushes them to
structural workarounds that are worse. The supplier that shipped one certificate and
private key to thousands of machines did it to get rid of the red X (item 36508087,
`removing-the-warning-is-the-goal`). Eight items are coded
`workaround-becomes-standard`.

**Decided instead:** make the reasonable path explicit and cheap (compare the
fingerprint, trust this device), and spend friction only where it carries information
(D4).

### D3 · Remember the decision per host and per certificate, not per host

**Decided:** "Trust this device" stores the host *and* the certificate fingerprint.
The same host with a different certificate is a new situation.

**Why:** trust scoped to a host alone would quietly accept a swapped certificate,
which is the one thing trust-on-first-use exists to catch (P6). Scoping to the exact
certificate is what makes silence on later visits safe rather than merely quiet.

### D4 · The changed-certificate case is louder than today

**Decided:** severity `stop`, primary action "Go back", no proceed on the first
screen. The only way forward is "I changed this device", which opens a second screen
asking for the last four characters of the fingerprint shown on the device itself.

**Why:** this is where the redesign spends the attention it saved elsewhere. A typed
check is friction, which D2 rejects, but here it carries information: it asks for
something only a person with physical access to the device can see. It is a check,
not a speed bump.

**Weak point:** the evidence for this case is the argument in item 36508087 and the
TOFU description in 41436340. The three items coded `designing-against-click-through`
are one post that appears three times in the corpus, so they are cited once, as one
voice. No item describes someone actually meeting a changed certificate and what they
did. The evaluation has to test this case directly.

### D5 · Quiet on a same-key renewal; stopped on a new-key one

**Decided:** if a trusted host presents a new certificate for the same public key,
the trust carries over with a notice. If the key also changed, it is treated as a
change after trust (D4).

**Why:** an attacker in the middle does not hold the device's private key, so a
same-key renewal is not the change an attacker can make. This removes the six-monthly
false alarm item 41436340 describes, wherever the server keeps its key.

**The honest cost:** servers that generate a new key at each renewal will still stop
people every six months, and the browser cannot tell that from an attack. Rather than
quieten a case it can't distinguish, the redesign routes it: the report to the
server's owner carries a note that the certificate has changed repeatedly and that
each change looks like an attack (P5). The fix belongs to the person who can make the
certificate longer-lived.

### D6 · Never call anything "secure"

**Decided:** the words used are "verified", "not verified", and "trusted by you".
A remembered device shows "Trusted by you on 3 March 2026", never a plain padlock.

**Why:** P4. Showing a device someone trusted by hand the same way as a verified
public site would make the goal of the whole exercise the removal of the indicator,
which is the behaviour the study found and criticised.

### D7 · Name the inspection product, and don't offer to trust it

**Decided:** when the issuer is a known inspection product, say so by name and say
that networks do this deliberately. Offer "Go back", "Ask the network admin" and
"Continue to the network's page". Never "Trust this certificate".

**Why:** the student in item 41480034 couldn't tell whether they were being attacked.
Replies had to explain it: the firewall was performing an organisationally sanctioned
interception (41482609), and installing its certificate would let it read everything
(41482312). The warning is correct; what's missing is the explanation. Offering to
trust an interception certificate from a warning screen would be the worst possible
outcome, so it isn't an action.

**Dependency:** needs a maintained list of inspection-product issuers. Out of scope to
build; flagged in the brief.

### D8 · Phishing: warn at the password, not at the click

**Decided:** opening a link produces no warning. Focusing a password field on a
domain that neither the person nor their organisation has signed in to before produces
one, with "Leave without signing in" as the primary action.

**Rejected:** a click-time interstitial for unfamiliar domains, which is what most
phishing controls do. The corpus is direct that this trains the wrong thing: people
clicked to investigate and were recorded as failing (45532990), and employers route
legitimate work through unfamiliar domains daily (45532736). Item 45534624 describes a
click-time first-seen popup that the poster says worked; it is kept in the evidence
for P5 because the part that worked was IT reviewing and listing domains, which this
design keeps as "your organisation has listed this site".

### D9 · Every report is addressed and prefilled

**Decided:** the report action always names who it goes to (the device owner, the
network admin, the IT team) and shows the technical details it will send, for review,
before sending.

**Why:** P5. The friction the corpus describes is organisational: tickets closed
weeks later for a wrong field (36506755), certificates only by ticket and days of
waiting (36506195). A warning can't fix a process, but it can make the report the
process needs cost one click instead of a ticket written from memory.

### D10 · Code is the design medium

**Decided:** the prototypes are built in HTML, CSS and JavaScript rather than drawn.

**Why:** most of this design is behaviour across visits (what happens the second
time, what happens after a change), and a static frame can't show it. Building it also
forced the logic into one testable function, `classify()`, where every branch names
the principle it implements. The tests are the specification.
