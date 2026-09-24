# Brief

## Where this comes from

[clicked-through](https://github.com/uxrhimanshu/clicked-through) studied what
technical people do when a security warning has no answer they can give. It set out
to find a risk calculus (people who understand the warning and proceed anyway) and
found mostly something else: warnings that cannot be obeyed.

A browser tells you a certificate cannot be trusted while you are connecting to a
printer on your own network. No compliant answer exists, because the public
certificate path the warning assumes is not available to a device on a private
address. The warning has one meaning available, that someone may be attacking you,
and the situation has another. The interface can't hold both, so people learn that
the warning means nothing, and the one time it does mean something it looks the same.

That study stopped at the finding. This repository is the design response.

## The problem, stated as a design problem

Browser certificate warnings collapse several different situations into one screen
with one meaning. The browser already holds most of the information needed to tell
those situations apart, and discards it. Because the one screen fires constantly in
situations where it is wrong, people are trained to dismiss it, and the training
carries over to the situations where it is right.

## Who this is for

People who reach devices and services on networks they don't control the
certificates for: developers, people running home or small-office equipment, staff
on managed networks, students on campus wifi. The study's population was technical,
and the redesign does not claim to serve non-technical users better. That is a
question for the evaluation (see `STUDY-PLAN.md`).

## In scope

Five situations drawn from the coded items, each with its own warning:

| Scenario | Code it comes from | What changes |
|---|---|---|
| A printer on the office network | `warning-cannot-be-satisfied` | Says what it is, offers the fingerprint check, remembers the decision |
| A trusted device shows a new certificate | `removing-the-warning-is-the-goal` | Gets louder than today, with no proceed on the first screen |
| A school network inspecting traffic | `sanctioned-mitm` | Names who is in the middle and why |
| An internal server that renews its certificate | `habituation-by-design` | Quiet when the key is unchanged, and routes the renewal pattern to whoever can fix it |
| A link to an unfamiliar sign-in page | `control-teaches-opposite` | Silent at the click, speaks up at the password |

## Out of scope

- **Public sites with invalid certificates.** Those keep today's full-strength
  warning. The redesign must not make any warning weaker where an attack is the most
  plausible explanation, and `classify.js` has a branch that exists only to say so.
- **Fixing certificate infrastructure.** Private CAs, ACME for LANs and name
  constraints are real fixes and the corpus discusses all of them. They are not
  interface problems, and a warning that assumed them would be another warning that
  cannot be obeyed.
- **Browser vendor constraints.** This is a design argument, not a patch. Some of it
  (remembering a per-host fingerprint) resembles what SSH and RDP clients already do;
  some of it (knowing an issuer is an inspection product) would need a maintained list.

## What success would look like

Not fewer clicks through. The study's own point is that "the warning went away" is a
bad success measure. Success is that people **understand which situation they are
in**, that the changed-certificate case is **not dismissed**, and that routine cases
**stop firing** once a considered decision has been made. `STUDY-PLAN.md` turns those
into measures.
