import { ApiResponseError, TwitterApi } from 'twitter-api-v2'
import type { ToolDefinition } from 'loopengine'

// Credential/error-handling helpers are duplicated verbatim across
// every tool file in this ability — add-ability copies each tool file
// standalone, flattened, with no shared-module support, so this is the
// actual contract between them, not a shared function.
function buildClient(action: string): TwitterApi {
  const appKey = process.env.X_API_KEY
  const appSecret = process.env.X_API_SECRET
  const accessToken = process.env.X_ACCESS_TOKEN
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error(`${action}: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET must all be set`)
  }
  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret })
}

// twitter-api-v2's own ApiResponseError carries a real rateLimitError
// getter and a numeric reset timestamp — surfaced explicitly rather
// than letting a bare "HTTP 429" reach the operator with no indication
// of when retrying might actually work, given how tight X's own API
// rate limits are at every tier below Enterprise.
function formatXError(err: unknown, action: string): Error {
  if (err instanceof ApiResponseError) {
    if (err.rateLimitError) {
      const resetAt = err.rateLimit ? new Date(err.rateLimit.reset * 1000).toISOString() : 'unknown'
      return new Error(`${action}: X rate limit hit — resets at ${resetAt}`)
    }
    return new Error(`${action}: X API error ${err.code} — ${JSON.stringify(err.data)}`)
  }
  return err instanceof Error ? err : new Error(String(err))
}

export const xSearch: ToolDefinition = {
  name: 'x_search',
  description:
    'Search X (Twitter) for recent posts matching a query — the last 7 days only (the v2 "recent search" endpoint; X\'s own API access tier controls how far back and how much this can actually return, independent of anything this tool controls). query uses X\'s own search operator syntax (e.g. "AI agents -is:retweet lang:en" to exclude retweets and require English) — see X\'s own search operator documentation for the full set. Returns each matching post\'s id, text, author_id, created_at, and public_metrics (like/retweet/reply/quote counts) — use get_post\'s own id for anything found here that\'s worth following up on.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'X\'s own search query syntax — operators like from:, -is:retweet, lang:, etc. are supported the same way they are in X\'s own search box.',
      },
      max_results: {
        type: 'number',
        description: 'How many results to return, 10-100. Defaults to 10 if unset.',
      },
    },
    required: ['query'],
  },
  execute: async (input) => {
    const query = String(input.query ?? '')
    if (!query) throw new Error('x_search: query is required')
    const maxResults = typeof input.max_results === 'number' ? input.max_results : 10

    const client = buildClient('x_search')
    try {
      const result = await client.v2.search(query, {
        max_results: maxResults,
        'tweet.fields': 'created_at,public_metrics,author_id',
      })
      return JSON.stringify(
        result.tweets.map((t) => ({
          id: t.id,
          text: t.text,
          author_id: t.author_id,
          created_at: t.created_at,
          public_metrics: t.public_metrics,
        })),
      )
    } catch (err) {
      throw formatXError(err, 'x_search')
    }
  },
  // Read-only — never writes anything, safe to run alongside anything else.
  safe: true,
}
