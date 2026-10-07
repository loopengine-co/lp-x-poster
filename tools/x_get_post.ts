import { ApiResponseError, TwitterApi } from 'twitter-api-v2'
import type { ToolDefinition } from 'loopengine'

// See x_search.ts's own comment on why this is duplicated, not shared,
// across every tool file in this ability.
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

export const xGetPost: ToolDefinition = {
  name: 'x_get_post',
  description: 'Get one X (Twitter) post by its id — text, author_id, created_at, and public_metrics (like/retweet/reply/quote counts). Use this to read the full content/engagement of a post found via x_search, or one an operator referenced by id/URL, before deciding whether to reply/like/repost it.',
  input_schema: {
    type: 'object',
    properties: {
      tweet_id: {
        type: 'string',
        description: 'The numeric id of the post — the digits at the end of its x.com/.../status/<id> URL.',
      },
    },
    required: ['tweet_id'],
  },
  execute: async (input) => {
    const tweetId = String(input.tweet_id ?? '')
    if (!tweetId) throw new Error('x_get_post: tweet_id is required')

    const client = buildClient('x_get_post')
    try {
      const result = await client.v2.singleTweet(tweetId, {
        'tweet.fields': 'created_at,public_metrics,author_id',
      })
      return JSON.stringify({
        id: result.data.id,
        text: result.data.text,
        author_id: result.data.author_id,
        created_at: result.data.created_at,
        public_metrics: result.data.public_metrics,
      })
    } catch (err) {
      throw formatXError(err, 'x_get_post')
    }
  },
  // Read-only — never writes anything, safe to run alongside anything else.
  safe: true,
}
