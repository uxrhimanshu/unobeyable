# unobeyable

**A redesign of browser security warnings, built from a research finding: most
click-throughs happen because the warning has no answer anyone can give.**

**→ [Read the case study](https://uxrhimanshu.github.io/unobeyable/)** ·
[prototypes](https://uxrhimanshu.github.io/unobeyable/prototypes/) ·
[component](https://uxrhimanshu.github.io/unobeyable/component/) ·
[test harness](https://uxrhimanshu.github.io/unobeyable/harness/)

---

## In thirty seconds

My study [clicked-through](https://github.com/uxrhimanshu/clicked-through) coded 76
items from Hacker News threads about security warnings. It found that competent people
mostly aren't weighing risk when they click through. They are meeting a warning that
cannot be obeyed: a browser calling a printer on their own network an attack, with no
certificate that printer could ever get. They click through every day, learn the
warning means nothing, and the one time it means something it looks the same.

This repository is the design response. It covers the full loop in one place:

1. **Principles from evidence.** Seven principles, each citing coded items, checked by
   a script so none can outgrow its evidence. ([PRINCIPLES.md](PRINCIPLES.md))
2. **Five situations, told apart.** The browser already knows whether an address is
   private, whether it has been here before, whether the certificate changed and who
   issued it. The redesign uses that to give each situation its own warning, quieter
   where the old one was wrong and stricter where a change could be an attack.
   ([prototypes](https://uxrhimanshu.github.io/unobeyable/prototypes/))
3. **A component built to ship.** `<trust-warning>`, accessible to WCAG 2.2 AA, with
   no dependencies and no network requests, and its decision logic in one pure,
   tested function. ([component docs](https://uxrhimanshu.github.io/unobeyable/component/))
4. **The decisions, including the rejected ones.** ([DECISIONS.md](DECISIONS.md))
5. **A study to test it**, designed and instrumented, and not yet run.
   ([STUDY-PLAN.md](STUDY-PLAN.md))

## The one idea

Today's warning spends the same full-page stop on every situation. The redesign
spends attention where it carries information:

| Situation | Today | Redesign |
|---|---|---|
| First visit to a printer on your network | Stop | A decision, with the fingerprint check that actually exists |
| Every visit after trusting it | Stop | No interrupt; "Trusted by you on 3 March" in the address bar |
| A trusted device's certificate changes | Stop, proceed under Advanced | Stop, no proceed; continuing needs characters printed on the device |
| A school network inspecting traffic | Stop | Names the inspection product and who runs it |
| Clicking a link to an unfamiliar site | Interstitial | Nothing. Clicking is ordinary work |
| Typing a password on that site | Nothing | The warning goes here, where the harm is |

## Why you can check this

| | |
|---|---|
| [`principles.json`](principles.json) | principle → code → item → verbatim quote |
| [`check_trace.py`](check_trace.py) | every item exists, carries the code claimed, contains the quote |
| [`component/classify.js`](component/classify.js) | the whole design as one function; each branch names its principle |
| [`component/copy.js`](component/copy.js) | every word the warnings say, and the rules it's held to |
| [`vendor/`](vendor/) | clicked-through's coded items, pinned to a commit |

```sh
python3 check_trace.py   # principles rest on real, correctly coded evidence
node --test              # classifier, view states, copy rules, harness logic
```

## Honest limits

- **Not evaluated.** The harness is built and no participant has used it. Nothing
  here shows the redesign works; it is a design argued from evidence.
- **One community.** The evidence is from a technical, English-speaking forum. No
  claim is made about non-technical users.
- **The strongest move has the thinnest evidence.** The changed-certificate case is
  argued for in the corpus but never observed. The three items coded
  `designing-against-click-through` are one post that appears three times, and are
  cited once.
- **Public sites are left alone.** A public site with an invalid certificate keeps
  today's full warning. The redesign weakens nothing where an attack is the likeliest
  explanation.

## Built with

Built with Claude Code, working from the clicked-through evidence. That is one more reason every principle is traced to coded items by `check_trace.py`: the argument can be checked without trusting whoever typed it.

No framework, no build step, no dependencies. HTML, CSS and JavaScript modules, served
as static files from GitHub Pages. Tests use Node's built-in runner.

Design tokens follow the system on [uxrhimanshu.com](https://uxrhimanshu.com): sans
for navigation, serif for argument, mono for labels.

## See also

- [clicked-through](https://github.com/uxrhimanshu/clicked-through), the study this answers
- [the-human-element](https://the-human-element.netlify.app), 10,042 security incidents and where interfaces set people up to fail
- [fieldnotes](https://github.com/uxrhimanshu/fieldnotes) and [research-deid](https://github.com/uxrhimanshu/research-deid), the tools the study was built with

MIT licensed.
