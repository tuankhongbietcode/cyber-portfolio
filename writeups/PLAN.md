# CTF writeup plan

Goal: five writeups that are real, checkable, and between them cover the ground a
junior security role expects. Not thirty writeups that are all the same
challenge with different names.

## Rules

1. Only publish what I actually solved, on my own.
2. Only publish where the platform allows it — see the table below.
3. Redact flags and any credential.
4. No copying. If I read someone else's approach, I link it and say so.
5. If I cannot explain a step without looking it up, I do not write that step up
   as if I understood it.

## Where writeups are allowed

| Platform | Writeup policy |
|---|---|
| OverTheWire | Allowed. Challenges are permanent; writeups are the norm. |
| PicoCTF | Allowed after the competition closes. The practice gym stays open. |
| TryHackMe | Allowed once you have finished the room. Do not spoil rooms being used in a live competition. |
| PortSwigger Web Security Academy | Allowed. Labs are permanent. |
| CyberDefenders | Allowed. |
| VulnHub | Allowed. |
| Hack The Box | **Retired machines only.** Publishing an active machine gets the account banned. Check the machine page for its status before writing anything. |

## The five, in order

### 1. OverTheWire — Bandit, levels 0 to 13
**Covers:** shell, file permissions, pipes, `find`, `grep`, SSH.
**Why first:** it is the floor everything else stands on, and it is free and
permanent. Every command has one right answer, so the writeup has to explain
*why* rather than *what* — which is exactly the habit the rest of the writeups
need.
**Write it as:** one writeup, not thirteen. Group the levels by the idea each
one teaches.

### 2. TryHackMe — Splunk: The Basics, or Intro to Log Analysis
**Covers:** search processing language, log sources, building a detection query.
**Why second:** it extends the Splunk lab already built, so the writeup can link
straight to the home-lab page and show the two reinforcing each other. This is
the single most on-profile item in the list.

### 3. CyberDefenders — one blue-team challenge (pcap or log analysis)
**Covers:** reading a packet capture or log set end to end, building a timeline,
separating signal from noise.
**Why third:** blue team is where the profile points, and almost no student
portfolio has evidence of it. Most portfolios are all offensive.

### 4. PortSwigger Web Security Academy — SQL injection, apprentice labs
**Covers:** how a web app breaks, and how you prove it did.
**Why fourth:** web is where most real incidents start. The labs are free,
permanent, and run in the browser — no VM required, so there is no excuse not
to finish.

### 5. TryHackMe — OhSINT, or a Windows / Active Directory room
**Covers:** OSINT, or Windows identity and permissions.
**Why fifth:** pick OhSINT if you want a short one that demonstrates
investigative method; pick the Windows room if you want to reinforce the
Microsoft 365 internship story. Either way, write it up.

## Bonus, only if the five are done

- PicoCTF practice gym — any three beginner challenges.
- VulnHub — one easy box, full walkthrough.

## What to do with them once written

1. Each writeup becomes a Markdown file in this folder, named
   `platform-challenge.md`, with the front matter from `_TEMPLATE.md`.
2. On the site they render as expandable case files in the Work section, or as a
   separate `/writeups` section — decide once there are three to look at.
3. Cross-link: the Splunk writeup points at the home-lab case file, the home-lab
   case file points back.
