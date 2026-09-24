# Study plan

**Status: designed, instrument built, not run.** No participant has used the harness.
Nothing in this repository is evidence that the redesign works. It is a design argued
from evidence, and this file is how the argument would be tested.

## Questions

1. Do people understand which situation they are in? (the comprehension gap P2 targets)
2. Is the changed-certificate warning dismissed less often than today's warning in the
   same situation? (P6)
3. When a situation genuinely needs someone else to act, do people use the report? (P5)
4. Does the redesign make any warning less effective where today's is right? (the
   out-of-scope guarantee in `BRIEF.md`)

## Hypotheses

- **H1.** Comprehension answers in the redesign condition name the correct situation
  more often than in the today condition, for all four tasks.
- **H2.** In the changed-certificate task, fewer participants proceed in the redesign
  condition than in the today condition.
- **H3.** In the printer task, proceed rates are *not* lower in the redesign condition.
  The redesign is meant to make a reasonable decision easy, not to deter it. A lower
  rate here would mean it is working as friction, which `DECISIONS.md` D2 rejects.
- **H4.** Report use is higher in the redesign condition in the inspection and
  changed-certificate tasks.

H3 is the one most likely to be quietly dropped if results come back inconvenient,
so it is written down here first.

## Design

Within-subjects on task, between-subjects on condition per task: each participant
sees all four tasks, each in one condition, counterbalanced so every task appears in
both conditions across each pair of participants. Task order is shuffled per
participant. The harness does this (`harness/runner.js`, `assignConditions`).

Tasks: printer (first visit), trusted device with changed certificate, campus network
inspection, credential on an unfamiliar sign-in page.

## Participants

Target 24, recruited to match the study population in clicked-through: people who
reach devices or internal services on networks they don't manage. Screener asks how
often they see certificate warnings, not whether they understand them. A second round
with non-technical participants is a separate study and should not be merged with
this one.

## Measures

| Measure | Source | Used for |
|---|---|---|
| Decision (back · proceed · trust · report · details opened) | harness log | H2, H3, H4 |
| Time to first decision | harness log | descriptive only; faster is not better |
| "What do you think is happening?" | free text | H1, coded blind to condition |
| Confidence 1 to 5 | harness | descriptive; high confidence with a wrong answer is the finding to look for |

Comprehension answers are coded against a situation codebook (local device ·
changed certificate · network inspection · unfamiliar site · attack · don't know) by
two coders blind to condition. Disagreements are resolved by discussion and reported.

## What this design can't show

- **Habituation.** The central claim (P3) is about repeated exposure over months. A
  single session can't test it. It needs a diary or longitudinal deployment, which
  needs a browser extension, which is a different project.
- **Real stakes.** Participants know nothing bad will happen. Proceed rates in a lab
  task are not proceed rates in the world. The comparison between conditions is the
  useful part, not the absolute numbers.
- **n = 24 is small.** Decisions are binary and per-task cells have 12 participants.
  Report counts and intervals, not significance tests dressed up as findings.

## Running it

Open `harness/index.html` (it runs from GitHub Pages, and needs no server). Data stays
in that browser's storage until exported from `harness/index.html#results` as CSV.
Nothing is sent anywhere, which is also why the harness can be read end to end to
check that claim.
