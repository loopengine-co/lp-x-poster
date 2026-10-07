# lp-x-poster

A [loopengine](https://github.com/loopengine-co/loopengine) ability:
`x_search`/`x_get_post`/`x_create_post`/`x_reply`/`x_like`/`x_repost`
tools for X (Twitter), plus a skill on using them together — search for
something worth engaging with, read it, decide whether there's
something genuinely useful to add, draft, and act, the same judgment
calls a real person running the account would make.

## What's in it

- **Tool** — `x_search(query, max_results?)`. Recent search (last 7
  days only) — `query` uses X's own search operator syntax
  (`-is:retweet`, `lang:en`, `from:...`, etc.). Returns each match's
  `id`, `text`, `author_id`, `created_at`, `public_metrics`
  (like/retweet/reply/quote counts).
- **Tool** — `x_get_post(tweet_id)`. One post's full detail by id.
- **Tool** — `x_create_post(text)`. Posts a new, standalone post —
  public immediately, under this account's own name. 280 characters or
  fewer.
- **Tool** — `x_reply(tweet_id, text)`. Replies to an existing post,
  correctly threaded — the tool to use instead of `x_create_post` for
  anything that's actually a response to something.
- **Tool** — `x_like(tweet_id)` / **Tool** — `x_repost(tweet_id)`. Plain
  like / plain repost (no quote-post support).
- **Skill** — `x-posting`: the real workflow (search → read → judge →
  draft → post), what "ask human approval" actually resolves to for
  `x_create_post`/`x_reply` (a live synchronous approval, or — if this
  routine is driven by
  [lp-task-scheduler](https://github.com/loopengine-co/lp-task-scheduler)'s
  own recurring trigger — a real durable approval, *if* this agent has
  its own `httpNotifier` configured; an auto-deny every single time
  otherwise), and why engaging with every candidate found isn't the
  goal.
- **actauth rules** — `x_search`/`x_get_post`/`x_like`/`x_repost`:
  `decision: allow` (no new content attributed to this account's own
  voice). `x_create_post`/`x_reply`: `decision: ask` — the one real
  gate this ability has, since both put this account's own words into a
  public, permanent, attributed post.

## Auth

Needs an X Developer App ([developer.x.com](https://developer.x.com))
with **Read and Write** permissions (an app left at the default
Read-only can search/read fine, but every posting/engagement tool here
fails) and OAuth 1.0a user-context credentials — a classic 4-token bot
account setup, doesn't expire, no refresh-token rotation to manage:

- `X_API_KEY` / `X_API_SECRET` — the app's own Consumer API Key/Secret,
  from its "Keys and tokens" page.
- `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET` — generated under that same
  page, scoped to the specific account that should post/like/repost.
  **Generate these *after* setting the app's permissions to Read and
  Write** — regenerating permissions after the fact means regenerating
  these tokens too, they don't retroactively pick up a new permission
  level.

X's own API access tier (independent of this ability, controlled
entirely by your X Developer account's own plan) bounds how much
`x_search` can actually return and how far back it searches — recent
search covers the last 7 days regardless of tier; tier mostly affects
rate limits and monthly post caps. A rate-limited call surfaces a clear
`X rate limit hit — resets at <time>` error rather than a bare HTTP 429.

## Install

```
npx loopengine add-ability lp-x-poster --agent <your-agent>
```

Then:

1. Set `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`,
   `X_ACCESS_TOKEN_SECRET` (see "Auth" above).
2. `npm install twitter-api-v2` in your own project. Installing an
   ability copies its files in, it doesn't manage your project's own
   `package.json` — see loopengine's own `ABILITIES.md` on why abilities
   are copied rather than imported.

## Upgrading

```
npx loopengine upgrade-ability lp-x-poster --agent <your-agent>
```

See loopengine's own `ABILITIES.md` for how abilities, installs, and
upgrades work in general — and remember that upgrading only rewrites
files on disk; the server process itself needs restarting afterward to
actually run the new code.
