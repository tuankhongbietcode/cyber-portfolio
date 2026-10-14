---
title: Authorised web application assessment — authentication bypass, privilege escalation and reflected XSS
platform: VNPRO internship — authorised internal assessment
category: Web application
difficulty: Critical / High / Medium
date: 2026-03-23
tags: [sqli, access-control, xss, php, burp-suite, remediation]
status: published
flag: REDACTED
---

# Authorised web application assessment — a legacy PHP CMS admin panel

## In one line

Three vulnerabilities in one admin panel that all came down to the same thing: the
application trusted what the user typed, and nothing behind that trust.

## Starting position

I was interning in a **network** role, not security. An external bug hunter had
reported two serious flaws in the admin area of an internally maintained CMS
running in production, and the company needed someone to reproduce them, work out
the root cause and fix them.

I asked my mentor whether I could take it on. He told me to get permission from the
company first. I did, and the company approved — so the assessment was authorised
before I touched anything.

**What I was given:** the external report, describing a login bypass and an
authorisation bypass, with a working payload for the first.

**What I was not given:** any explanation of why either worked, whether the report
was complete, or what else might be in there. That gap is where the actual work was.

**Deliberately out of scope for this write-up:** hostnames, IP addresses, endpoints,
target-specific payloads, source file paths and session values. The engagement was
authorised; publishing the map is still not mine to do.

## How I got there

### Reproducing, not copying

The report gave me a `UNION SELECT` payload that worked. Using it and moving on
would have taught me nothing, so I walked the whole path myself.

I confirmed the injection point by sending special characters into the username
field and watching the server return a raw SQL syntax error. That error is the
proof: the input reached the query unescaped, and the application was happy to tell
the world about it.

Then I needed the column count. Incremental `ORDER BY` until the server complained
gave me **17 columns**. With that, `UNION SELECT` let me substitute my own values
into the result set, which produced a valid session and put me in the dashboard
without a password.

### The thing the report did not say

The long `UNION SELECT` payload was never necessary. A much smaller payload — just
`ORDER BY` — was enough, because all it has to do is comment the password check out
of the statement. The query still returns a row, and the row is accepted.

That distinction matters and I wrote it down: `ORDER BY` **removes the password
condition**; `UNION SELECT` **controls the data that comes back**, which is what you
need to forge a role or read another table. Different goals, different tools.

The conclusion I drew from it is the one I would repeat in an interview: if a login
falls to a payload that does nothing but delete the password check, the flaw is not
clever — it is the most basic layer of authentication, with nothing behind it.

### Then the second one, from a low-privileged session

Inside the dashboard the session was low-privileged. A privileged function returned
403 on `GET` — correct behaviour. Sending the same parameters in the body of a
`POST` to the same endpoint returned the full order and member listings.

The check was attached to the **HTTP method**, not to the session. The reason was
`$_REQUEST` in PHP, which merges `GET`, `POST` and cookie data into one superglobal,
so an authorisation check written against `GET` evaporates the moment the method
changes.

### The third one, which nobody had reported

After logging in with the injected payload, the dashboard greeted me with
`Hello [my payload, verbatim]` instead of a username.

That is not a display quirk — it means the page was printing `$_POST['username']`
rather than reading the name out of the database result. And because nothing encoded
it, a `<script>` tag in that field would execute in the victim's browser. A logic
mistake in how the page got its data had turned into a complete reflected XSS vector.

This was the find I am most satisfied with, because it came from noticing something
that looked wrong rather than from following a checklist.

### Fixing it

I made the changes myself and deployed them to production:

- sanitised the username input;
- **removed legacy default-password logic** that was still sitting in the
  authentication path — nobody had noticed it was there;
- added an explicit role check;
- pinned the parameter source for navigation so authorisation no longer depended on
  the request method, and cast Ajax values to their expected types;
- encoded output with `htmlspecialchars()`;
- added an `.htaccess` layer restricting permitted HTTP methods and suppressing
  technical error output.

Then I **re-tested after deploying** — 3 of the 4 remediation items closed, and the
remainder documented in the handover rather than quietly dropped.

## The commands that mattered

```bash
# Column count first — you cannot shape a UNION until you know how wide the row is.
# Increment until the server errors; the last value that worked is the count.
' ORDER BY 1-- ... ' ORDER BY 17--     # works; ORDER BY 18 errors -> 17 columns

# The minimal bypass. Not the report's payload — just delete the password check.
' ORDER BY 1-- -
```

```http
# Authorisation enforced on GET only. Same endpoint, same parameters, different verb.
GET  /admin/...?...        -> 403
POST /admin/...  (same params in the body)  -> 200, full data
```

## Result

`flag{REDACTED}` — no flags in this engagement. The outcome was three fixed
vulnerabilities, a re-test that confirmed the fixes, and a written handover.

**What I would emphasise:** the value here was not the exploits. It was that the
assessment was authorised before it started, scoped, and reported honestly —
including the parts that were not fixed.

## What I would do differently

**Push for prepared statements, not sanitisation.** I sanitised input because the
codebase was legacy and rewriting every query risked breaking a 17-column table in
production. It was the pragmatic call and I flagged it as such in the handover, but
parameterised queries are the correct fix and sanitisation is not a substitute. I
should have made that recommendation harder to ignore.

**Write the verification test cases before deploying, not after.** I reconstructed
them afterwards. Next time they come first, so the re-test is a checklist rather
than a memory exercise.

**Set up a staging copy.** Testing against production was only defensible because
the assessment was read-only and low risk. That is a justification, not a habit.

**Ask for the authorisation in writing and keep it.** I had approval, and the
company stood behind the work — but an email in the file is worth more than a
verbal yes, both for me and for the person who approved it.

## References

- OWASP Top 10 — A03:2021 Injection, A01:2021 Broken Access Control. The mapping
  between what I found and the categories is almost one-to-one.
- PortSwigger Web Security Academy — the SQL injection and access control labs are
  the clearest explanations of the underlying mechanics I have found, and free.
- PHP manual, `$_REQUEST` — read it once and the verb tampering finding explains
  itself. The function merges request sources by design; the vulnerability is in
  using it for an authorisation decision.
