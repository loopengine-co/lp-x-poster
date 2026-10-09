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

export const xReply: ToolDefinition = {
  name: 'x_reply',
  description: 'Reply to an existing X (Twitter) post — publicly visible immediately, under this account\'s own name, correctly threaded under tweet_id (unlike x_create_post, which always starts a new, unthreaded post). Keep text to 280 characters or fewer.',
  input_schema: {
    type: 'object',
    properties: {
      tweet_id: {
        type: 'string',
        description: 'The numeric id of the post to reply to — the digits at the end of its x.com/.../status/<id> URL.',
      },
      text: {
        type: 'string',
        description: 'The exact reply text, 280 characters or fewer.',
      },
    },
    required: ['tweet_id', 'text'],
  },
  execute: async (input, ctx) => {
    const env = ctx.env
    const tweetId = String(input.tweet_id ?? '')
    const text = String(input.text ?? '')
    if (!tweetId) throw new Error('x_reply: tweet_id is required')
    if (!text) throw new Error('x_reply: text is required')

    const client = buildClient(env, 'x_reply')
    try {
      const result = await client.v2.reply(text, tweetId)
      return JSON.stringify({ id: result.data.id, text: result.data.text, in_reply_to: tweetId })
    } catch (err) {
      throw formatXError(err, 'x_reply')
    }
  },
  // Publicly posts content under this account's own name — not
  // something to auto-allow by default; see actauth/rules.yml's own
  // comment for the full reasoning.
  safe: false,
}
