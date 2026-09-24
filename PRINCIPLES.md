# Principles

Seven principles, each resting on items coded in [clicked-through](https://github.com/uxrhimanshu/clicked-through). Every quote below is checked against the vendored corpus by `python3 check_trace.py`: the item exists, it carries the code shown, and the words appear in it verbatim.

This file is generated from `principles.json` by `build_principles.py`. Edit the JSON, not this file.

## P1 · Name the compliant path, or say there isn't one

Today's warning implies that something is wrong and that someone could fix it. For a device on a private network there is usually no certificate the browser would accept, so the warning asks for a correction nobody can make. The redesign says so, and offers the best check that does exist.

> it can't serve HTTPS because it isn't on the open internet to reach Let's Encrypt

[item 26584730](https://news.ycombinator.com/item?id=26584730) · `warning-cannot-be-satisfied`

> a self-signed SSL certificate has to be used; you’ll need to click through the warnings from the browser

[item 37321957](https://news.ycombinator.com/item?id=37321957) · `warning-cannot-be-satisfied`

> you're going to see certificate warning messages

[item 36512276](https://news.ycombinator.com/item?id=36512276) · `trust-store-unmaintainable`

## P2 · Say what situation this is, using what the browser already knows

The browser knows whether an address is on a private network, whether it has seen this host before, and who issued the certificate. Today it discards all of that and shows one message meaning 'you may be under attack'. A printer on the office LAN, a school firewall and an actual interception are three different situations, and each gets its own explanation.

> gets treated as a sign of evil intent by all browsers

[item 26584730](https://news.ycombinator.com/item?id=26584730) · `warning-cannot-be-satisfied`

> Is this some kind of MITM-Attack on me

[item 41480034](https://news.ycombinator.com/item?id=41480034) · `sanctioned-mitm`

> The Fortigate conducts an organizationally sanctioned MITM attack on your web browsing

[item 41482609](https://news.ycombinator.com/item?id=41482609) · `sanctioned-mitm`

## P3 · Treat frequency as a design parameter

A warning that fires every time for a situation that never changes teaches people to dismiss it. Once someone has made a considered decision about one device, that decision is remembered for that device and that certificate only, and the interrupt stops.

> your users will inevitably learn to ignore certificate errors

[item 36507168](https://news.ycombinator.com/item?id=36507168) · `habituation-by-design`

> users eventually learn to just ignore these warnings

[item 41436340](https://news.ycombinator.com/item?id=41436340) · `habituation-by-design`

> nobody reads them because they probably already know

[item 45533836](https://news.ycombinator.com/item?id=45533836) · `habituation-by-design`

## P4 · Dismissal is not resolution

When the only signal of success is that the red mark goes away, people optimise for the red mark, sometimes by doing something worse. After a decision the redesign keeps a quiet, persistent state in the address bar that says what was decided and when, so the site is never shown as simply 'secure'.

> But it gets rid of the red X in a browser so tick

[item 36508087](https://news.ycombinator.com/item?id=36508087) · `removing-the-warning-is-the-goal`

> that's way more hassle than just making everything public and buying a domain

[item 33107611](https://news.ycombinator.com/item?id=33107611) · `workaround-becomes-standard`

## P5 · Route the problem to whoever can fix it

The person reading the warning usually cannot fix the certificate. Someone else can: the device's owner, the network admin, the IT team. Every redesigned warning offers a report addressed to that person, with the technical details already filled in, so the cost of doing the right thing is one click rather than a ticket written from memory.

> self-signed certs were the only option if we wanted to automate

[item 36506195](https://news.ycombinator.com/item?id=36506195) · `org-friction-as-cause`

> Any slight deviation and your ticket is closed weeks after you opened it

[item 36506755](https://news.ycombinator.com/item?id=36506755) · `org-friction-as-cause`

> the it department will dive deep to whitelist it

[item 45534624](https://news.ycombinator.com/item?id=45534624) · `org-friction-as-cause`

## P6 · Save loudness for change

A certificate that someone has already accepted can only be swapped by an attacker if the swap is noticed and ignored. So the moment that deserves the full interrupt is not the first visit to a known device but a change after trust. That is the one case where the redesign is louder than today, and it has no proceed button on its first screen.

> if someone has accepted and cached the self-signed cert you can't MITM them without throwing an error

[item 36508087](https://news.ycombinator.com/item?id=36508087) · `removing-the-warning-is-the-goal`

> trust-on-first-use (TOFU) model

[item 41436340](https://news.ycombinator.com/item?id=41436340) · `habituation-by-design`

> in a manor the person using the client can not accidentally ignore it

[item 49049796](https://news.ycombinator.com/item?id=49049796) · `designing-against-click-through`

## P7 · Warn at the moment of harm, not at a proxy for it

Phishing controls punish the click, but the click is ordinary work and the harm is typing a password into the wrong site. The redesign stays silent when a link is opened and speaks up when a password field is used on a domain the person and their organisation have never signed in to.

> I would think clicking a link is fine, but entering credentials is not

[item 45530891](https://news.ycombinator.com/item?id=45530891) · `control-teaches-opposite`

> they phish their employees 100 times a day

[item 45532736](https://news.ycombinator.com/item?id=45532736) · `control-teaches-opposite`

> I figured I would click the link to investigate further

[item 45532990](https://news.ycombinator.com/item?id=45532990) · `control-as-liability-transfer`
