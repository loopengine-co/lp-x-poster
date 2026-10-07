---
name: x-posting
description: How to search X for something worth engaging with, read and judge it, draft a reply/post, and what actually happens at the "ask human approval" step — including when this whole routine runs on a schedule with nobody live to ask.
---

# X (Twitter) posting

Six tools: `x_search`, `x_get_post` (read), `x_create_post`, `x_reply`
(post), `x_like`, `x_repost` (engage). A typical real workflow — "every
morning, check X for AI agent discussions and weigh in if there's
something worth saying" — chains several of these together with real
judgment in between, not just one tool call:

1. `x_search` for the topic — a real query, not just the bare topic
   name: `"AI agents" -is:retweet lang:en` excludes retweets (nothing
   original to respond to there) and non-English results, for example.
   Broaden or narrow the query based on what actually comes back, the
   same way a person refining a search would.
2. Skim the results' own `text`/`public_metrics` — not every match is
   worth following up on. A post with real engagement and a genuine
   question or claim worth responding to is a better candidate than one
   with zero replies that nobody's actually reading.
3. `x_get_post` on anything promising, to read it in full context before
   deciding — `x_search`'s own result is enough to judge *candidates*,
   not enough to actually judge whether a reply would be worth sending.
4. **Decide whether there's genuinely something useful to add** — this
   is real judgment, not a formality. Passing on most candidates is the
   normal, correct outcome; reach for a response only when there's a
   real question to answer, a real correction to make, or a real
   perspective the thread doesn't already have. A reply that just
   agrees or restates what's already been said isn't worth posting.
5. Draft the actual reply text if step 4 says yes — written as this
   account's own voice, not a generic "AI agent here" disclaimer-first
   reply; match the tone of a genuine participant in the conversation.
6. Call `x_reply(tweet_id, text)` (or `x_create_post(text)` for a
   standalone post, not a reply to anything specific).

## What "ask human approval" actually means here

Steps 5-6 aren't separated by anything this skill has to implement
itself — `x_create_post`/`x_reply` are both `decision: ask` in this
ability's own actauth rules by default (`x_search`/`x_get_post`/`x_like`/
`x_repost` are `allow`). Calling either one already *is* asking for
approval — present the drafted text plainly when making the call so
whoever's approving it can actually judge it (don't just say "I'll
reply to this post," show the exact words that are about to go out
publicly under this account's name).

What "asking" resolves to depends on how this whole routine is being
run:

- **A live conversation** — a normal synchronous approval, answered
  right there, same as any other `ask`-gated tool call.
- **Driven by `lp-task-scheduler`'s own "every morning" trigger** — no
  human is live in that conversation at all. Whether this still pauses
  for a real human decision depends entirely on whether *this agent*
  has its own `httpNotifier` configured (a webhook, Slack, ...):
  configured, and the draft genuinely waits — possibly hours, until
  someone reviews it — for a real approve/deny; not configured, and the
  draft gets auto-denied immediately, every single morning, with
  nothing ever actually posted. If a scheduled "search and maybe post"
  routine seems to never post anything, that's the first thing to
  check — not a bug in this ability, a missing `httpNotifier` on the
  agent being scheduled.

## Judgment, not volume

Don't treat "found candidates" as "must engage with all of them" — one
well-judged reply a day beats five generic ones. Report back what was
found and what was (or wasn't) done with it plainly: which candidates
came up, which one (if any) got a response and why, and which were
passed on and why — "searched, found nothing worth replying to today"
is a complete, useful answer, not a failure to report.

## Likes and reposts carry less weight, but still carry some

`x_like`/`x_repost` are `allow` by default since neither puts this
account's own words into anyone's timeline — but a repost still
visibly endorses whatever it's reposting to this account's own
followers. Use the same "is this actually worth it" judgment before
reaching for either, not as a lower-stakes default action to take on
every candidate found.
