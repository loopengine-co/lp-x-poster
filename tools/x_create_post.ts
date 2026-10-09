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

export const xCreatePost: ToolDefinition = {
  name: 'x_create_post',
  description: 'Post a new, standalone post to X (Twitter) from this account — publicly visible immediately, under this account\'s own name, not a draft or preview. Not for replying to an existing post (use x_reply instead, which correctly threads it). Keep text to 280 characters or fewer — X rejects anything longer for a standard post from most accounts.',
  input_schema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The exact text to post, 280 characters or fewer.',
      },
    },
    required: ['text'],
  },
  execute: async (input, ctx) => {
    const env = ctx.env
    const text = String(input.text ?? '')
    if (!text) throw new Error('x_create_post: text is required')

    const client = buildClient(env, 'x_create_post')
    try {
      const result = await client.v2.tweet(text)
      return JSON.stringify({ id: result.data.id, text: result.data.text })
    } catch (err) {
      throw formatXError(err, 'x_create_post')
    }
  },
  // Publicly posts content under this account's own name — not
  // something to auto-allow by default; see actauth/rules.yml's own
  // comment for the full reasoning.
  safe: false,
}
