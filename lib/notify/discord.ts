import { logger } from '@/lib/logger'
import type { NotifyPayload } from './bark'
import { clean } from './text'

// Discord embed limits.
const MAX_TITLE = 256
const MAX_DESCRIPTION = 4096
const TIMEOUT_MS = 5000

/**
 * Post a new-proposal message to the #proposals channel webhook
 * (DISCORD_PROPOSALS_WEBHOOK_URL). Unset webhook skips the post. Agent text is
 * untrusted, so mentions are disabled and the text is cleaned and capped.
 * Resolves once the POST has finished or failed; never throws.
 */
export async function sendProposalToDiscord(
  payload: NotifyPayload,
  opts: { webhookUrl?: string; fetch?: typeof fetch } = {}
): Promise<void> {
  const webhookUrl = opts.webhookUrl ?? process.env.DISCORD_PROPOSALS_WEBHOOK_URL
  if (!webhookUrl) {
    logger.debug({ proposalId: payload.proposalId }, 'DISCORD_PROPOSALS_WEBHOOK_URL not set, skipping')
    return
  }
  const doFetch = opts.fetch ?? fetch

  try {
    const res = await doFetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: clean(payload.title, MAX_TITLE),
            description: clean(payload.body, MAX_DESCRIPTION, { keepNewlines: true }),
            url: payload.url,
          },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      logger.warn({ proposalId: payload.proposalId, status: res.status }, 'Discord proposal notification rejected')
      return
    }
    logger.debug({ proposalId: payload.proposalId }, 'Discord proposal notification sent')
  } catch (error) {
    logger.warn({ error, proposalId: payload.proposalId }, 'Discord proposal notification failed')
  }
}
