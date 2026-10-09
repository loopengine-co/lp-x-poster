import { ApiResponseError, TwitterApi } from 'twitter-api-v2'
import type { AgentEnv, ToolDefinition } from 'loopengine'

// See x_search.ts's own comment on why this is duplicated, not shared,
// across every tool file in this ability.
function buildClient(env: AgentEnv, action: string): TwitterApi {
  const appKey = env.get('X_API_KEY')
  const appSecret = env.get('X_API_SECRET')
  const accessToken = env.get('X_ACCESS_TOKEN')
  const accessSecret = env.get('X_ACCESS_TOKEN_SECRET')
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

export const xLike: ToolDefinition = {
  name: 'x_like',
  description: 'Like a post on X (Twitter) from this account — visible to others as an engagement, but doesn\'t put any of this account\'s own words into anyone\'s timeline the way x_create_post/x_reply do.',
  input_schema: {
    type: 'object',
    properties: {
      tweet_id: {
        type: 'string',
        description: 'The numeric id of the post to like — the digits at the end of its x.com/.../status/<id> URL.',
      },
    },
    required: ['tweet_id'],
  },
  execute: async (input, ctx) => {
    const env = ctx.env
    const tweetId = String(input.tweet_id ?? '')
    if (!tweetId) throw new Error('x_like: tweet_id is required')

    const client = buildClient(env, 'x_like')
    try {
      // like() needs the authenticated account's own numeric user id,
      // not just the target tweet's — X's v2 API addresses "who is
      // doing the liking" and "what's being liked" as two separate ids
      // in the URL path itself, unlike x_reply/x_create_post, which only
      // ever need the target.
      const me = await client.v2.me()
      const result = await client.v2.like(me.data.id, tweetId)
      return JSON.stringify({ tweet_id: tweetId, liked: result.data.liked })
    } catch (err) {
      throw formatXError(err, 'x_like')
    }
  },
  // Doesn't attribute any new content to this account's own voice —
  // see actauth/rules.yml's own comment for why this gets a lighter
  // default than x_create_post/x_reply.
  safe: true,
}
